'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useDubhe } from '@0xobelisk/react/sui';
import { Transaction, SuiClient } from '@0xobelisk/sui-client';
import { toast } from 'sonner';
import { DappHubId, DappStorageId, Network } from 'contracts/deployment';

const fallbackExplorerUrl = (digest: string, network: string) =>
  `https://suiscan.xyz/${network}/tx/${digest}`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeeState {
  baseFeePerWrite: bigint;
  bytesFeePerByte: bigint;
  freeCredit: bigint;
  creditPool: bigint;
  totalSettled: bigint;
  settlementMode: number;
  writeFeeDappShareBps: number;
}

interface RevenueState {
  dappRevenue: bigint;
  coinType: string;
}

interface RuntimeState {
  admin: string;
  paused: boolean;
  lastRuntimeEvent: string;
  lastRuntimeActor: string;
  lastRuntimeAmount: string;
}

interface MarketplaceFeeRecord {
  listingId: string;
  coinType: string;
  totalFee: bigint;
  treasuryAmount: bigint;
  dappAmount: bigint;
  updatedAtCheckpoint: string;
}

interface SettlementRecord {
  digest: string;
  account: string;
  writes: number;
  paidCost: bigint;
  timestampMs: number;
}

interface FrameworkTreasury {
  address: string;
  balance: bigint;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MIST_PER_SUI = 1_000_000_000n;
const formatMist = (mist: bigint) => (Number(mist) / Number(MIST_PER_SUI)).toFixed(6) + ' SUI';
const shortAddr = (addr: string) => (addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '—');
const bpsToPercent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

function StatCard({
  label,
  value,
  sub,
  accent
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}) {
  const colors: Record<string, string> = {
    green: 'border-emerald-700/40 text-emerald-300',
    amber: 'border-amber-700/40 text-amber-300',
    red: 'border-red-700/40 text-red-300',
    blue: 'border-blue-700/40 text-blue-300',
    purple: 'border-purple-700/40 text-purple-300'
  };
  return (
    <div
      className={`rounded-xl border bg-black/30 p-4 ${
        accent ? colors[accent] : 'border-white/10 text-white'
      }`}
    >
      <p className="text-xs opacity-60 mb-1">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mt-8 mb-3">
      {children}
    </h2>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const account = useCurrentAccount();
  const { contract, graphqlClient, dappHubId, dappStorageId } = useDubhe();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const hubId = dappHubId ?? DappHubId;
  const storageId = dappStorageId ?? DappStorageId;

  const [feeState, setFeeState] = useState<FeeState | null>(null);
  const [revenueState, setRevenueState] = useState<RevenueState | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [marketplaceFees, setMarketplaceFees] = useState<MarketplaceFeeRecord[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementRecord[]>([]);
  const [frameworkTreasury, setFrameworkTreasury] = useState<FrameworkTreasury | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!contract || !graphqlClient) return;
    setIsLoading(true);
    try {
      // ── Chain: real-time DappStorage ──────────────────────────────────────
      const fields = await contract.getDappStorageFields(storageId);
      setFeeState({
        baseFeePerWrite: fields.base_fee_per_write,
        bytesFeePerByte: fields.bytes_fee_per_byte,
        freeCredit: fields.free_credit,
        creditPool: fields.credit_pool,
        totalSettled: fields.total_settled,
        settlementMode: fields.settlement_mode,
        writeFeeDappShareBps: fields.write_fee_dapp_share_bps
      });

      // ── Chain: DApp revenue balance (dynamic field on DappStorage) ───────
      // dapp_revenue is a dynamic_field keyed by DappRevenueKey<CoinType>,
      // so getObject() cannot return it — use the dedicated SDK method.
      const coinType = '0x2::sui::SUI';
      const dappRevBalance = await contract.getDappRevenueBalance(storageId, coinType);
      setRevenueState({ dappRevenue: dappRevBalance, coinType });

      // ── Indexer: runtime state (admin, paused, last event) ────────────────
      const rtNode = await graphqlClient.getDappRuntimeState();
      if (rtNode) {
        setRuntimeState({
          admin: rtNode.admin ?? fields.admin ?? '',
          paused: Boolean(rtNode.paused),
          lastRuntimeEvent: rtNode.lastRuntimeEvent ?? '',
          lastRuntimeActor: rtNode.lastRuntimeActor ?? '',
          lastRuntimeAmount: rtNode.lastRuntimeAmount ?? '0'
        });
      } else {
        setRuntimeState({
          admin: fields.admin,
          paused: fields.paused,
          lastRuntimeEvent: '',
          lastRuntimeActor: '',
          lastRuntimeAmount: '0'
        });
      }

      // ── Indexer: marketplace fee records ──────────────────────────────────
      const mktResult = await graphqlClient.getDappMarketplaceFees({ first: 20 }).catch((err) => {
        console.error('[admin] marketplace fees query error:', err);
        return null;
      });
      setMarketplaceFees(
        (mktResult?.edges ?? []).map((e: any) => ({
          listingId: e.node.listingId ?? '',
          coinType: e.node.coinType ?? '',
          totalFee: BigInt(e.node.totalFee ?? 0),
          treasuryAmount: BigInt(e.node.treasuryAmount ?? 0),
          dappAmount: BigInt(e.node.dappAmount ?? 0),
          updatedAtCheckpoint: e.node.updatedAtCheckpoint ?? ''
        }))
      );

      // ── Framework Treasury: address + SUI balance ────────────────────────
      // Treasury is a plain address; coins are transferred directly to it.
      // There is no "pending" on-chain object — the balance IS the claimable amount.
      try {
        const hubFields = await contract.getDappHubFields(hubId);
        if (
          hubFields.treasury &&
          hubFields.treasury !==
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        ) {
          const suiClient = (contract as any).suiInteractor?.currentClient;
          const balResp = suiClient
            ? await suiClient.getBalance({ owner: hubFields.treasury })
            : null;
          setFrameworkTreasury({
            address: hubFields.treasury,
            balance: BigInt(balResp?.totalBalance ?? 0)
          });
        }
      } catch {
        // best-effort
      }

      // ── Sui RPC: WritesSettled event history ──────────────────────────────
      // The indexer only stores the latest event via UPSERT; full history
      // comes from the SDK which wraps queryEvents directly.
      try {
        const events = await contract.queryWritesSettledEvents(30);
        setSettlementHistory(
          events.map((ev) => ({
            digest: ev.txDigest,
            account: ev.account,
            writes: ev.writes,
            paidCost: BigInt(ev.paidCost),
            timestampMs: ev.timestampMs
          }))
        );
      } catch (err) {
        console.error('[admin] Settlement history error:', err);
      }
    } catch (err) {
      console.error('admin fetchData error:', err);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, [contract, graphqlClient, storageId]);

  useEffect(() => {
    if (contract && graphqlClient) fetchData();
  }, [contract, graphqlClient, fetchData]);

  // ── Withdraw ───────────────────────────────────────────────────────────────

  const handleWithdraw = () => {
    if (!contract || !account) return;
    if (!revenueState || revenueState.dappRevenue === 0n) {
      toast.error('No revenue to withdraw');
      return;
    }
    setIsWithdrawing(true);
    const tx = new Transaction();
    tx.moveCall({
      target: `${contract.frameworkPackageId}::dapp_system::withdraw_dapp_revenue`,
      typeArguments: [contract.dappKey!, revenueState.coinType],
      arguments: [tx.object(hubId), tx.object(storageId)]
    });
    signAndExecuteTransaction(
      { transaction: (tx as any).serialize(), chain: `sui:${Network ?? 'testnet'}` },
      {
        onSuccess: (resp) => {
          toast.success('Revenue withdrawn successfully', {
            description: (
              <a
                href={
                  contract?.getTxExplorerUrl(resp.digest) ??
                  fallbackExplorerUrl(resp.digest, Network ?? 'testnet')
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
              >
                View TX ↗
              </a>
            )
          });
          setIsWithdrawing(false);
          setTimeout(fetchData, 1500);
        },
        onError: (e) => {
          toast.error(`Withdraw failed: ${e.message}`);
          setIsWithdrawing(false);
        }
      }
    );
  };

  // ── Computed values ────────────────────────────────────────────────────────

  const shareBps = feeState?.writeFeeDappShareBps ?? 0;
  // Framework treasury received = total_settled × (10000 - share_bps) / 10000
  const frameworkReceived = feeState
    ? (feeState.totalSettled * BigInt(10000 - shareBps)) / 10000n
    : 0n;
  // DApp accumulated from write fees = total_settled × share_bps / 10000
  const dappWriteFeeAccum = feeState ? (feeState.totalSettled * BigInt(shareBps)) / 10000n : 0n;

  const totalMarketTreasury = marketplaceFees.reduce((s, r) => s + r.treasuryAmount, 0n);
  const totalMarketDapp = marketplaceFees.reduce((s, r) => s + r.dappAmount, 0n);

  const settlementLabel = (mode: number) => (mode === 0 ? 'DAPP_SUBSIDIZES' : 'USER_PAYS');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ background: 'radial-gradient(ellipse at top, #1a2a3a 0%, #060c14 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin · Revenue</h1>
          <p className="text-sm text-white/40 mt-0.5">Framework pool, DApp pool and fee records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors disabled:opacity-40"
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
          <ConnectButton />
        </div>
      </div>

      {!account ? (
        <div className="text-center text-white/40 py-20">Connect wallet to view admin data</div>
      ) : isLoading && !feeState ? (
        <div className="text-center text-white/40 py-20">Loading…</div>
      ) : (
        <>
          {/* ── Write Fee Overview ─────────────────────────────────────── */}
          <SectionTitle>Write Fee Overview</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Settled (cumulative)"
              value={feeState ? formatMist(feeState.totalSettled) : '—'}
              sub="All write fees charged to users"
              accent="amber"
            />
            <StatCard
              label="Framework Treasury Received"
              value={formatMist(frameworkReceived)}
              sub={`${bpsToPercent(10000 - shareBps)} of total settled`}
              accent="blue"
            />
            <StatCard
              label="DApp Write Fee Accumulated"
              value={formatMist(dappWriteFeeAccum)}
              sub={`${bpsToPercent(shareBps)} share — set by framework admin`}
              accent={shareBps === 0 ? 'red' : 'green'}
            />
            <StatCard
              label="Settlement Mode"
              value={feeState ? settlementLabel(feeState.settlementMode) : '—'}
              sub={
                feeState?.settlementMode === 0
                  ? 'Operator pays from credit_pool'
                  : 'User pays per settlement'
              }
            />
          </div>

          {/* ── Framework Treasury ─────────────────────────────────────── */}
          <SectionTitle>Framework Treasury</SectionTitle>
          <div className="rounded-xl border border-blue-700/30 bg-blue-900/10 p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-white/40 mb-1">Treasury Address</p>
                {frameworkTreasury?.address ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-blue-300">
                      {shortAddr(frameworkTreasury.address)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(frameworkTreasury.address);
                        toast.success('Treasury address copied');
                      }}
                      title="Copy address"
                      className="text-blue-400/60 hover:text-blue-300 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span className="text-white/30 text-sm">Not configured</span>
                )}
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Treasury Balance (current)</p>
                <p className="text-lg font-semibold text-blue-300">
                  {frameworkTreasury ? formatMist(frameworkTreasury.balance) : '—'}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  Coins are transferred directly to this address — no separate claim step needed.
                </p>
              </div>
            </div>
          </div>

          {/* ── Credit Pool (DAPP_SUBSIDIZES) ───────────────────────────── */}
          <SectionTitle>Credit Pool</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Credit Pool Balance"
              value={feeState ? formatMist(feeState.creditPool) : '—'}
              sub={
                feeState?.settlementMode === 0
                  ? 'Active — deducted per settlement'
                  : 'Inactive in USER_PAYS mode'
              }
              accent={
                feeState && feeState.settlementMode === 0 && feeState.creditPool < MIST_PER_SUI
                  ? 'red'
                  : 'green'
              }
            />
            <StatCard
              label="Free Credit"
              value={feeState ? formatMist(feeState.freeCredit) : '—'}
              sub="Framework-granted free quota"
              accent="blue"
            />
            <StatCard
              label="DApp Status"
              value={runtimeState?.paused ? 'Paused' : 'Active'}
              accent={runtimeState?.paused ? 'red' : 'green'}
            />
          </div>

          {/* ── DApp Revenue Pool (USER_PAYS) ───────────────────────────── */}
          <SectionTitle>DApp Revenue (USER_PAYS collected)</SectionTitle>
          {shareBps === 0 && (
            <div className="mb-3 rounded-lg border border-amber-700/40 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-300">
              ⚠️ <strong>write_fee_dapp_share_bps = 0%</strong> — 100% of write fees go to the
              framework treasury. Contact the framework admin to increase your DApp revenue share.
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard
                label="Withdrawable Revenue"
                value={revenueState ? formatMist(revenueState.dappRevenue) : '0 SUI'}
                sub={revenueState?.coinType ?? 'SUI'}
                accent={revenueState && revenueState.dappRevenue > 0n ? 'green' : undefined}
              />
              <StatCard
                label="DApp Admin"
                value={runtimeState ? shortAddr(runtimeState.admin) : '—'}
                sub="Revenue is sent to this address on withdrawal"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !revenueState || revenueState.dappRevenue === 0n}
              className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap self-start"
            >
              {isWithdrawing ? 'Withdrawing…' : 'Withdraw Revenue'}
            </button>
          </div>

          {/* ── Fee Configuration ───────────────────────────────────────── */}
          <SectionTitle>Fee Configuration</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Base Fee / Write"
              value={
                feeState
                  ? feeState.baseFeePerWrite === 0n
                    ? 'Free'
                    : `${feeState.baseFeePerWrite.toLocaleString()} MIST`
                  : '—'
              }
            />
            <StatCard
              label="Bytes Fee / Byte"
              value={
                feeState
                  ? feeState.bytesFeePerByte === 0n
                    ? 'Free'
                    : `${feeState.bytesFeePerByte.toLocaleString()} MIST`
                  : '—'
              }
            />
            <StatCard
              label="DApp Write Fee Share"
              value={bpsToPercent(shareBps)}
              sub={`${shareBps} bps — framework admin controlled`}
              accent={shareBps === 0 ? 'red' : 'green'}
            />
          </div>

          {/* ── Settlement History (via Sui RPC) ────────────────────────── */}
          <SectionTitle>Settlement History — last 30 (dubhe_events::WritesSettled)</SectionTitle>
          {settlementHistory.length === 0 ? (
            <p className="text-white/30 text-sm">No settlement records found.</p>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm text-white/70">
                <thead>
                  <tr className="bg-white/5 text-left">
                    <th className="px-4 py-2 font-medium text-white/40">Time</th>
                    <th className="px-4 py-2 font-medium text-white/40">Account</th>
                    <th className="px-4 py-2 font-medium text-white/40">Writes</th>
                    <th className="px-4 py-2 font-medium text-amber-400/60">Paid Cost</th>
                    <th className="px-4 py-2 font-medium text-blue-400/60">→ Treasury</th>
                    <th className="px-4 py-2 font-medium text-emerald-400/60">→ DApp</th>
                    <th className="px-4 py-2 font-medium text-white/40">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementHistory.map((rec, i) => {
                    const toTreasury = (rec.paidCost * BigInt(10000 - shareBps)) / 10000n;
                    const toDapp = rec.paidCost - toTreasury;
                    return (
                      <tr
                        key={rec.digest + i}
                        className={`border-t border-white/5 ${
                          i % 2 === 0 ? '' : 'bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-2 text-xs opacity-50">
                          {rec.timestampMs ? new Date(rec.timestampMs).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{shortAddr(rec.account)}</td>
                        <td className="px-4 py-2">{rec.writes.toLocaleString()}</td>
                        <td className="px-4 py-2 text-amber-300">
                          {rec.paidCost === 0n ? 'free' : formatMist(rec.paidCost)}
                        </td>
                        <td className="px-4 py-2 text-blue-300">
                          {toTreasury === 0n ? '—' : formatMist(toTreasury)}
                        </td>
                        <td className="px-4 py-2 text-emerald-300">
                          {toDapp === 0n ? '—' : formatMist(toDapp)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs opacity-40">
                          {rec.digest ? rec.digest.slice(0, 8) + '…' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Marketplace Fees ────────────────────────────────────────── */}
          <SectionTitle>Marketplace Fees</SectionTitle>
          {marketplaceFees.length === 0 ? (
            <p className="text-white/30 text-sm">
              No marketplace fee records yet. Fees are recorded only when a listing is purchased
              (not on listing).
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard
                  label="DApp Total (last 20)"
                  value={formatMist(totalMarketDapp)}
                  accent="green"
                />
                <StatCard
                  label="Framework Treasury (last 20)"
                  value={formatMist(totalMarketTreasury)}
                  accent="blue"
                />
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm text-white/70">
                  <thead>
                    <tr className="bg-white/5 text-left">
                      <th className="px-4 py-2 font-medium text-white/40">Listing</th>
                      <th className="px-4 py-2 font-medium text-white/40">Total Fee</th>
                      <th className="px-4 py-2 font-medium text-emerald-400/60">DApp</th>
                      <th className="px-4 py-2 font-medium text-blue-400/60">Treasury</th>
                      <th className="px-4 py-2 font-medium text-white/40">Checkpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplaceFees.map((rec, i) => (
                      <tr
                        key={rec.listingId}
                        className={`border-t border-white/5 ${
                          i % 2 === 0 ? '' : 'bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-xs">{shortAddr(rec.listingId)}</td>
                        <td className="px-4 py-2">{formatMist(rec.totalFee)}</td>
                        <td className="px-4 py-2 text-emerald-400">{formatMist(rec.dappAmount)}</td>
                        <td className="px-4 py-2 text-blue-400">
                          {formatMist(rec.treasuryAmount)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs opacity-50">
                          {rec.updatedAtCheckpoint}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
