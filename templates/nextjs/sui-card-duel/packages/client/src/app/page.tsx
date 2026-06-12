'use client';

/**
 * Lobby — match discovery and creation.
 *
 * Demonstrates indexer-driven discovery of SceneStorage / ScenePermit objects:
 *  - incoming duel invitations (direct-invitation permits targeting you)
 *  - open brawl rooms (open-invitation permits anyone can join)
 *  - your active match (battle_state.match_id → scene route)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useGame } from './hooks/useGame';
import { GameShell } from './components/GameShell';
import { IconSword, IconGold, IconSkull } from './components/icons';
import {
  fetchDuels,
  fetchBrawls,
  fetchSceneType,
  type DuelScene,
  type BrawlScene
} from './lib/scenes';
import { STATE_WAITING, STATE_ACTIVE, shortAddr } from './lib/game';
import { ZERO_ADDRESS } from '@0xobelisk/graphql-client';

const CLOCK = '0x6';

export default function LobbyPage() {
  const game = useGame(5000);
  // Match lifecycle actions are session-friendly: the contracts resolve the
  // player identity from UserStorage's canonical owner, so an active session
  // key can silently sign create / accept / join / cancel (execTx falls back
  // to the main wallet when no session is active).
  const { account, graphqlClient, player, userStorageId, storageId, pkg, execTx, isLoading } = game;

  const [duels, setDuels] = useState<DuelScene[]>([]);
  const [brawls, setBrawls] = useState<BrawlScene[]>([]);
  const [activeMatchType, setActiveMatchType] = useState<string | null>(null);

  const [duelForm, setDuelForm] = useState({ opponent: '', stake: 100 });
  const [brawlForm, setBrawlForm] = useState({ entryFee: 50, maxPlayers: 4 });

  // ── Discovery (indexer poll) ────────────────────────────────────────────────

  const fetchLobby = useCallback(async () => {
    if (!graphqlClient) return;
    try {
      const [d, b] = await Promise.all([fetchDuels(graphqlClient), fetchBrawls(graphqlClient)]);
      setDuels(d);
      setBrawls(b);
    } catch (err) {
      console.error('[lobby] fetch error:', err);
    }
  }, [graphqlClient]);

  useEffect(() => {
    fetchLobby();
    const interval = setInterval(fetchLobby, 3000);
    return () => clearInterval(interval);
  }, [fetchLobby]);

  // Resolve the route of my active match (duel or brawl scene?)
  const myMatchId = player.battle.matchId;
  const inMatch = myMatchId !== ZERO_ADDRESS;
  useEffect(() => {
    if (!inMatch || !graphqlClient) {
      setActiveMatchType(null);
      return;
    }
    fetchSceneType(graphqlClient, myMatchId)
      .then(setActiveMatchType)
      .catch(() => setActiveMatchType(null));
  }, [inMatch, myMatchId, graphqlClient]);

  // ── Derived lists ───────────────────────────────────────────────────────────

  const me = account?.address ?? '';
  const incomingInvites = duels.filter((d) => d.state === STATE_WAITING && d.opponent === me);
  const myPendingInvite = duels.find((d) => d.state === STATE_WAITING && d.challenger === me);
  const openBrawls = brawls.filter((b) => b.state === STATE_WAITING);
  const liveMatches = [
    ...duels.filter((d) => d.state === STATE_ACTIVE),
    ...brawls.filter((b) => b.state === STATE_ACTIVE)
  ].length;

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleCreateDuel = () => {
    if (!duelForm.opponent.startsWith('0x') || duelForm.opponent.length < 10) {
      toast.error('Enter a valid opponent address');
      return;
    }
    if (duelForm.stake <= 0) {
      toast.error('Stake must be greater than zero');
      return;
    }
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::create_duel`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.address(duelForm.opponent),
          tx.pure.u64(duelForm.stake),
          tx.object(CLOCK)
        ]
      });
    }, `Duel invitation sent (stake ${duelForm.stake} gold)`);
  };

  const handleAcceptDuel = (d: DuelScene) =>
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::accept_duel`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(d.permitId),
          tx.object(d.sceneId),
          tx.object(CLOCK)
        ]
      });
    }, 'Duel accepted — fight!');

  const handleCancelDuel = (d: DuelScene) =>
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::cancel_duel`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(d.permitId),
          tx.object(d.sceneId)
        ]
      });
    }, 'Invitation cancelled, stake refunded.');

  const handleCreateBrawl = () => {
    if (brawlForm.maxPlayers < 2 || brawlForm.maxPlayers > 8) {
      toast.error('Max players must be between 2 and 8');
      return;
    }
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::brawl_system::create_brawl`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u64(brawlForm.entryFee),
          tx.pure.u64(brawlForm.maxPlayers),
          tx.object(CLOCK)
        ]
      });
    }, 'Brawl room opened — waiting for players.');
  };

  const handleJoinBrawl = (b: BrawlScene) =>
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::brawl_system::join_brawl`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(b.permitId),
          tx.object(b.sceneId)
        ]
      });
    }, 'Joined the brawl room!');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <GameShell game={game}>
      {/* Active match banner */}
      {inMatch && (
        <motion.a
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          href={activeMatchType ? `/${activeMatchType}/${myMatchId}` : '#'}
          className="mb-6 flex items-center justify-between bg-red-950/60 border-2 border-red-700 rounded-2xl px-5 py-4 hover:bg-red-900/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <IconSword size={28} />
            <div>
              <p className="font-pixel text-red-300 text-xs">You are in a match!</p>
              <p className="text-red-500 text-xs mt-1">
                HP {player.battle.hp.toString()} · Shield {player.battle.shield.toString()} ·{' '}
                {shortAddr(myMatchId)}
              </p>
            </div>
          </div>
          <span className="font-pixel text-red-300 text-xs">
            {activeMatchType ? 'Enter →' : 'Locating…'}
          </span>
        </motion.a>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: create forms ── */}
        <div className="space-y-4">
          <div className="bg-slate-950/80 border-2 border-indigo-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-pixel text-indigo-300 text-xs flex items-center gap-2">
              <IconSword size={16} /> Challenge a Duelist (1v1)
            </h2>
            <p className="text-indigo-700 text-[11px]">
              Direct invitation — only the address you challenge can accept. Your stake is escrowed
              in the match scene until it resolves.
            </p>
            <input
              value={duelForm.opponent}
              onChange={(e) => setDuelForm((f) => ({ ...f, opponent: e.target.value.trim() }))}
              placeholder="Opponent address (0x…)"
              className="w-full bg-indigo-950/40 border border-indigo-800 text-indigo-200 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={duelForm.stake}
                onChange={(e) => setDuelForm((f) => ({ ...f, stake: Number(e.target.value) }))}
                className="flex-1 bg-indigo-950/40 border border-indigo-800 text-indigo-200 rounded-lg px-3 py-2 text-xs"
              />
              <span className="text-amber-400 text-xs font-pixel flex items-center gap-1">
                <IconGold size={12} /> stake
              </span>
            </div>
            <button
              onClick={handleCreateDuel}
              disabled={isLoading || inMatch || player.gold < BigInt(duelForm.stake)}
              className="w-full py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
            >
              {inMatch ? 'Already in a match' : 'Send Challenge'}
            </button>
          </div>

          <div className="bg-slate-950/80 border-2 border-purple-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-pixel text-purple-300 text-xs flex items-center gap-2">
              <IconSkull size={16} /> Host a Brawl (1vN)
            </h2>
            <p className="text-purple-700 text-[11px]">
              Open invitation — anyone can join until the room is full. Last player standing takes
              the whole pot.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-purple-500 text-[10px] font-pixel w-20">Entry fee</label>
              <input
                type="number"
                min={0}
                value={brawlForm.entryFee}
                onChange={(e) => setBrawlForm((f) => ({ ...f, entryFee: Number(e.target.value) }))}
                className="flex-1 bg-purple-950/40 border border-purple-800 text-purple-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-purple-500 text-[10px] font-pixel w-20">Max players</label>
              <input
                type="number"
                min={2}
                max={8}
                value={brawlForm.maxPlayers}
                onChange={(e) =>
                  setBrawlForm((f) => ({ ...f, maxPlayers: Number(e.target.value) }))
                }
                className="flex-1 bg-purple-950/40 border border-purple-800 text-purple-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <button
              onClick={handleCreateBrawl}
              disabled={isLoading || inMatch || player.gold < BigInt(brawlForm.entryFee)}
              className="w-full py-2 bg-purple-800 hover:bg-purple-700 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
            >
              {inMatch ? 'Already in a match' : 'Open Room'}
            </button>
          </div>

          {/* Stats */}
          <div className="bg-slate-950/60 border border-indigo-900/60 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-pixel text-indigo-200 text-sm">{player.profile?.wins ?? 0}</p>
              <p className="text-indigo-600 text-[10px]">Wins</p>
            </div>
            <div>
              <p className="font-pixel text-indigo-200 text-sm">{player.profile?.losses ?? 0}</p>
              <p className="text-indigo-600 text-[10px]">Losses</p>
            </div>
            <div>
              <p className="font-pixel text-indigo-200 text-sm">{liveMatches}</p>
              <p className="text-indigo-600 text-[10px]">Live matches</p>
            </div>
          </div>
        </div>

        {/* ── Right: invites + rooms ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incoming invites */}
          <section>
            <h2 className="font-pixel text-red-400 text-xs mb-3">Duel Invitations for You</h2>
            {incomingInvites.length === 0 ? (
              <EmptyState text="No incoming challenges. Share your address with a friend!" />
            ) : (
              <div className="space-y-2">
                {incomingInvites.map((d) => (
                  <motion.div
                    key={d.sceneId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="font-pixel text-red-200 text-xs">
                        {shortAddr(d.challenger)} challenges you!
                      </p>
                      <p className="text-red-600 text-[11px] mt-0.5 flex items-center gap-1">
                        Stake <IconGold size={11} /> {d.stake.toString()} each — winner takes the
                        pot
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptDuel(d)}
                      disabled={isLoading || inMatch || player.gold < d.stake}
                      className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
                    >
                      Accept
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* My pending invite */}
          {myPendingInvite && (
            <section>
              <h2 className="font-pixel text-amber-400 text-xs mb-3">Your Pending Challenge</h2>
              <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3">
                <p className="text-amber-300 text-xs">
                  Waiting for {shortAddr(myPendingInvite.opponent)} to accept ·{' '}
                  {myPendingInvite.stake.toString()} gold staked
                </p>
                <button
                  onClick={() => handleCancelDuel(myPendingInvite)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
                >
                  Cancel & Refund
                </button>
              </div>
            </section>
          )}

          {/* Open brawls */}
          <section>
            <h2 className="font-pixel text-purple-400 text-xs mb-3">Open Brawl Rooms</h2>
            {openBrawls.length === 0 ? (
              <EmptyState text="No open rooms. Host one and invite the world!" />
            ) : (
              <div className="space-y-2">
                {openBrawls.map((b) => {
                  const joined = b.players.includes(me);
                  const isHost = b.host === me;
                  return (
                    <motion.div
                      key={b.sceneId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between bg-purple-950/40 border border-purple-800/50 rounded-xl px-4 py-3 flex-wrap gap-2"
                    >
                      <div>
                        <p className="font-pixel text-purple-200 text-xs">
                          {shortAddr(b.host)}&apos;s room · {b.players.length}/{b.maxPlayers}{' '}
                          players
                        </p>
                        <p className="text-purple-600 text-[11px] mt-0.5 flex items-center gap-1">
                          Entry <IconGold size={11} /> {b.entryFee.toString()} · pot{' '}
                          {b.gold.toString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {joined ? (
                          <a
                            href={`/brawl/${b.sceneId}`}
                            className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-pixel rounded-lg transition-colors"
                          >
                            {isHost ? 'Manage Room' : 'Enter Room'}
                          </a>
                        ) : (
                          <button
                            onClick={() => handleJoinBrawl(b)}
                            disabled={
                              isLoading ||
                              inMatch ||
                              b.players.length >= b.maxPlayers ||
                              player.gold < b.entryFee
                            }
                            className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </GameShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-slate-950/40 border border-indigo-900/40 rounded-xl p-6 text-center">
      <p className="text-indigo-700 font-pixel text-[11px]">{text}</p>
    </div>
  );
}
