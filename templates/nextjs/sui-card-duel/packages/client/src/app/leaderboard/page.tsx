'use client';

/**
 * Leaderboard — ladder rating ranking from the indexed `profile` resource.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

import { useGame } from '../hooks/useGame';
import { GameShell } from '../components/GameShell';
import { IconTrophy, IconMedal } from '../components/icons';
import { shortAddr } from '../lib/game';

interface Entry {
  address: string;
  wins: number;
  losses: number;
  rating: number;
  rank: number;
}

export default function LeaderboardPage() {
  const game = useGame(15000);
  const { account, graphqlClient } = game;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!graphqlClient) return;
    setLoading(true);
    try {
      const result = await graphqlClient.getAllTables<any>('profile', {
        first: 50,
        orderBy: [{ field: 'rating', direction: 'DESC' }]
      });
      const edges = result?.edges ?? [];
      setEntries(
        edges
          .filter((e: any) => !e.node.isDeleted)
          .map((e: any, i: number) => ({
            address: e.node.entityId,
            wins: Number(e.node.wins ?? 0),
            losses: Number(e.node.losses ?? 0),
            rating: Number(e.node.rating ?? 0),
            rank: i + 1
          }))
      );
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [graphqlClient]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <GameShell game={game} gate={false}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <IconTrophy size={22} />
          <h2 className="font-pixel text-indigo-300 text-sm">LADDER RANKING</h2>
        </div>

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-pixel text-indigo-600 text-xs">No duelists ranked yet.</p>
            <p className="text-indigo-700 text-xs mt-2">Win matches to climb the ladder!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.address === account?.address;
              return (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.6) }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                    isMe
                      ? 'bg-indigo-800/40 border-indigo-500'
                      : 'bg-slate-950/50 border-indigo-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      {entry.rank <= 3 ? (
                        <IconMedal rank={entry.rank as 1 | 2 | 3} size={26} />
                      ) : (
                        <span className="font-pixel text-indigo-600 text-sm">#{entry.rank}</span>
                      )}
                    </div>
                    <p className="text-sm text-indigo-200 font-pixel">
                      {shortAddr(entry.address)}
                      {isMe && <span className="text-amber-400 ml-2">(you)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-400 font-pixel">{entry.wins}W</span>
                    <span className="text-red-400 font-pixel">{entry.losses}L</span>
                    <span className="text-indigo-300 font-pixel tabular-nums w-14 text-right">
                      {entry.rating.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </GameShell>
  );
}
