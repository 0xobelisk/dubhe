'use client';

/**
 * useDubheTx — transaction execution layer for Dubhe DApps.
 *
 * Responsibilities:
 * - Track the user's `unsettled_count` and the dapp's `settlement_mode`,
 *   and automatically prepend `settle_writes` / `settle_writes_user_pays`
 *   to the PTB once the count crosses the threshold.
 * - `execTx`: sign silently with the session key when a session is active;
 *   on failure, revalidate the session against the indexer and surface a
 *   typed `SessionInvalidatedError` when it has been revoked or expired.
 *   When no session is active, fall back to the injected wallet signer.
 * - `execTxWithMainWallet`: always use the injected wallet signer (for
 *   onboarding, marketplace, admin and other actions that must come from
 *   the main wallet).
 *
 * This hook deliberately has no dependency on @mysten/dapp-kit or any UI
 * library: wallet signing is injected via the `signWithWallet` callback and
 * results/errors are returned/thrown so the caller owns all UX feedback.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Transaction } from '@0xobelisk/sui-client';
import { useDubhe } from './hooks';
import { useSessionKey, UseSessionKeyOptions } from './useSessionKey';

// Unsettled write count threshold — settle_writes is prepended to the PTB
// once the user's unsettled count reaches this value.
const DEFAULT_SETTLE_THRESHOLD = 1500n;

/** Thrown by execTx when the session turned out to be revoked/expired on-chain. */
export class SessionInvalidatedError extends Error {
  constructor() {
    super('Session is no longer valid — please activate it again.');
    this.name = 'SessionInvalidatedError';
  }
}

export interface ExecTxResult {
  digest: string;
  /** Which key signed the transaction */
  signer: 'session' | 'wallet';
}

export interface UseDubheTxOptions {
  /** Main wallet (canonical owner) address — scopes the session key. */
  owner?: string | null;
  /** The user's UserStorage object ID (required for settle_writes prepending). */
  userStorageId?: string | null;
  /**
   * Wallet signer callback. Wrap your wallet adapter here, e.g. dapp-kit's
   * `useSignAndExecuteTransaction`. Must resolve with the tx digest or throw.
   */
  signWithWallet: (tx: Transaction) => Promise<{ digest: string }>;
  /** Unsettled-write count at which settle_writes is prepended (default 1500). */
  settleThreshold?: bigint;
  /** Options forwarded to the internal useSessionKey hook. */
  sessionOptions?: UseSessionKeyOptions;
}

export function useDubheTx(options: UseDubheTxOptions) {
  const { owner, userStorageId, signWithWallet, sessionOptions } = options;
  const settleThreshold = options.settleThreshold ?? DEFAULT_SETTLE_THRESHOLD;

  const { contract, dappHubId, dappStorageId } = useDubhe();
  const session = useSessionKey(owner, sessionOptions);

  const unsettledCountRef = useRef<bigint>(0n);
  const settlementModeRef = useRef<number>(0);

  // ── Settle-state tracking ──────────────────────────────────────────────────

  const refreshSettleState = useCallback(async () => {
    if (!contract) return;
    if (userStorageId) {
      try {
        const f = await contract.getUserStorageFields(userStorageId);
        unsettledCountRef.current = f.unsettled_count;
      } catch {}
    }
    if (dappStorageId) {
      try {
        const f = await contract.getDappStorageFields(dappStorageId);
        settlementModeRef.current = f.settlement_mode;
      } catch {}
    }
  }, [contract, userStorageId, dappStorageId]);

  useEffect(() => {
    refreshSettleState();
  }, [refreshSettleState]);

  const buildWithSettle = useCallback(
    async (tx: Transaction, buildFn: (tx: Transaction) => void | Promise<void>) => {
      if (userStorageId && dappHubId && contract && unsettledCountRef.current >= settleThreshold) {
        if (settlementModeRef.current === 0) {
          contract.buildSettleWritesTx(tx, { dappHubId, userStorageId });
        } else {
          contract.buildSettleWritesUserPaysTx(tx, { dappHubId, userStorageId });
        }
        unsettledCountRef.current = 0n;
      }
      await buildFn(tx);
    },
    [contract, dappHubId, userStorageId, settleThreshold]
  );

  // ── Execution ──────────────────────────────────────────────────────────────

  /** Always sign with the main wallet (onboarding, marketplace, admin, …). */
  const execTxWithMainWallet = useCallback(
    async (buildFn: (tx: Transaction) => void | Promise<void>): Promise<ExecTxResult> => {
      const tx = new Transaction();
      await buildFn(tx);
      const { digest } = await signWithWallet(tx);
      return { digest, signer: 'wallet' };
    },
    [signWithWallet]
  );

  /**
   * Game action: session key silent-sign when active, otherwise main wallet.
   * Prepends settle_writes when the unsettled count crosses the threshold.
   *
   * @throws SessionInvalidatedError when the session was revoked/expired
   *   on-chain — callers should prompt the user to re-activate.
   */
  const execTx = useCallback(
    async (buildFn: (tx: Transaction) => void | Promise<void>): Promise<ExecTxResult> => {
      if (session.isActive) {
        try {
          const result = await session.signAndSend((tx) => buildWithSettle(tx, buildFn));
          return { digest: result.digest, signer: 'session' };
        } catch (err) {
          // The session may have been revoked or expired on-chain while the
          // local state still says active — verify and clear if so.
          const stillValid = await session.revalidate();
          if (!stillValid) throw new SessionInvalidatedError();
          throw err;
        }
      }
      const tx = new Transaction();
      await buildWithSettle(tx, buildFn);
      const { digest } = await signWithWallet(tx);
      return { digest, signer: 'wallet' };
    },
    [session, buildWithSettle, signWithWallet]
  );

  return {
    execTx,
    execTxWithMainWallet,
    session,
    refreshSettleState
  };
}

export type UseDubheTxReturn = ReturnType<typeof useDubheTx>;
