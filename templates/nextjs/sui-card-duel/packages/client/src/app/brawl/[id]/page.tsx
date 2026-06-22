'use client';

/**
 * Brawl page — multiplayer free-for-all inside a SceneStorage<Brawl>.
 *
 * Demonstrates:
 *  - open-invitation ScenePermit (join/leave while the room is open)
 *  - turn rotation across N players with eliminations
 *  - attacking ANY alive player via reactive writes (pick a target)
 *  - last-player-standing pot settlement
 */

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useGame } from '../../hooks/useGame';
import { GameShell } from '../../components/GameShell';
import { CardView } from '../../components/CardView';
import { IconGold, IconSkull } from '../../components/icons';
import { fetchBrawlById, fetchArenaObjectId, type BrawlScene } from '../../lib/scenes';
import {
  STATE_WAITING,
  STATE_ACTIVE,
  STATE_FINISHED,
  isAttackKind,
  shortAddr
} from '../../lib/game';
import { ZERO_ADDRESS } from '@0xobelisk/graphql-client';

const CLOCK = '0x6';
const MAX_HP = 30n;

interface PlayerVitals {
  hp: bigint;
  shield: bigint;
  matchId: string;
}

export default function BrawlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sceneId } = use(params);
  const game = useGame(5000);
  // In-match actions are session-friendly: contracts resolve the player
  // identity from UserStorage's canonical owner, so execTx silently signs
  // with the session key when one is active.
  const {
    account,
    contract,
    ecsWorld,
    graphqlClient,
    player,
    userStorageId,
    storageId,
    pkg,
    execTx,
    isLoading
  } = game;

  const [brawl, setBrawl] = useState<BrawlScene | null>(null);
  const [vitals, setVitals] = useState<Record<string, PlayerVitals>>({});
  const [arenaId, setArenaId] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const storageIdCache = useRef<Record<string, string>>({});

  const me = account?.address ?? '';

  // ── Polling (2.5 s) ─────────────────────────────────────────────────────────

  const fetchMatch = useCallback(async () => {
    if (!graphqlClient) return;
    try {
      const b = await fetchBrawlById(graphqlClient, sceneId);
      if (!b) {
        setNotFound(true);
        return;
      }
      setBrawl(b);
    } catch (err) {
      console.error('[brawl] fetch error:', err);
    }
  }, [graphqlClient, sceneId]);

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 2500);
    return () => clearInterval(interval);
  }, [fetchMatch]);

  // Vitals of every player (battle_state per address)
  const playersKey = brawl?.players.join(',') ?? '';
  useEffect(() => {
    if (!ecsWorld || !brawl) return;
    let cancelled = false;
    const poll = async () => {
      const entries = await Promise.all(
        brawl.players.map(async (addr) => {
          const b = await ecsWorld
            .getComponent<{ matchId: string; hp: string; shield: string }>(addr, 'battleState')
            .catch(() => null);
          return [
            addr,
            b
              ? { hp: BigInt(b.hp ?? 0), shield: BigInt(b.shield ?? 0), matchId: String(b.matchId) }
              : { hp: 0n, shield: 0n, matchId: ZERO_ADDRESS }
          ] as const;
        })
      );
      if (!cancelled) setVitals(Object.fromEntries(entries));
    };
    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecsWorld, sceneId, playersKey]);

  useEffect(() => {
    if (!graphqlClient) return;
    fetchArenaObjectId(graphqlClient)
      .then(setArenaId)
      .catch(() => {});
  }, [graphqlClient]);

  const resolveStorageId = useCallback(
    async (addr: string): Promise<string> => {
      if (storageIdCache.current[addr]) return storageIdCache.current[addr];
      if (!contract) throw new Error('Contract not ready');
      const id = await contract.getUserStorageId(addr);
      storageIdCache.current[addr] = id;
      return id;
    },
    [contract]
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  const simpleCall = (fn: string, msg: string, extra: 'clock' | 'none' = 'none') => {
    if (!brawl) return;
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      const args = [
        tx.object(storageId),
        tx.object(userStorageId),
        tx.object(brawl.permitId),
        tx.object(brawl.sceneId)
      ];
      if (extra === 'clock') args.push(tx.object(CLOCK));
      tx.moveCall({ target: `${pkg}::brawl_system::${fn}`, arguments: args });
    }, msg);
  };

  const handleStart = () => {
    if (!brawl) return;
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::brawl_system::start_brawl`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(brawl.permitId),
          tx.object(brawl.sceneId),
          tx.object(CLOCK)
        ]
      });
    }, 'Brawl started — fight!');
  };

  const playCard = async (cardId: string, kind: number) => {
    if (!brawl) return;
    if (isAttackKind(kind)) {
      if (!target) {
        toast.error('Pick a target first (click an opponent panel)');
        return;
      }
      let targetStorageId: string;
      try {
        targetStorageId = await resolveStorageId(target);
      } catch {
        toast.error('Could not resolve target storage');
        return;
      }
      execTx((tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::brawl_system::brawl_attack`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.object(targetStorageId),
            tx.object(brawl.permitId),
            tx.object(brawl.sceneId),
            tx.pure.address(cardId),
            tx.object(CLOCK)
          ]
        });
      }, `Attacked ${shortAddr(target)}!`);
    } else {
      execTx((tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::brawl_system::brawl_defend`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.object(brawl.permitId),
            tx.object(brawl.sceneId),
            tx.pure.address(cardId),
            tx.object(CLOCK)
          ]
        });
      }, 'Defense played!');
    }
  };

  const handleTimeoutKick = async () => {
    if (!brawl) return;
    const stalling = brawl.alive[brawl.turnIndex];
    let targetStorageId: string;
    try {
      targetStorageId = await resolveStorageId(stalling);
    } catch {
      toast.error('Could not resolve stalling player storage');
      return;
    }
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::brawl_system::brawl_timeout_kick`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(targetStorageId),
          tx.object(brawl.permitId),
          tx.object(brawl.sceneId),
          tx.object(CLOCK)
        ]
      });
    }, `Kicked ${shortAddr(stalling)} for stalling!`);
  };

  const handleFinish = () => {
    if (!brawl) return;
    if (!arenaId) {
      toast.error('Arena object not resolved yet');
      return;
    }
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::brawl_system::finish_brawl`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(brawl.permitId),
          tx.object(brawl.sceneId),
          tx.object(arenaId)
        ]
      });
    }, 'Pot collected — last one standing!');
  };

  const handleLeaveFinished = () => {
    if (!brawl) return;
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::brawl_system::leave_finished_brawl`,
        arguments: [tx.object(brawl.permitId), tx.object(brawl.sceneId), tx.object(userStorageId)]
      });
    }, 'Left the brawl.');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <GameShell game={game}>
        <CenterNote text="Brawl not found (it may have been cleaned up)." backHref="/" />
      </GameShell>
    );
  }
  if (!brawl) {
    return (
      <GameShell game={game}>
        <CenterNote text="Loading brawl…" />
      </GameShell>
    );
  }

  const isHost = brawl.host === me;
  const joined = brawl.players.includes(me);
  const amAlive = brawl.alive.includes(me);
  const currentTurnAddr = brawl.alive[brawl.turnIndex] ?? ZERO_ADDRESS;
  const myTurn = brawl.state === STATE_ACTIVE && currentTurnAddr === me;
  const iWon = brawl.state === STATE_FINISHED && brawl.winner === me;
  const potClaimed = brawl.state === STATE_FINISHED && brawl.winner === ZERO_ADDRESS;

  return (
    <GameShell game={game}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Status banner */}
        <div className="flex items-center justify-between bg-slate-950/80 border-2 border-purple-800 rounded-2xl px-5 py-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <IconSkull size={22} />
            <div>
              <p className="font-pixel text-purple-200 text-xs">
                Brawl · {brawl.players.length}/{brawl.maxPlayers} players ·{' '}
                {brawl.state === STATE_WAITING
                  ? 'Room open'
                  : brawl.state === STATE_ACTIVE
                  ? myTurn
                    ? 'YOUR TURN'
                    : `${shortAddr(currentTurnAddr)}'s turn`
                  : 'Finished'}
              </p>
              <p className="text-purple-600 text-[11px] mt-0.5 flex items-center gap-1">
                Pot <IconGold size={11} /> {brawl.gold.toString()} · entry{' '}
                {brawl.entryFee.toString()} · round {brawl.round}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {brawl.state === STATE_WAITING && isHost && (
              <>
                <button
                  onClick={handleStart}
                  disabled={isLoading || brawl.players.length < 2}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                >
                  Start ({brawl.players.length} in)
                </button>
                <button
                  onClick={() => simpleCall('cancel_brawl', 'Room cancelled, fee refunded.')}
                  disabled={isLoading || brawl.players.length > 1}
                  title={brawl.players.length > 1 ? 'Players must leave first' : undefined}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                >
                  Cancel Room
                </button>
              </>
            )}
            {brawl.state === STATE_WAITING && joined && !isHost && (
              <button
                onClick={() => simpleCall('leave_brawl', 'Left the room, fee refunded.')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
              >
                Leave Room
              </button>
            )}
            {brawl.state === STATE_WAITING && !joined && (
              <button
                onClick={() => simpleCall('join_brawl', 'Joined the brawl!')}
                disabled={
                  isLoading ||
                  brawl.players.length >= brawl.maxPlayers ||
                  player.gold < brawl.entryFee
                }
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
              >
                Join (entry {brawl.entryFee.toString()})
              </button>
            )}
            {brawl.state === STATE_ACTIVE && amAlive && (
              <>
                {!myTurn && (
                  <button
                    onClick={handleTimeoutKick}
                    disabled={isLoading}
                    title="Removes the current-turn player once they stall past the timeout"
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Kick Staller
                  </button>
                )}
                <button
                  onClick={() => simpleCall('brawl_surrender', 'You dropped out.', 'clock')}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                >
                  Surrender
                </button>
              </>
            )}
          </div>
        </div>

        {/* Player grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {brawl.players.map((addr) => {
            const v = vitals[addr];
            const alive = brawl.alive.includes(addr) || brawl.state === STATE_WAITING;
            const isTurn = brawl.state === STATE_ACTIVE && currentTurnAddr === addr;
            const isMe = addr === me;
            const targetable =
              brawl.state === STATE_ACTIVE && myTurn && !isMe && brawl.alive.includes(addr);
            const inThisMatch = v?.matchId === brawl.sceneId;
            const pct = v && inThisMatch ? Math.min(100, Number((v.hp * 100n) / MAX_HP)) : 0;
            return (
              <button
                key={addr}
                type="button"
                onClick={targetable ? () => setTarget(addr) : undefined}
                className={`text-left rounded-xl border-2 p-3 transition-colors ${
                  target === addr && targetable
                    ? 'border-red-500 bg-red-950/40'
                    : isTurn
                    ? 'border-amber-500 bg-amber-950/30'
                    : 'border-purple-900/60 bg-slate-950/60'
                } ${!alive ? 'opacity-40 grayscale' : ''} ${
                  targetable ? 'cursor-crosshair hover:border-red-400' : 'cursor-default'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-pixel text-[10px] text-purple-200">
                    {isMe ? 'You' : shortAddr(addr)}
                    {addr === brawl.host && <span className="text-purple-500"> ♔</span>}
                  </span>
                  {!alive && brawl.state !== STATE_WAITING && <IconSkull size={14} />}
                </div>
                {brawl.state !== STATE_WAITING && v && inThisMatch ? (
                  <>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full ${
                          pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px]">
                      <span className="text-emerald-400 font-pixel">{v.hp.toString()} HP</span>
                      {v.shield > 0n && (
                        <span className="text-sky-400 font-pixel">🛡 {v.shield.toString()}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-600 text-[10px]">
                    {brawl.state === STATE_WAITING ? 'ready' : 'out'}
                  </p>
                )}
                {targetable && (
                  <p className="text-red-400 text-[9px] font-pixel mt-1">
                    {target === addr ? '◎ TARGET' : 'click to target'}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Finished: settlement */}
        {brawl.state === STATE_FINISHED && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-950/80 border-2 border-amber-700 rounded-2xl p-6 text-center space-y-3"
          >
            <p className="font-pixel text-amber-300 text-sm">
              {potClaimed
                ? 'Brawl settled.'
                : iWon
                ? '🏆 LAST ONE STANDING!'
                : brawl.winner !== ZERO_ADDRESS
                ? `${shortAddr(brawl.winner)} wins the pot`
                : 'Brawl over'}
            </p>
            {iWon && (
              <button
                onClick={handleFinish}
                disabled={isLoading || !arenaId}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-pixel rounded-xl disabled:opacity-40 transition-colors"
              >
                Collect Pot ({brawl.gold.toString()} gold, 3% arena rake)
              </button>
            )}
            {!iWon && joined && (
              <button
                onClick={handleLeaveFinished}
                disabled={isLoading}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-pixel rounded-xl disabled:opacity-40 transition-colors"
              >
                Leave Brawl
              </button>
            )}
            <p>
              <a href="/" className="text-indigo-500 hover:text-indigo-300 text-[11px] underline">
                ← Back to lobby
              </a>
            </p>
          </motion.div>
        )}

        {/* Hand */}
        {brawl.state === STATE_ACTIVE && amAlive && (
          <div className="bg-slate-950/60 border border-purple-900/60 rounded-2xl p-4">
            <h2 className="font-pixel text-purple-400 text-xs mb-3">
              Your Hand{' '}
              {myTurn
                ? target
                  ? `— attacking ${shortAddr(target)}`
                  : '— pick a target, then a card'
                : '(waiting for your turn)'}
            </h2>
            <div className="flex flex-wrap gap-3">
              {player.deck.map((id) => {
                const card = player.cards.find((c) => c.cardId === id);
                if (!card) return null;
                return (
                  <CardView
                    key={id}
                    card={card}
                    disabled={!myTurn || isLoading || (isAttackKind(card.kind) && !target)}
                    onClick={() => playCard(id, card.kind)}
                  />
                );
              })}
            </div>
            <p className="text-purple-800 text-[10px] mt-3">
              Brawl cards are reusable every turn. Attack any alive player — eliminations rotate the
              turn order.
            </p>
          </div>
        )}

        {brawl.state === STATE_WAITING && (
          <CenterNote
            text={
              isHost
                ? 'Share this page URL — anyone can join your room from the lobby.'
                : joined
                ? 'Waiting for the host to start…'
                : 'Room is open — join from the banner above.'
            }
          />
        )}
      </div>
    </GameShell>
  );
}

function CenterNote({ text, backHref }: { text: string; backHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-indigo-500 font-pixel text-xs">{text}</p>
      {backHref && (
        <a href={backHref} className="text-indigo-600 hover:text-indigo-400 text-[11px] underline">
          ← Back to lobby
        </a>
      )}
    </div>
  );
}
