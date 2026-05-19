'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ed25519Keypair, getFullnodeUrl, SuiClient, Transaction } from '@0xobelisk/sui-client';
import { useDubhe } from '@0xobelisk/react/sui';
import { get, set, del } from 'idb-keyval';
import { FrameworkPackageId, DappHubId, PackageId, Network } from 'contracts/deployment';

// ── Storage keys ──────────────────────────────────────────────────────────────

// Keypair Bech32 string stored in IndexedDB (more appropriate for structured/binary data)
const IDB_SK_KEY = 'harvest_session_sk';
// Session metadata (address, expiresAt) in localStorage — simple JSON, no sensitivity
const LS_INFO_KEY = 'harvest_session_info';

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour default

export interface SessionState {
  address: string; // ephemeral wallet address
  expiresAt: number; // unix ms
  isActive: boolean;
}

// ── IndexedDB keypair helpers (async) ─────────────────────────────────────────

async function loadOrCreateKeypair(): Promise<Ed25519Keypair> {
  const stored = await get<string>(IDB_SK_KEY);
  if (stored) {
    try {
      // getSecretKey() returns a Bech32 string ('suiprivkey1q...')
      // fromSecretKey accepts the same format directly
      return Ed25519Keypair.fromSecretKey(stored);
    } catch {
      // corrupted entry — fall through to regenerate
    }
  }
  const kp = new Ed25519Keypair();
  // Store the Bech32 string as-is; do NOT re-encode (base64/hex would break it)
  await set(IDB_SK_KEY, kp.getSecretKey());
  return kp;
}

async function deleteStoredKeypair(): Promise<void> {
  await del(IDB_SK_KEY);
}

// ── localStorage session info helpers (sync) ──────────────────────────────────

function loadSessionInfo(): SessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_INFO_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

function saveSessionInfo(info: SessionState) {
  localStorage.setItem(LS_INFO_KEY, JSON.stringify(info));
}

function deleteSessionInfo() {
  localStorage.removeItem(LS_INFO_KEY);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSessionKey() {
  const { packageId, network } = useDubhe();

  // keypair is loaded asynchronously from IndexedDB on mount
  const [keypair, setKeypair] = useState<Ed25519Keypair | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionState | null>(() => loadSessionInfo());
  // True while the keypair is being loaded from IndexedDB
  const [keypairLoading, setKeypairLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadOrCreateKeypair()
      .then((kp) => setKeypair(kp))
      .catch(() => setKeypair(new Ed25519Keypair()))
      .finally(() => setKeypairLoading(false));
  }, []);

  const sessionAddress = keypair?.getPublicKey().toSuiAddress() ?? '';

  // Recompute isActive every render (fast, no RPC needed)
  const now = Date.now();
  const isActive = Boolean(
    !keypairLoading &&
      keypair &&
      sessionInfo &&
      sessionInfo.address === sessionAddress &&
      now < sessionInfo.expiresAt
  );
  const minutesLeft = isActive
    ? Math.max(0, Math.floor((sessionInfo!.expiresAt - now) / 60_000))
    : 0;

  // Re-render every 30 s so the "minutes left" counter stays fresh
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setSessionInfo((s) => (s ? { ...s } : null)), 30_000);
    return () => clearInterval(id);
  }, [isActive]);

  // ── Build activate_session PTB ────────────────────────────────────────────

  const buildActivateTx = useCallback(
    (userStorageId: string, durationMs = SESSION_DURATION_MS): Transaction => {
      const frameworkPkg = FrameworkPackageId;
      const pkg = packageId ?? PackageId;
      const tx = new Transaction();
      tx.moveCall({
        target: `${frameworkPkg}::dapp_system::activate_session`,
        typeArguments: [`${pkg}::dapp_key::DappKey`],
        arguments: [
          tx.object(DappHubId),
          tx.object(userStorageId),
          tx.pure.address(sessionAddress),
          tx.pure.u64(durationMs),
          tx.object('0x6')
        ]
      });
      return tx;
    },
    [packageId, sessionAddress]
  );

  const confirmActivation = useCallback(
    (durationMs = SESSION_DURATION_MS) => {
      const info: SessionState = {
        address: sessionAddress,
        expiresAt: Date.now() + durationMs,
        isActive: true
      };
      saveSessionInfo(info);
      setSessionInfo(info);
    },
    [sessionAddress]
  );

  // ── Build deactivate_session PTB ──────────────────────────────────────────

  const buildDeactivateTx = useCallback(
    (userStorageId: string): Transaction => {
      const frameworkPkg = FrameworkPackageId;
      const pkg = packageId ?? PackageId;
      const tx = new Transaction();
      tx.moveCall({
        target: `${frameworkPkg}::dapp_system::deactivate_session`,
        typeArguments: [`${pkg}::dapp_key::DappKey`],
        arguments: [tx.object(DappHubId), tx.object(userStorageId)]
      });
      return tx;
    },
    [packageId]
  );

  const clearSession = useCallback(() => {
    deleteSessionInfo();
    deleteStoredKeypair().catch(() => {});
    setSessionInfo(null);
    // Generate a fresh keypair for the next session
    loadOrCreateKeypair()
      .then(setKeypair)
      .catch(() => {});
  }, []);

  // ── Sign and send with session keypair (no wallet popup) ──────────────────

  const signAndSend = useCallback(
    async (buildFn: (tx: Transaction) => void | Promise<void>) => {
      if (!isActive) throw new Error('Session not active — activate first');
      if (!keypair) throw new Error('Keypair not loaded yet');

      const net = (network ?? Network ?? 'localnet') as
        | 'mainnet'
        | 'testnet'
        | 'devnet'
        | 'localnet';

      const suiClient = new SuiClient({ url: getFullnodeUrl(net) });
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
    const net = (network ?? Network ?? 'localnet') as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
    const suiClient = new SuiClient({ url: getFullnodeUrl(net) });
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
    getSessionBalance,
    buildFundSessionTx,
    SESSION_DURATION_MS
  };
}
