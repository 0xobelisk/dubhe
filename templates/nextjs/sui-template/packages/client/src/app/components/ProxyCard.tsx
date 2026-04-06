'use client';

import { useEffect, useMemo, useState } from 'react';
import { Transaction, Ed25519Keypair, Dubhe } from '@0xobelisk/sui-client';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction
} from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useDubhe } from '@0xobelisk/react/sui';
import { PACKAGE_ID, FRAMEWORK_PACKAGE_ID } from 'contracts/deployment';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_SECRET_KEY_STORAGE = 'dubhe_session_secret_key';
const MIST_PER_SUI = BigInt(1_000_000_000);
const MS_PER_HOUR = 3_600_000;
const SUI_CLOCK_OBJECT_ID = '0x6';

type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface ProxyCardProps {
  /** The UserStorage object ID for the connected owner account. */
  userStorageId: string | null;
  /** Called after a session is activated or deactivated so the parent can refresh fields. */
  onSessionChanged?: () => void | Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — format epoch ms as a human-readable date string
// ─────────────────────────────────────────────────────────────────────────────
function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** Build the DappKey type argument from the contract package ID. */
function buildDappKeyType(): string {
  const raw = (PACKAGE_ID ?? '').replace(/^0x/, '');
  return `${raw.padStart(64, '0')}::dapp_key::DappKey`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ProxyCard component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProxyCard({ userStorageId, onSessionChanged }: ProxyCardProps) {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { connectionStatus } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const ownerAddress = currentAccount?.address;
  const { contract, graphqlClient, ecsWorld, network, dubheSchemaId, frameworkPackageId } =
    useDubhe();

  // ── Session wallet state ─────────────────────────────────────────────────
  const [sessionSecretKey, setSessionSecretKey] = useState<string | null>(null);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [sessionBalance, setSessionBalance] = useState<string>('0');

  // ── Session binding state read from UserStorage fields ───────────────────
  const [sessionKey, setSessionKey] = useState<string>('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number>(0);

  // ── Counter state ─────────────────────────────────────────────────────────
  const [ownerCounterValue, setOwnerCounterValue] = useState<number | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState<number>(24);

  // ── Resolve framework package ID ─────────────────────────────────────────
  const frameworkPkgId = useMemo<string | undefined>(() => {
    if (frameworkPackageId) return frameworkPackageId;
    if (FRAMEWORK_PACKAGE_ID) return FRAMEWORK_PACKAGE_ID;
    try {
      return Dubhe.getDefaultConfig(network as NetworkType).frameworkPackageId;
    } catch {
      return undefined;
    }
  }, [frameworkPackageId, network]);

  // ── Session Dubhe client (signed with session wallet's secret key) ────────
  const sessionDubhe = useMemo<Dubhe | null>(() => {
    if (!sessionSecretKey || !frameworkPkgId) return null;
    return new Dubhe({
      networkType: network as NetworkType,
      packageId: PACKAGE_ID,
      frameworkPackageId: frameworkPkgId,
      secretKey: sessionSecretKey
    });
  }, [sessionSecretKey, frameworkPkgId, network]);

  // ── Load session secret key from localStorage on mount ───────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(SESSION_SECRET_KEY_STORAGE);
    if (stored) {
      try {
        const kp = Ed25519Keypair.fromSecretKey(stored);
        setSessionSecretKey(stored);
        setSessionAddress(kp.getPublicKey().toSuiAddress());
      } catch {
        localStorage.removeItem(SESSION_SECRET_KEY_STORAGE);
      }
    }
  }, []);

  // ── Sync session status from UserStorage fields ───────────────────────────
  useEffect(() => {
    if (!userStorageId) {
      setSessionKey('');
      setSessionExpiresAt(0);
      return;
    }
    contract
      .getUserStorageFields(userStorageId)
      .then((f) => {
        setSessionKey(f.session_key ?? '');
        setSessionExpiresAt(Number(f.session_expires_at));
      })
      .catch(console.error);
  }, [userStorageId]);

  // ── Auto-refresh balance when session address changes ─────────────────────
  useEffect(() => {
    if (sessionAddress) refreshSessionBalance(sessionAddress);
  }, [sessionAddress]);

  // ── Subscribe to counter1 changes for the owner address ──────────────────
  useEffect(() => {
    if (!ownerAddress || !ecsWorld) return;

    const subscription = ecsWorld.onEntityComponent<any>('counter1', ownerAddress).subscribe({
      next: (result: any) => {
        if (result && result.entityId === ownerAddress) {
          const data = result.data as any;
          if (data?.value !== undefined) {
            setOwnerCounterValue(data.value);
          }
        }
      },
      error: (err: any) => {
        console.error('ECS counter1 subscription error:', err);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [ownerAddress, ecsWorld]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Fetch and store the session account's SUI balance. */
  async function refreshSessionBalance(address: string) {
    try {
      const bal = await contract.balanceOf(address);
      setSessionBalance((Number(bal.totalBalance) / 1_000_000_000).toFixed(4));
    } catch {
      setSessionBalance('0');
    }
  }

  /** Re-read session_key / session_expires_at from UserStorage. */
  async function refreshSessionStatus() {
    if (!userStorageId) return;
    try {
      const f = await contract.getUserStorageFields(userStorageId);
      setSessionKey(f.session_key ?? '');
      setSessionExpiresAt(Number(f.session_expires_at));
    } catch (err) {
      console.error('Failed to refresh session status:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Generate a new Ed25519 keypair and cache the secret key in localStorage. */
  function generateSessionAccount() {
    const kp = Ed25519Keypair.generate();
    const sk = kp.getSecretKey();
    const addr = kp.getPublicKey().toSuiAddress();
    localStorage.setItem(SESSION_SECRET_KEY_STORAGE, sk);
    setSessionSecretKey(sk);
    setSessionAddress(addr);
    setSessionBalance('0');
    setSessionKey('');
    setSessionExpiresAt(0);
    toast.success('New session account generated and saved to localStorage');
  }

  /** Clear the stored session keypair from localStorage. */
  function clearSessionAccount() {
    localStorage.removeItem(SESSION_SECRET_KEY_STORAGE);
    setSessionSecretKey(null);
    setSessionAddress(null);
    setSessionBalance('0');
    setSessionKey('');
    setSessionExpiresAt(0);
  }

  /**
   * Transfer 1 SUI from the connected wallet to the session address.
   * The session wallet needs gas to submit transactions directly.
   */
  async function fundSession() {
    if (!ownerAddress || !sessionAddress) return;
    setLoadingAction('fund');
    try {
      const tx = new Transaction();
      tx.transferObjects([tx.splitCoins(tx.gas, [MIST_PER_SUI])], sessionAddress);
      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            setTimeout(() => refreshSessionBalance(sessionAddress), 1500);
            toast.success('1 SUI transferred to session account');
          },
          onError: (err) => {
            console.error('Fund failed:', err);
            toast.error('Transfer failed');
          }
        }
      );
    } catch (err) {
      console.error('Fund session error:', err);
      toast.error('Transfer failed');
    } finally {
      setLoadingAction(null);
    }
  }

  /**
   * Activate a session on the owner's UserStorage.
   *
   * Flow:
   *   1. Build a PTB calling `dapp_system::activate_session<DappKey>(
   *        user_storage, session_wallet, duration_ms, clock)`.
   *   2. Owner's wallet signs and submits — no wallet pop-up for the session.
   */
  async function setupSession() {
    if (!ownerAddress || !sessionAddress || !userStorageId || !frameworkPkgId) return;
    setLoadingAction('setup');
    try {
      const durationMs = expiryHours * MS_PER_HOUR;
      const tx = new Transaction();
      tx.moveCall({
        target: `${frameworkPkgId}::dapp_system::activate_session`,
        typeArguments: [buildDappKeyType()],
        arguments: [
          tx.object(userStorageId),
          tx.pure.address(sessionAddress),
          tx.pure.u64(durationMs),
          tx.object(SUI_CLOCK_OBJECT_ID)
        ]
      });

      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            setTimeout(async () => {
              await refreshSessionStatus();
              if (onSessionChanged) await onSessionChanged();
              toast.success('Session activated successfully');
            }, 1500);
          },
          onError: (err) => {
            console.error('activateSession failed:', err);
            toast.error('Failed to activate session');
          }
        }
      );
    } catch (err) {
      console.error('Setup session error:', err);
      toast.error(`Failed to activate session: ${(err as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  }

  /**
   * Deactivate the session on the owner's UserStorage.
   * Owner's wallet signs. (The session wallet or anyone can also call once expired.)
   */
  async function removeSession() {
    if (!ownerAddress || !userStorageId || !frameworkPkgId) return;
    setLoadingAction('remove');
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${frameworkPkgId}::dapp_system::deactivate_session`,
        typeArguments: [buildDappKeyType()],
        arguments: [tx.object(userStorageId)]
      });

      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            setTimeout(async () => {
              setSessionKey('');
              setSessionExpiresAt(0);
              if (onSessionChanged) await onSessionChanged();
              toast.success('Session deactivated');
            }, 1500);
          },
          onError: (err) => {
            console.error('deactivateSession failed:', err);
            toast.error('Failed to deactivate session');
          }
        }
      );
    } catch (err) {
      console.error('Remove session error:', err);
      toast.error(`Failed to deactivate session: ${(err as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  }

  /**
   * Increment the counter using the SESSION account — no wallet confirmation.
   *
   * Because the session wallet calls `counter_system::inc`, `ensure_origin` inside
   * the Move contract resolves to the OWNER's address. So the counter is stored
   * under the owner's address, not the session wallet's.
   */
  async function incrementCounterViaSession() {
    if (!sessionDubhe || !userStorageId) return;
    setLoadingAction('counter');
    try {
      const tx = new Transaction();
      // counter_system::inc(user_storage: &mut UserStorage, number: u32, ctx)
      await contract.tx.counter_system.inc({
        tx,
        params: [tx.object(userStorageId), tx.pure.u32(1)],
        isRaw: true
      });

      // Submit signed by the SESSION keypair — no wallet pop-up
      const result = await sessionDubhe.signAndSendTxn({ tx });
      console.log('Counter inc via session:', result.digest);
      toast.success('Counter incremented via session (no wallet confirmation needed)', {
        description: `Tx: ${result.digest.slice(0, 16)}...`,
        action: {
          label: 'Explorer',
          onClick: () => window.open(contract.getTxExplorerUrl(result.digest), '_blank')
        }
      });
      setTimeout(() => refreshOwnerCounterValue(), 2000);
    } catch (err) {
      console.error('Session counter increment failed:', err);
      toast.error(`Session counter increment failed: ${(err as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  }

  /** Query the counter value stored under the OWNER's address. */
  async function refreshOwnerCounterValue() {
    if (!ownerAddress || !graphqlClient) return;
    try {
      const result = await graphqlClient.getTableByCondition('counter1', {
        entityId: ownerAddress
      });
      if (result) {
        setOwnerCounterValue(result.value ?? null);
      } else {
        setOwnerCounterValue(null);
      }
    } catch (err) {
      console.log('Counter value not set yet or query failed:', err);
      setOwnerCounterValue(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * A session is "active" when:
   *   - session_key matches the current session wallet address, AND
   *   - session_expires_at is in the future.
   */
  const isSessionActive =
    sessionAddress !== null &&
    sessionKey.toLowerCase() === sessionAddress.toLowerCase() &&
    sessionExpiresAt > Date.now();

  const hasSessionSet = sessionKey !== '' && sessionKey !== '0x0';
  const isLoading = (action: string) => loadingAction === action;
  const connected = connectionStatus === 'connected';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  if (!connected) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full">
          <span className="text-2xl">🔑</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-amber-700">Session Wallet Demo</h2>
          <p className="text-sm text-gray-500">
            Let a burner wallet transact on behalf of your main account — no wallet pop-ups.
          </p>
        </div>
      </div>

      {/* Framework package not configured warning */}
      {!frameworkPkgId && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <strong>Framework package ID not configured.</strong> Set{' '}
          <code className="bg-red-100 px-1 rounded">FRAMEWORK_PACKAGE_ID</code> in{' '}
          <code className="bg-red-100 px-1 rounded">packages/contracts/deployment.ts</code> after
          deploying the dubhe framework locally (or use testnet where it is auto-resolved).
        </div>
      )}

      {/* UserStorage not ready warning */}
      {!userStorageId && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <strong>UserStorage required.</strong> Register a UserStorage on the main page first
          before activating a session.
        </div>
      )}

      <div className="space-y-6">
        {/* ── Section 1: Session Account ───────────────────────────────── */}
        <div className="border border-amber-200 rounded-xl p-5 bg-amber-50">
          <h3 className="text-lg font-semibold text-amber-800 mb-4">1. Session Account</h3>

          {!sessionAddress ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4 text-sm">
                Generate a burner keypair. The secret key is saved to{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">localStorage</code> so you can
                reload the page.
              </p>
              <button
                type="button"
                onClick={generateSessionAccount}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                Generate Session Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Address */}
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-gray-500 mb-1">Session address</p>
                <p className="font-mono text-sm text-gray-800 break-all">{sessionAddress}</p>
              </div>

              {/* Balance + fund */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span
                    className={`font-semibold text-sm ${
                      Number(sessionBalance) === 0 ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {sessionBalance} SUI
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fundSession}
                    disabled={isLoading('fund')}
                    className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading('fund') ? 'Sending…' : 'Fund 1 SUI'}
                  </button>
                  <button
                    type="button"
                    onClick={() => sessionAddress && refreshSessionBalance(sessionAddress)}
                    className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    ↻
                  </button>
                </div>
              </div>

              {/* Regenerate / clear */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={generateSessionAccount}
                  className="px-4 py-1.5 border border-amber-400 text-amber-700 text-sm rounded-lg hover:bg-amber-100"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={clearSessionAccount}
                  className="px-4 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Session Activation ────────────────────────────── */}
        {sessionAddress && userStorageId && (
          <div className="border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-amber-800">2. Session Activation</h3>

              {/* Status badge */}
              {isSessionActive ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  ✓ Active
                </span>
              ) : hasSessionSet ? (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  ✗ Expired
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                  Not Set
                </span>
              )}
            </div>

            {/* Session details */}
            {hasSessionSet && (
              <div className="mb-4 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Session key:</span>{' '}
                  <span className="font-mono text-gray-800">
                    {sessionKey.slice(0, 10)}…{sessionKey.slice(-6)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Expires at:</span>{' '}
                  <span
                    className={sessionExpiresAt > Date.now() ? 'text-green-700' : 'text-red-600'}
                  >
                    {formatExpiry(sessionExpiresAt)}
                  </span>
                </p>
              </div>
            )}

            {/* Duration selector + actions */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session duration
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days (max)</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {!frameworkPkgId ? (
                  <span className="text-xs text-gray-400 self-center">
                    Framework package ID required
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={setupSession}
                      disabled={!!loadingAction}
                      className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
                    >
                      {isLoading('setup')
                        ? 'Activating…'
                        : isSessionActive
                        ? 'Re-activate Session'
                        : 'Activate Session'}
                    </button>
                    {hasSessionSet && (
                      <button
                        type="button"
                        onClick={removeSession}
                        disabled={!!loadingAction}
                        className="px-4 py-2 border border-red-400 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {isLoading('remove') ? 'Deactivating…' : 'Deactivate Session'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={refreshSessionStatus}
                      disabled={!!loadingAction}
                      className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Refresh Status
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Counter via Session ──────────────────────────── */}
        {isSessionActive && (
          <div className="border border-violet-200 rounded-xl p-5 bg-violet-50">
            <h3 className="text-lg font-semibold text-violet-800 mb-1">3. Counter via Session</h3>
            <p className="text-sm text-gray-500 mb-4">
              The session wallet submits the transaction directly — no wallet pop-up. The Move
              contract&apos;s{' '}
              <code className="bg-violet-100 text-violet-700 px-1 rounded text-xs">
                ensure_origin
              </code>{' '}
              resolves the sender to your main account via the UserStorage session key.
            </p>

            {/* Owner counter value */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-4 border border-violet-200">
              <div>
                <p className="text-xs text-gray-500">Counter value (under owner&apos;s address)</p>
                <p className="text-3xl font-bold text-violet-700">{ownerCounterValue ?? '—'}</p>
              </div>
              <button
                type="button"
                onClick={refreshOwnerCounterValue}
                className="text-sm px-3 py-1.5 border border-violet-300 text-violet-600 rounded-lg hover:bg-violet-100"
              >
                ↻ Refresh
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={incrementCounterViaSession}
                disabled={isLoading('counter') || Number(sessionBalance) === 0}
                className="px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium text-sm"
              >
                {isLoading('counter') ? 'Sending…' : '🚀 Increment (via Session)'}
              </button>
              {Number(sessionBalance) === 0 && (
                <p className="text-xs text-red-500 self-center">
                  Session wallet has no SUI — fund it first (section 1)
                </p>
              )}
            </div>

            {/* How it works info box */}
            <div className="mt-4 p-3 bg-violet-100 rounded-lg text-xs text-violet-800 space-y-1">
              <p>
                <strong>How it works:</strong>
              </p>
              <p>
                1. Owner activates a session key (this wallet address) on their{' '}
                <code>UserStorage</code>.
              </p>
              <p>2. Session wallet signs and submits transactions with its own gas.</p>
              <p>
                3. On-chain, <code>ensure_origin</code> finds the session key in{' '}
                <code>UserStorage</code> and returns your wallet address as the logical sender.
              </p>
              <p>4. The counter increments under your wallet address — not the session address.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
