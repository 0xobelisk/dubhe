'use client';

/**
 * Arena management panel (game-specific admin).
 *
 * The Arena is an adminOnly ObjectStorage<Arena> created by deploy_hook.
 * It accumulates the 3% rake from every duel/brawl pot. Admin actions:
 *  - configure_arena: set display name + season
 *  - withdraw_rake:  move rake gold into the admin's own UserStorage
 *  - set_game_config: tune pack price / starting gold / rake / HP / timeout
 */

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import { toast } from 'sonner';

import { DappStorageId, PackageId, Network } from 'contracts/deployment';
import { fetchArenaObjectId } from '../lib/scenes';
import { decodeU8, decodeU64, decodeString } from '@0xobelisk/graphql-client';

interface ArenaInfo {
  objectId: string;
  name: string;
  season: number;
  gold: bigint;
}

interface GameConfig {
  packPrice: bigint;
  startingGold: bigint;
  rakeBps: bigint;
  maxHp: bigint;
  turnTimeoutMs: bigint;
}

export function ArenaPanel() {
  const account = useCurrentAccount();
  const { contract, graphqlClient, ecsWorld, dappStorageId, packageId } = useDubhe();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const storageId = dappStorageId ?? DappStorageId;
  const pkg = packageId ?? PackageId;

  const [arena, setArena] = useState<ArenaInfo | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [nameForm, setNameForm] = useState({ name: '', season: 1 });
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [cfgForm, setCfgForm] = useState({
    packPrice: 100,
    startingGold: 500,
    rakeBps: 300,
    maxHp: 30,
    turnTimeoutMs: 300000
  });

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchArena = useCallback(async () => {
    if (!graphqlClient) return;
    try {
      const objectId = await fetchArenaObjectId(graphqlClient);
      if (!objectId) return;
      const result = await graphqlClient.getAllTables('dubheObjectStorageField', {
        first: 20,
        fields: ['objectId', 'fieldName', 'fieldValueRaw', 'isDeleted'],
        // System views only carry checkpoint columns; the default orderBy
        // (updatedAtTimestampMs) does not exist on them.
        orderBy: [{ field: 'updatedAtCheckpoint', direction: 'DESC' }],
        filter: { objectId: { equalTo: objectId }, isDeleted: { equalTo: false } }
      });
      const fields: Record<string, string> = {};
      (result?.edges ?? []).forEach((e: any) => {
        fields[e.node.fieldName] = e.node.fieldValueRaw;
      });
      setArena({
        objectId,
        name: fields.name ? decodeString(fields.name) : '',
        season: fields.season ? decodeU8(fields.season) : 0,
        gold: fields.gold ? decodeU64(fields.gold) : 0n
      });
    } catch (err) {
      console.error('[admin] arena fetch error:', err);
    }
  }, [graphqlClient]);

  const fetchConfig = useCallback(async () => {
    if (!ecsWorld) return;
    try {
      // global resource — singleton, no entity key
      const result = await graphqlClient?.getAllTables<any>('gameConfig', { first: 1 });
      const node = result?.edges?.[0]?.node;
      if (node) {
        const cfg = {
          packPrice: BigInt(node.packPrice ?? 0),
          startingGold: BigInt(node.startingGold ?? 0),
          rakeBps: BigInt(node.rakeBps ?? 0),
          maxHp: BigInt(node.maxHp ?? 0),
          turnTimeoutMs: BigInt(node.turnTimeoutMs ?? 0)
        };
        setConfig(cfg);
        setCfgForm({
          packPrice: Number(cfg.packPrice),
          startingGold: Number(cfg.startingGold),
          rakeBps: Number(cfg.rakeBps),
          maxHp: Number(cfg.maxHp),
          turnTimeoutMs: Number(cfg.turnTimeoutMs)
        });
      }
    } catch (err) {
      console.error('[admin] config fetch error:', err);
    }
  }, [ecsWorld, graphqlClient]);

  useEffect(() => {
    fetchArena();
    fetchConfig();
  }, [fetchArena, fetchConfig]);

  // ── Tx helper ───────────────────────────────────────────────────────────────

  const exec = async (buildFn: (tx: Transaction) => void | Promise<void>, msg: string) => {
    if (!account) {
      toast.error('Connect wallet first');
      return;
    }
    setIsLoading(true);
    try {
      const tx = new Transaction();
      await buildFn(tx);
      await signAndExecuteTransaction(
        { transaction: tx.serialize() as any, chain: `sui:${Network ?? 'localnet'}` },
        {
          onSuccess: () => {
            toast.success(msg);
            setTimeout(() => {
              fetchArena();
              fetchConfig();
            }, 1500);
          },
          onError: (err) => toast.error(`Transaction failed: ${err.message}`)
        }
      );
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = () =>
    exec((tx) => {
      if (!arena) throw new Error('Arena not found');
      tx.moveCall({
        target: `${pkg}::arena_system::configure_arena`,
        arguments: [
          tx.object(storageId),
          tx.object(arena.objectId),
          tx.pure.string(nameForm.name),
          tx.pure.u8(nameForm.season)
        ]
      });
    }, 'Arena configured');

  const handleWithdraw = async () => {
    if (!arena || !contract || !account) return;
    const userStorageId = await contract.getUserStorageId(account.address).catch(() => null);
    if (!userStorageId) {
      toast.error('Admin must have a registered UserStorage to receive gold');
      return;
    }
    exec((tx) => {
      tx.moveCall({
        target: `${pkg}::arena_system::withdraw_rake`,
        arguments: [
          tx.object(storageId),
          tx.object(arena.objectId),
          tx.object(userStorageId),
          tx.pure.u64(withdrawAmount)
        ]
      });
    }, `Withdrew ${withdrawAmount} gold rake`);
  };

  const handleSetConfig = () =>
    exec((tx) => {
      tx.moveCall({
        target: `${pkg}::arena_system::set_game_config`,
        arguments: [
          tx.object(storageId),
          tx.pure.u64(cfgForm.packPrice),
          tx.pure.u64(cfgForm.startingGold),
          tx.pure.u64(cfgForm.rakeBps),
          tx.pure.u64(cfgForm.maxHp),
          tx.pure.u64(cfgForm.turnTimeoutMs)
        ]
      });
    }, 'Game config updated');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mt-8 mb-3">
        Arena Treasury (ObjectStorage)
      </h2>
      {!arena ? (
        <p className="text-white/30 text-sm">Arena object not found in the indexer yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status */}
          <div className="rounded-xl border border-amber-700/30 bg-amber-900/10 p-4 space-y-2">
            <p className="text-xs text-white/40">Arena Object</p>
            <p className="font-mono text-xs text-amber-300">{arena.objectId.slice(0, 20)}…</p>
            <p className="text-lg font-semibold text-amber-300">
              {arena.gold.toLocaleString()} gold rake
            </p>
            <p className="text-xs text-white/30">
              {arena.name || '(unnamed)'} · Season {arena.season}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min={0}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="flex-1 bg-black/30 border border-amber-800/40 text-amber-200 rounded-lg px-2 py-1.5 text-xs"
              />
              <button
                onClick={handleWithdraw}
                disabled={isLoading || withdrawAmount <= 0 || BigInt(withdrawAmount) > arena.gold}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs disabled:opacity-40 transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Configure name/season */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
            <p className="text-xs text-white/40">Configure Arena (admin only)</p>
            <input
              value={nameForm.name}
              onChange={(e) => setNameForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Arena name"
              className="w-full bg-black/30 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              min={0}
              max={255}
              value={nameForm.season}
              onChange={(e) => setNameForm((f) => ({ ...f, season: Number(e.target.value) }))}
              placeholder="Season"
              className="w-full bg-black/30 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs"
            />
            <button
              onClick={handleConfigure}
              disabled={isLoading || !nameForm.name}
              className="w-full py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs disabled:opacity-40 transition-colors"
            >
              Save
            </button>
          </div>

          {/* Game config */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
            <p className="text-xs text-white/40">
              Game Config{' '}
              {config && <span className="text-emerald-400/60">(loaded from chain)</span>}
            </p>
            {(
              [
                ['packPrice', 'Pack price'],
                ['startingGold', 'Starting gold'],
                ['rakeBps', 'Rake (bps)'],
                ['maxHp', 'Max HP'],
                ['turnTimeoutMs', 'Turn timeout (ms)']
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-white/30 text-[10px] w-28">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={cfgForm[key]}
                  onChange={(e) => setCfgForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                  className="flex-1 bg-black/30 border border-white/10 text-white rounded-lg px-2 py-1 text-xs"
                />
              </div>
            ))}
            <button
              onClick={handleSetConfig}
              disabled={isLoading}
              className="w-full py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs disabled:opacity-40 transition-colors"
            >
              Update Config
            </button>
          </div>
        </div>
      )}
    </>
  );
}
