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
import { PACKAGE_ID, DUBHE_SCHEMA_ID, FRAMEWORK_PACKAGE_ID } from 'contracts/deployment';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PROXY_SECRET_KEY_STORAGE = 'dubhe_proxy_secret_key';
const MIST_PER_SUI = BigInt(1_000_000_000);
const MS_PER_HOUR = 3_600_000;

type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

// ─────────────────────────────────────────────────────────────────────────────
// Helper — format epoch ms as a human-readable date string
// ─────────────────────────────────────────────────────────────────────────────
function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// ProxyCard component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProxyCard() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { connectionStatus } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const ownerAddress = currentAccount?.address;
  const { contract, graphqlClient, ecsWorld, network, dubheSchemaId } = useDubhe();

  // ── Proxy account state ──────────────────────────────────────────────────
  const [proxySecretKey, setProxySecretKey] = useState<string | null>(null);
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [proxyBalance, setProxyBalance] = useState<string>('0');

  // ── Proxy binding state ──────────────────────────────────────────────────
  const [proxyBinding, setProxyBinding] = useState<{ owner: string; expiresAt: number } | null>(
    null
  );
  const [hasBinding, setHasBinding] = useState<boolean>(false);

  // ── Counter state ─────────────────────────────────────────────────────────
  const [ownerCounterValue, setOwnerCounterValue] = useState<number | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState<number>(24);

  // ── Resolve framework package ID ─────────────────────────────────────────
  // For localnet: FRAMEWORK_PACKAGE_ID must be set in deployment.ts after deploying dubhe.
  // For testnet/mainnet: resolved automatically via Dubhe.getDefaultConfig().
  const frameworkPkgId = useMemo<string | undefined>(() => {
    if (FRAMEWORK_PACKAGE_ID) return FRAMEWORK_PACKAGE_ID;
    try {
      return Dubhe.getDefaultConfig(network as NetworkType).frameworkPackageId;
    } catch {
      return undefined;
    }
  }, [network]);

  // ── Proxy Dubhe client (signed with proxy's secret key) ──────────────────
  const proxyDubhe = useMemo<Dubhe | null>(() => {
    if (!proxySecretKey || !frameworkPkgId) return null;
    return new Dubhe({
      networkType: network as NetworkType,
      packageId: PACKAGE_ID,
      frameworkPackageId: frameworkPkgId,
      secretKey: proxySecretKey
    });
  }, [proxySecretKey, frameworkPkgId, network]);

  // ── Query-only Dubhe client (no secret key needed) ───────────────────────
  const queryDubhe = useMemo<Dubhe | null>(() => {
    if (!frameworkPkgId) return null;
    return new Dubhe({
      networkType: network as NetworkType,
      packageId: PACKAGE_ID,
      frameworkPackageId: frameworkPkgId
    });
  }, [frameworkPkgId, network]);

  // ── Load proxy secret key from localStorage on mount ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(PROXY_SECRET_KEY_STORAGE);
    if (stored) {
      try {
        const kp = Ed25519Keypair.fromSecretKey(stored);
        setProxySecretKey(stored);
        setProxyAddress(kp.getPublicKey().toSuiAddress());
      } catch {
        localStorage.removeItem(PROXY_SECRET_KEY_STORAGE);
      }
    }
  }, []);

  // ── Auto-refresh balance and binding when addresses change ────────────────
  useEffect(() => {
    if (proxyAddress && queryDubhe) {
      refreshProxyBalance(proxyAddress);
    }
  }, [proxyAddress, queryDubhe]);

  useEffect(() => {
    if (proxyAddress && ownerAddress && queryDubhe) {
      refreshProxyStatus();
    }
  }, [proxyAddress, ownerAddress, queryDubhe]);

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

  /** Fetch and store the proxy account's SUI balance. */
  async function refreshProxyBalance(address: string) {
    try {
      // Use the contract client which already has network access
      const bal = await contract.balanceOf(address);
      setProxyBalance((Number(bal.totalBalance) / 1_000_000_000).toFixed(4));
    } catch {
      setProxyBalance('0');
    }
  }

  /** Query whether a proxy binding exists for the current owner/proxy pair. */
  async function refreshProxyStatus() {
    if (!proxyAddress || !queryDubhe) return;
    try {
      const has = await queryDubhe.hasProxy({
        dappHubId: DUBHE_SCHEMA_ID,
        proxyAddress
      });
      setHasBinding(has);
      if (has) {
        const binding = await queryDubhe.getProxyBinding({
          dappHubId: DUBHE_SCHEMA_ID,
          proxyAddress
        });
        setProxyBinding(binding);
      } else {
        setProxyBinding(null);
      }
    } catch (err) {
      console.error('Failed to query proxy status:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Generate a new Ed25519 keypair and cache the secret key in localStorage. */
  function generateProxyAccount() {
    const kp = Ed25519Keypair.generate();
    const sk = kp.getSecretKey();
    const addr = kp.getPublicKey().toSuiAddress();
    localStorage.setItem(PROXY_SECRET_KEY_STORAGE, sk);
    setProxySecretKey(sk);
    setProxyAddress(addr);
    setHasBinding(false);
    setProxyBinding(null);
    setProxyBalance('0');
    toast.success('New proxy account generated and saved to localStorage');
  }

  /** Clear the stored proxy keypair from localStorage. */
  function clearProxyAccount() {
    localStorage.removeItem(PROXY_SECRET_KEY_STORAGE);
    setProxySecretKey(null);
    setProxyAddress(null);
    setProxyBalance('0');
    setHasBinding(false);
    setProxyBinding(null);
  }

  /**
   * Transfer 1 SUI from the connected wallet to the proxy address.
   * The proxy needs gas to submit transactions directly.
   */
  async function fundProxy() {
    if (!ownerAddress || !proxyAddress) return;
    setLoadingAction('fund');
    try {
      const tx = new Transaction();
      tx.transferObjects([tx.splitCoins(tx.gas, [MIST_PER_SUI])], proxyAddress);
      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            setTimeout(() => refreshProxyBalance(proxyAddress), 1500);
            toast.success('1 SUI transferred to proxy account');
          },
          onError: (err) => {
            console.error('Fund failed:', err);
            toast.error('Transfer failed');
          }
        }
      );
    } catch (err) {
      console.error('Fund proxy error:', err);
      toast.error('Transfer failed');
    } finally {
      setLoadingAction(null);
    }
  }

  /**
   * Set up the proxy binding on-chain.
   *
   * Flow:
   *  1. proxyDubhe.signProxyMessage() — proxy signs the canonical message (SDK).
   *  2. proxyDubhe.createProxy({ tx, ..., isRaw: true }) — SDK appends the
   *     Move call to tx without submitting.
   *  3. Owner (wallet) signs and submits — no wallet pop-up for the proxy.
   */
  async function setupProxy() {
    if (!ownerAddress || !proxyDubhe) return;
    setLoadingAction('setup');
    try {
      const expiresAt = new Date(Date.now() + expiryHours * MS_PER_HOUR);

      // Step 1 — proxy signs the registration message (SDK)
      const { publicKey, signature } = await proxyDubhe.signProxyMessage({
        ownerAddress,
        expiresAt
      });

      // Step 2 — SDK appends create_proxy to tx (isRaw: owner will sign this)
      const tx = new Transaction();
      await proxyDubhe.createProxy({
        tx,
        dappHubId: dubheSchemaId || DUBHE_SCHEMA_ID,
        publicKey,
        signature,
        expiresAt,
        isRaw: true
      });

      // Step 3 — owner's wallet signs and submits
      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            setTimeout(async () => {
              await refreshProxyStatus();
              toast.success('Proxy binding created successfully');
            }, 1500);
          },
          onError: (err) => {
            console.error('createProxy failed:', err);
            toast.error('Failed to create proxy binding');
          }
        }
      );
    } catch (err) {
      console.error('Setup proxy error:', err);
      toast.error(`Failed to create proxy: ${(err as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  }

  /** Remove the proxy binding on-chain. Owner (wallet) signs. */
  async function removeProxy() {
    if (!ownerAddress || !proxyAddress || !proxyDubhe) return;
    setLoadingAction('remove');
    try {
      // SDK appends remove_proxy to tx (isRaw: owner will sign this)
      const tx = new Transaction();
      await proxyDubhe.removeProxy({
        tx,
        dappHubId: dubheSchemaId || DUBHE_SCHEMA_ID,
        proxyAddress,
        isRaw: true
      });

      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            setTimeout(async () => {
              setHasBinding(false);
              setProxyBinding(null);
              toast.success('Proxy binding removed');
            }, 1500);
          },
          onError: (err) => {
            console.error('removeProxy failed:', err);
            toast.error('Failed to remove proxy binding');
          }
        }
      );
    } catch (err) {
      console.error('Remove proxy error:', err);
      toast.error(`Failed to remove proxy: ${(err as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  }

  /**
   * Increment the counter using the PROXY account — no wallet confirmation.
   *
   * Because the proxy calls `counter_system::inc`, `ensure_origin` inside the Move
   * contract resolves to the OWNER's address. So the counter is stored under
   * the owner's address, not the proxy's.
   */
  async function incrementCounterViaProxy() {
    if (!proxyDubhe) return;
    setLoadingAction('counter');
    try {
      const tx = new Transaction();
      // Build the counter inc call (same params as the existing page.tsx increment)
      await contract.tx.counter_system.inc({
        tx,
        params: [tx.object(dubheSchemaId || DUBHE_SCHEMA_ID), tx.pure.u32(1)],
        isRaw: true
      });

      // Submit signed by the PROXY keypair — no wallet pop-up
      const result = await proxyDubhe.signAndSendTxn({ tx });
      console.log('Counter inc via proxy:', result.digest);
      toast.success('Counter incremented via proxy (no wallet confirmation needed)', {
        description: `Tx: ${result.digest.slice(0, 16)}...`,
        action: {
          label: 'Explorer',
          onClick: () => window.open(contract.getTxExplorerUrl(result.digest), '_blank')
        }
      });
      // Refresh counter value after a short delay
      setTimeout(() => refreshOwnerCounterValue(), 2000);
    } catch (err) {
      console.error('Proxy counter increment failed:', err);
      toast.error(`Proxy counter increment failed: ${(err as Error).message}`);
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
  const isProxyActive = hasBinding && proxyBinding && proxyBinding.expiresAt > Date.now();
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
          <h2 className="text-2xl font-bold text-amber-700">Proxy Account Demo</h2>
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

      <div className="space-y-6">
        {/* ── Section 1: Proxy Account ─────────────────────────────────── */}
        <div className="border border-amber-200 rounded-xl p-5 bg-amber-50">
          <h3 className="text-lg font-semibold text-amber-800 mb-4">1. Proxy Account</h3>

          {!proxyAddress ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4 text-sm">
                Generate a burner keypair. The secret key is saved to{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">localStorage</code> so you can
                reload the page.
              </p>
              <button
                type="button"
                onClick={generateProxyAccount}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                Generate Proxy Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Address */}
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-gray-500 mb-1">Proxy address</p>
                <p className="font-mono text-sm text-gray-800 break-all">{proxyAddress}</p>
              </div>

              {/* Balance + fund */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span
                    className={`font-semibold text-sm ${
                      Number(proxyBalance) === 0 ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {proxyBalance} SUI
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fundProxy}
                    disabled={isLoading('fund')}
                    className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading('fund') ? 'Sending…' : 'Fund 1 SUI'}
                  </button>
                  <button
                    type="button"
                    onClick={() => proxyAddress && refreshProxyBalance(proxyAddress)}
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
                  onClick={generateProxyAccount}
                  className="px-4 py-1.5 border border-amber-400 text-amber-700 text-sm rounded-lg hover:bg-amber-100"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={clearProxyAccount}
                  className="px-4 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Proxy Setup ───────────────────────────────────── */}
        {proxyAddress && (
          <div className="border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-amber-800">2. Proxy Binding</h3>

              {/* Status badge */}
              {isProxyActive ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  ✓ Active
                </span>
              ) : hasBinding ? (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  ✗ Expired
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                  Not Set
                </span>
              )}
            </div>

            {/* Binding details */}
            {proxyBinding && (
              <div className="mb-4 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Owner:</span>{' '}
                  <span className="font-mono text-gray-800">
                    {proxyBinding.owner.slice(0, 10)}…{proxyBinding.owner.slice(-6)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Expires at:</span>{' '}
                  <span
                    className={
                      proxyBinding.expiresAt > Date.now() ? 'text-green-700' : 'text-red-600'
                    }
                  >
                    {formatExpiry(proxyBinding.expiresAt)}
                  </span>
                </p>
              </div>
            )}

            {/* Expiry selector + actions */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proxy duration
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
                      onClick={setupProxy}
                      disabled={!!loadingAction}
                      className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
                    >
                      {isLoading('setup')
                        ? 'Setting up…'
                        : isProxyActive
                        ? 'Re-bind Proxy'
                        : 'Setup Proxy'}
                    </button>
                    {hasBinding && (
                      <button
                        type="button"
                        onClick={removeProxy}
                        disabled={!!loadingAction}
                        className="px-4 py-2 border border-red-400 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {isLoading('remove') ? 'Removing…' : 'Remove Proxy'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={refreshProxyStatus}
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

        {/* ── Section 3: Counter via Proxy ─────────────────────────────── */}
        {isProxyActive && (
          <div className="border border-violet-200 rounded-xl p-5 bg-violet-50">
            <h3 className="text-lg font-semibold text-violet-800 mb-1">3. Counter via Proxy</h3>
            <p className="text-sm text-gray-500 mb-4">
              The proxy submits the transaction directly — no wallet pop-up. The Move contract's{' '}
              <code className="bg-violet-100 text-violet-700 px-1 rounded text-xs">
                ensure_origin
              </code>{' '}
              resolves the sender to your main account, so the counter is stored under your address.
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
                onClick={incrementCounterViaProxy}
                disabled={isLoading('counter') || Number(proxyBalance) === 0}
                className="px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium text-sm"
              >
                {isLoading('counter') ? 'Sending…' : '🚀 Increment (via Proxy)'}
              </button>
              {Number(proxyBalance) === 0 && (
                <p className="text-xs text-red-500 self-center">
                  Proxy has no SUI — fund it first (section 1)
                </p>
              )}
            </div>

            {/* How it works info box */}
            <div className="mt-4 p-3 bg-violet-100 rounded-lg text-xs text-violet-800 space-y-1">
              <p>
                <strong>How it works:</strong>
              </p>
              <p>
                1. Proxy keypair signs and submits <code>counter_system::inc</code> with its own
                gas.
              </p>
              <p>
                2. On-chain, <code>address_system::ensure_origin</code> detects the proxy binding
                and returns your wallet address as the logical sender.
              </p>
              <p>3. The counter increments under your wallet address — not the proxy address.</p>
              <p>4. You can verify this by incrementing via the main counter tab as well.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
