'use client';

/**
 * useSessionKey — ephemeral session-key management for Dubhe DApps.
 *
 * A session key is an ephemeral keypair the user authorizes on-chain via
 * `dapp_system::activate_session`. Once active, game actions can be signed
 * silently by the session key while every on-chain identity still resolves
 * to the main wallet (canonical owner).
 *
 * Design notes:
 * - State is scoped per (dappKey, network, owner). Each main account keeps
 *   its own ephemeral keypair, so switching accounts never leaks another
 *   account's session and never reuses an ephemeral key that is a live
 *   delegate for someone else.
 * - The local expiry is only a UI hint. `revalidate()` checks the indexer's
 *   `dubheSessions` table and drops stale local state when the session was
 *   revoked or replaced elsewhere. A short grace window after activation
 *   avoids clearing fresh sessions before the indexer catches up.
 */

import { useState, useEffect, useCallback } from 'react';
import { Ed25519Keypair, getFullnodeUrl, SuiClient, Transaction } from '@0xobelisk/sui-client';
import { get, set, del } from 'idb-keyval';
import { useDubhe } from './hooks';
import type { NetworkType } from './types';

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour default

// After activation, the indexer needs a few seconds to pick up the new
// session row. Within this window an on-chain mismatch (stale row from a
// previous session key) must not clear the freshly activated local state.
const REVALIDATE_GRACE_MS = 60 * 1000;
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionState {
  /** Main wallet (canonical owner) that activated this session */
  owner: string;
  /** Ephemeral wallet address */
  address: string;
  /** When the user activated this session (unix ms) */
  activatedAt: number;
  expiresAt: number; // unix ms
  isActive: boolean;
}

export interface UseSessionKeyOptions {
  /** Override the default session duration passed to buildActivateTx. */
  durationMs?: number;
  /** Override the storage key namespace (defaults to the dappKey). */
  storageNamespace?: string;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const idbSkKey = (ns: string, network: string, owner: string) =>
  `dubhe_session_sk:${ns}:${network}:${owner}`;
const lsInfoKey = (ns: string, network: string, owner: string) =>
  `dubhe_session_info:${ns}:${network}:${owner}`;

async function loadOrCreateKeypair(key: string): Promise<Ed25519Keypair> {
  const stored = await get<string>(key);
  if (stored) {
    try {
      // getSecretKey() returns a Bech32 string ('suiprivkey1q...');
      // fromSecretKey accepts the same format directly.
      return Ed25519Keypair.fromSecretKey(stored);
    } catch {
      // corrupted entry — fall through to regenerate
    }
  }
  const kp = new Ed25519Keypair();
  // Store the Bech32 string as-is; do NOT re-encode (base64/hex would break it).
  await set(key, kp.getSecretKey());
  return kp;
}

function loadSessionInfo(key: string, owner: string): SessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const info = JSON.parse(raw) as SessionState;
    // Defense in depth: ignore entries recorded for a different owner.
    return info.owner === owner ? info : null;
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages the ephemeral session keypair for the given main wallet address.
 * Pass the currently connected account address; when it changes, the hook
 * reloads that account's own keypair and session metadata.
 *
 * Reads `network`, `packageId`, `dappKey`, `dappHubId`, `frameworkPackageId`,
 * and `graphqlClient` from the surrounding `DubheProvider`.
 */
export function useSessionKey(owner?: string | null, options?: UseSessionKeyOptions) {
  const { network, packageId, dappKey, dappHubId, frameworkPackageId, graphqlClient } = useDubhe();

  const durationMs = options?.durationMs ?? SESSION_DURATION_MS;
  const namespace = options?.storageNamespace ?? dappKey ?? packageId;
  const skKey = owner ? idbSkKey(namespace, network, owner) : '';
  const infoKey = owner ? lsInfoKey(namespace, network, owner) : '';

  // `dappKey` is the canonical type string without the 0x prefix (as emitted
  // by Move's type_name); Move call type arguments need the 0x form.
  const dappKeyTypeArg = dappKey
    ? dappKey.startsWith('0x')
      ? dappKey
      : `0x${dappKey}`
    : `${packageId}::dapp_key::DappKey`;

  // keypair is loaded asynchronously from IndexedDB whenever the owner changes
  const [keypair, setKeypair] = useState<Ed25519Keypair | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionState | null>(null);
  // True while the keypair is being loaded from IndexedDB
  const [keypairLoading, setKeypairLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!owner) {
      setKeypair(null);
      setSessionInfo(null);
      setKeypairLoading(false);
      return;
    }
    let cancelled = false;
    setKeypairLoading(true);
    setSessionInfo(loadSessionInfo(infoKey, owner));
    loadOrCreateKeypair(skKey)
      .then((kp) => {
        if (!cancelled) setKeypair(kp);
      })
      .catch(() => {
        if (!cancelled) setKeypair(new Ed25519Keypair());
      })
      .finally(() => {
        if (!cancelled) setKeypairLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, skKey, infoKey]);

  const sessionAddress = keypair?.getPublicKey().toSuiAddress() ?? '';

  // Recompute isActive every render (fast, no RPC needed)
  const now = Date.now();
  const isActive = Boolean(
    !keypairLoading &&
      owner &&
      keypair &&
      sessionInfo &&
      sessionInfo.owner === owner &&
      sessionInfo.address === sessionAddress &&
      now < sessionInfo.expiresAt
  );
  const minutesLeft = isActive
    ? Math.max(0, Math.floor((sessionInfo!.expiresAt - now) / 60_000))
    : 0;

  // Re-render every 30 s so a "minutes left" counter stays fresh
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setSessionInfo((s) => (s ? { ...s } : null)), 30_000);
    return () => clearInterval(id);
  }, [isActive]);

  // ── On-chain validation against the indexer sessions table ────────────────

  const revalidate = useCallback(async (): Promise<boolean> => {
    if (!owner || !sessionAddress || !graphqlClient || !dappKey) return true;
    try {
      const result = await graphqlClient.getDubheSessions({
        dappKey,
        canonical: owner,
        first: 1
      });
      const row = result?.edges?.[0]?.node;
      if (!row) return true; // not indexed yet — keep local state
      const expired = row.expiresAt != null && Number(row.expiresAt) <= Date.now();
      const valid = Boolean(row.active) && !expired && row.sessionWallet === sessionAddress;
      if (!valid) {
        // A mismatching row right after activation is most likely the
        // indexer still serving the pre-activation state — don't clear yet.
        const activatedAt = loadSessionInfo(infoKey, owner)?.activatedAt ?? 0;
        if (Date.now() - activatedAt < REVALIDATE_GRACE_MS) return true;
        localStorage.removeItem(infoKey);
        setSessionInfo(null);
      }
      return valid;
    } catch {
      return true; // indexer unreachable — keep local state
    }
  }, [owner, sessionAddress, graphqlClient, dappKey, infoKey]);

  useEffect(() => {
    if (!isActive) return;
    // First check after the grace window has passed (so a freshly indexed
    // activation is compared against fresh data), then keep checking
    // periodically while the session stays active.
    const sinceActivation = Date.now() - (sessionInfo?.activatedAt ?? 0);
    const initialDelay = Math.max(0, REVALIDATE_GRACE_MS - sinceActivation) + 2_000;
    const timeout = setTimeout(revalidate, initialDelay);
    const interval = setInterval(revalidate, REVALIDATE_INTERVAL_MS);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [owner, sessionAddress, isActive]);

  // ── Build activate_session / deactivate_session PTBs ──────────────────────

  const buildActivateTx = useCallback(
    (userStorageId: string, customDurationMs?: number): Transaction => {
      if (!frameworkPackageId) throw new Error('frameworkPackageId not configured');
      if (!dappHubId) throw new Error('dappHubId not configured');
      const tx = new Transaction();
      tx.moveCall({
        target: `${frameworkPackageId}::dapp_system::activate_session`,
        typeArguments: [dappKeyTypeArg],
        arguments: [
          tx.object(dappHubId),
          tx.object(userStorageId),
          tx.pure.address(sessionAddress),
          tx.pure.u64(customDurationMs ?? durationMs),
          tx.object('0x6')
        ]
      });
      return tx;
    },
    [frameworkPackageId, dappHubId, dappKeyTypeArg, sessionAddress, durationMs]
  );

  /** Record the session locally after the activate tx succeeded on-chain. */
  const confirmActivation = useCallback(
    (customDurationMs?: number) => {
      if (!owner) return;
      const info: SessionState = {
        owner,
        address: sessionAddress,
        activatedAt: Date.now(),
        expiresAt: Date.now() + (customDurationMs ?? durationMs),
        isActive: true
      };
      localStorage.setItem(infoKey, JSON.stringify(info));
      setSessionInfo(info);
    },
    [owner, sessionAddress, durationMs, infoKey]
  );

  const buildDeactivateTx = useCallback(
    (userStorageId: string): Transaction => {
      if (!frameworkPackageId) throw new Error('frameworkPackageId not configured');
      if (!dappHubId) throw new Error('dappHubId not configured');
      const tx = new Transaction();
      tx.moveCall({
        target: `${frameworkPackageId}::dapp_system::deactivate_session`,
        typeArguments: [dappKeyTypeArg],
        arguments: [tx.object(dappHubId), tx.object(userStorageId)]
      });
      return tx;
    },
    [frameworkPackageId, dappHubId, dappKeyTypeArg]
  );

  /** Clear local session state and rotate to a fresh keypair. */
  const clearSession = useCallback(() => {
    if (!owner) return;
    localStorage.removeItem(infoKey);
    del(skKey).catch(() => {});
    setSessionInfo(null);
    loadOrCreateKeypair(skKey)
      .then(setKeypair)
      .catch(() => {});
  }, [owner, infoKey, skKey]);

  // ── Sign and send with the session keypair (no wallet popup) ──────────────

  const signAndSend = useCallback(
    async (buildFn: (tx: Transaction) => void | Promise<void>) => {
      if (!isActive) throw new Error('Session not active — activate first');
      if (!keypair) throw new Error('Keypair not loaded yet');

      const suiClient = new SuiClient({ url: getFullnodeUrl(network as NetworkType) });
      const tx = new Transaction();
      tx.setSender(sessionAddress);
      await buildFn(tx);

      const built = await tx.build({ client: suiClient as any });
      const { signature } = await keypair.signTransaction(built);

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: Buffer.from(built).toString('base64'),
        signature,
        options: { showEffects: true, showEvents: true }
      });

      const status = result?.effects?.status?.status;
      if (status !== 'success') {
        throw new Error(result?.effects?.status?.error ?? 'Transaction failed');
      }

      return result;
    },
    [isActive, keypair, network, sessionAddress]
  );

  // ── Session wallet balance helpers ────────────────────────────────────────

  const getSessionBalance = useCallback(async (): Promise<number> => {
    if (!sessionAddress) return 0;
    const suiClient = new SuiClient({ url: getFullnodeUrl(network as NetworkType) });
    try {
      const bal = await suiClient.getBalance({ owner: sessionAddress });
      return Number(bal.totalBalance) / 1_000_000_000;
    } catch {
      return 0;
    }
  }, [network, sessionAddress]);

  const buildFundSessionTx = useCallback(
    (amountSui: number): Transaction => {
      const tx = new Transaction();
      const amountMist = BigInt(Math.round(amountSui * 1_000_000_000));
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
      tx.transferObjects([coin], tx.pure.address(sessionAddress));
      return tx;
    },
    [sessionAddress]
  );

  return {
    sessionAddress,
    isActive,
    keypairLoading,
    minutesLeft,
    expiresAt: sessionInfo?.expiresAt ?? null,
    buildActivateTx,
    confirmActivation,
    buildDeactivateTx,
    signAndSend,
    clearSession,
    revalidate,
    getSessionBalance,
    buildFundSessionTx,
    SESSION_DURATION_MS: durationMs
  };
}

export type UseSessionKeyReturn = ReturnType<typeof useSessionKey>;
