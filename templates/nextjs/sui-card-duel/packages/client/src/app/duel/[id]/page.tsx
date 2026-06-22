'use client';

/**
 * Duel page — 1v1 turn-based combat inside a SceneStorage<Duel>.
 *
 * Demonstrates:
 *  - reactive cross-user writes (your attack reduces the OPPONENT's battle_state)
 *  - scene-field turn enforcement (turn_addr) and per-match card usage
 *  - stake escrow + settlement (pot → winner, rake → arena ObjectStorage)
 */

import { useState, useEffect, useCallback, use } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useGame } from '../../hooks/useGame';
import { GameShell } from '../../components/GameShell';
import { CardView } from '../../components/CardView';
import { IconGold, IconSword } from '../../components/icons';
import { fetchDuelById, fetchArenaObjectId, type DuelScene } from '../../lib/scenes';
import {
  STATE_WAITING,
  STATE_ACTIVE,
  STATE_FINISHED,
  isAttackKind,
  shortAddr,
  type BattleStateData
} from '../../lib/game';
import { ZERO_ADDRESS } from '@0xobelisk/graphql-client';

const CLOCK = '0x6';
const MAX_HP = 30n; // mirrors deploy_hook default (display only)

export default function DuelPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [duel, setDuel] = useState<DuelScene | null>(null);
  const [oppBattle, setOppBattle] = useState<BattleStateData | null>(null);
  const [oppStorageId, setOppStorageId] = useState<string | null>(null);
  const [arenaId, setArenaId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const me = account?.address ?? '';
  const opponent = duel ? (duel.challenger === me ? duel.opponent : duel.challenger) : '';
  const iAmChallenger = duel?.challenger === me;
  const myUsedCards = duel ? (iAmChallenger ? duel.usedCardsA : duel.usedCardsB) : [];

  // ── Fast match polling (2.5 s) ──────────────────────────────────────────────

  const fetchMatch = useCallback(async () => {
    if (!graphqlClient) return;
    try {
      const d = await fetchDuelById(graphqlClient, sceneId);
      if (!d) {
        setNotFound(true);
        return;
      }
      setDuel(d);
    } catch (err) {
      console.error('[duel] fetch error:', err);
    }
  }, [graphqlClient, sceneId]);

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 2500);
    return () => clearInterval(interval);
  }, [fetchMatch]);

  // Opponent battle state (reactive resource — written by ME during combat)
  useEffect(() => {
    if (!ecsWorld || !opponent || opponent === ZERO_ADDRESS) return;
    let cancelled = false;
    const poll = async () => {
      const b = await ecsWorld
        .getComponent<{ matchId: string; hp: string; shield: string }>(opponent, 'battleState')
        .catch(() => null);
      if (!cancelled && b) {
        setOppBattle({
          matchId: String(b.matchId),
          hp: BigInt(b.hp ?? 0),
          shield: BigInt(b.shield ?? 0)
        });
      }
    };
    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ecsWorld, opponent]);

  // Opponent UserStorage id (needed for reactive write tx arguments)
  useEffect(() => {
    if (!contract || !opponent || opponent === ZERO_ADDRESS) return;
    contract
      .getUserStorageId(opponent)
      .then(setOppStorageId)
      .catch(() => setOppStorageId(null));
  }, [contract, opponent]);

  // Arena object (rake destination for settlement)
  useEffect(() => {
    if (!graphqlClient) return;
    fetchArenaObjectId(graphqlClient)
      .then(setArenaId)
      .catch(() => {});
  }, [graphqlClient]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const playCard = (cardId: string, kind: number) => {
    if (!duel) return;
    if (isAttackKind(kind)) {
      if (!oppStorageId) {
        toast.error('Opponent storage not resolved yet');
        return;
      }
      execTx((tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::duel_system::attack`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.object(oppStorageId),
            tx.object(duel.permitId),
            tx.object(duel.sceneId),
            tx.pure.address(cardId),
            tx.object(CLOCK)
          ]
        });
      }, 'Attack played!');
    } else {
      execTx((tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::duel_system::defend`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.object(duel.permitId),
            tx.object(duel.sceneId),
            tx.pure.address(cardId),
            tx.object(CLOCK)
          ]
        });
      }, 'Defense played!');
    }
  };

  const handleSurrender = () => {
    if (!duel) return;
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::surrender`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(duel.permitId),
          tx.object(duel.sceneId)
        ]
      });
    }, 'You surrendered.');
  };

  const handleClaimTimeout = () => {
    if (!duel || !oppStorageId) return;
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::claim_timeout_win`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(oppStorageId),
          tx.object(duel.permitId),
          tx.object(duel.sceneId),
          tx.object(CLOCK)
        ]
      });
    }, 'Timeout victory claimed!');
  };

  const handleFinish = () => {
    if (!duel) return;
    if (!arenaId) {
      toast.error('Arena object not resolved yet');
      return;
    }
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::finish_duel`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.object(duel.permitId),
          tx.object(duel.sceneId),
          tx.object(arenaId)
        ]
      });
    }, 'Pot collected — victory sealed!');
  };

  const handleLeave = () => {
    if (!duel) return;
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::duel_system::leave_duel`,
        arguments: [tx.object(duel.permitId), tx.object(duel.sceneId), tx.object(userStorageId)]
      });
    }, 'Left the match.');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <GameShell game={game}>
        <CenterNote text="Match not found (it may have been cleaned up)." backHref="/" />
      </GameShell>
    );
  }
  if (!duel) {
    return (
      <GameShell game={game}>
        <CenterNote text="Loading match…" />
      </GameShell>
    );
  }

  const isParticipant = me === duel.challenger || me === duel.opponent;
  const myTurn = duel.state === STATE_ACTIVE && duel.turnAddr === me;
  const iWon = duel.state === STATE_FINISHED && duel.winner === me;
  const potClaimed = duel.state === STATE_FINISHED && duel.winner === ZERO_ADDRESS;

  return (
    <GameShell game={game}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Match status banner */}
        <div className="flex items-center justify-between bg-slate-950/80 border-2 border-indigo-800 rounded-2xl px-5 py-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <IconSword size={22} />
            <div>
              <p className="font-pixel text-indigo-200 text-xs">
                Duel · Round {duel.round} ·{' '}
                {duel.state === STATE_WAITING
                  ? 'Waiting for opponent'
                  : duel.state === STATE_ACTIVE
                  ? myTurn
                    ? 'YOUR TURN'
                    : 'Opponent’s turn'
                  : 'Finished'}
              </p>
              <p className="text-indigo-600 text-[11px] mt-0.5 flex items-center gap-1">
                Pot <IconGold size={11} /> {duel.gold.toString()} · scene {shortAddr(duel.sceneId)}
              </p>
            </div>
          </div>
          {duel.state === STATE_ACTIVE && isParticipant && (
            <div className="flex gap-2">
              {!myTurn && (
                <button
                  onClick={handleClaimTimeout}
                  disabled={isLoading || !oppStorageId}
                  title="Wins if the opponent stalled past the turn timeout or ran out of cards"
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                >
                  Claim Timeout Win
                </button>
              )}
              <button
                onClick={handleSurrender}
                disabled={isLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
              >
                Surrender
              </button>
            </div>
          )}
        </div>

        {/* Player panels */}
        <div className="grid grid-cols-2 gap-4">
          <PlayerPanel
            label="You"
            address={me}
            hp={player.battle.hp}
            shield={player.battle.shield}
            active={myTurn}
            inThisMatch={player.battle.matchId === duel.sceneId}
          />
          <PlayerPanel
            label={iAmChallenger ? 'Opponent' : 'Challenger'}
            address={opponent}
            hp={oppBattle?.matchId === duel.sceneId ? oppBattle.hp : null}
            shield={oppBattle?.matchId === duel.sceneId ? oppBattle.shield : 0n}
            active={duel.state === STATE_ACTIVE && duel.turnAddr === opponent}
            inThisMatch={oppBattle?.matchId === duel.sceneId}
          />
        </div>

        {/* Finished: settlement */}
        {duel.state === STATE_FINISHED && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-950/80 border-2 border-amber-700 rounded-2xl p-6 text-center space-y-3"
          >
            <p className="font-pixel text-amber-300 text-sm">
              {potClaimed
                ? 'Match settled.'
                : iWon
                ? '🏆 VICTORY!'
                : duel.winner !== ZERO_ADDRESS
                ? `${shortAddr(duel.winner)} wins`
                : 'Match over'}
            </p>
            {iWon && (
              <button
                onClick={handleFinish}
                disabled={isLoading || !arenaId}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-pixel rounded-xl disabled:opacity-40 transition-colors"
              >
                Collect Pot ({duel.gold.toString()} gold, 3% arena rake)
              </button>
            )}
            {!iWon && isParticipant && potClaimed && (
              <button
                onClick={handleLeave}
                disabled={isLoading}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-pixel rounded-xl disabled:opacity-40 transition-colors"
              >
                Leave Match
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
        {duel.state === STATE_ACTIVE && isParticipant && (
          <div className="bg-slate-950/60 border border-indigo-900/60 rounded-2xl p-4">
            <h2 className="font-pixel text-indigo-400 text-xs mb-3">
              Your Hand {myTurn ? '— pick a card to play' : '(waiting for opponent)'}
            </h2>
            <div className="flex flex-wrap gap-3">
              {player.deck.map((id) => {
                const card = player.cards.find((c) => c.cardId === id);
                if (!card) return null;
                const used = myUsedCards.includes(id);
                return (
                  <CardView
                    key={id}
                    card={card}
                    used={used}
                    disabled={!myTurn || isLoading}
                    onClick={() => playCard(id, card.kind)}
                  />
                );
              })}
            </div>
            <p className="text-indigo-800 text-[10px] mt-3">
              Attack cards damage the opponent via a permit-verified reactive write. Each card can
              be played once per duel.
            </p>
          </div>
        )}

        {duel.state === STATE_WAITING && (
          <CenterNote
            text={
              iAmChallenger
                ? `Waiting for ${shortAddr(duel.opponent)} to accept your challenge…`
                : 'This duel has not started yet.'
            }
            backHref="/"
          />
        )}
      </div>
    </GameShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerPanel({
  label,
  address,
  hp,
  shield,
  active,
  inThisMatch
}: {
  label: string;
  address: string;
  hp: bigint | null;
  shield: bigint;
  active: boolean;
  inThisMatch?: boolean;
}) {
  const pct = hp !== null ? Math.min(100, Number((hp * 100n) / MAX_HP)) : 0;
  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-colors ${
        active ? 'border-amber-500 bg-amber-950/30' : 'border-indigo-900/60 bg-slate-950/60'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-pixel text-indigo-200 text-xs">{label}</p>
        <p className="text-indigo-600 text-[10px] font-mono">{shortAddr(address)}</p>
      </div>
      {hp === null || !inThisMatch ? (
        <p className="text-slate-600 text-[11px]">
          No battle data{!inThisMatch ? ' (settled)' : ''}
        </p>
      ) : (
        <>
          <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <motion.div
              animate={{ width: `${pct}%` }}
              className={`h-full ${
                pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
              }`}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11px]">
            <span className="text-emerald-400 font-pixel">
              {hp.toString()}/{MAX_HP.toString()} HP
            </span>
            {shield > 0n && <span className="text-sky-400 font-pixel">🛡 {shield.toString()}</span>}
          </div>
        </>
      )}
      {active && (
        <p className="text-amber-400 text-[10px] font-pixel mt-2 animate-pulse">● acting</p>
      )}
    </div>
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
