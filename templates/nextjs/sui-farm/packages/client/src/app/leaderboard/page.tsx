'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useDubhe } from '@0xobelisk/react/sui';
import { motion } from 'framer-motion';
import { IconTrophy, IconMedal } from '../components/PetAvatar';
import { IconGold } from '../components/icons/GameIcons';

interface LeaderboardEntry {
  address: string;
  earned: bigint;
  rank: number;
}

export default function LeaderboardPage() {
  const account = useCurrentAccount();
  const { ecsWorld, graphqlClient } = useDubhe();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [seasonId, setSeasonId] = useState(0);
  const [seasonEnd, setSeasonEnd] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!ecsWorld || !graphqlClient) return;
    setIsLoading(true);
    try {
      // Fetch season config (global resource, no entityId key)
      const seasonResult = await graphqlClient
        .getAllTables<any>('seasonConfig', { first: 1 })
        .catch(() => null);
      const season = seasonResult?.edges?.[0]?.node;
      if (season) {
        setSeasonId(Number(season.seasonId ?? 0));
        setSeasonEnd(BigInt(season.endMs ?? 0));
      }

      // Query top earners via season_stats (sorted by earned amount)
      const statsResult = await graphqlClient
        .getAllTables<any>('seasonStats', {
          first: 20,
          orderBy: [{ field: 'amount', direction: 'DESC' }]
        })
        .catch(() => null);

      const edges = statsResult?.edges ?? [];
      setEntries(
        edges.map((e, i) => ({
          address: e.node.entityId,
          earned: BigInt(e.node.amount ?? 0),
          rank: i + 1
        }))
      );
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ecsWorld, graphqlClient]);

  useEffect(() => {
    if (ecsWorld) fetchLeaderboard();
  }, [ecsWorld, fetchLeaderboard]);

  const now = Date.now();
  const timeLeft = Math.max(0, Number(seasonEnd) - now);
  const daysLeft = Math.floor(timeLeft / 86400000);
  const hoursLeft = Math.floor((timeLeft % 86400000) / 3600000);
  const isSeasonActive = seasonId > 0 && timeLeft > 0;

  const rankMedal = (rank: number) => {
    if (rank <= 3) return <IconMedal rank={rank as 1 | 2 | 3} size={28} />;
    return <span className="font-pixel text-amber-600 text-sm">#{rank}</span>;
  };

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ background: 'radial-gradient(ellipse at top, #1a3a1a 0%, #0a1a0a 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <IconTrophy size={24} />
          <h1 className="font-pixel text-amber-300 text-sm">LEADERBOARD</h1>
        </div>
        <ConnectButton />
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-6">
        {['Farm', 'Market', 'Leaderboard'].map((tab) => (
          <a
            key={tab}
            href={tab === 'Farm' ? '/' : `/${tab.toLowerCase()}`}
            className={`px-4 py-2 text-xs font-pixel rounded-lg transition-colors border
              ${
                tab === 'Leaderboard'
                  ? 'bg-amber-700 text-amber-100 border-amber-600'
                  : 'bg-amber-900/40 hover:bg-amber-800/40 text-amber-400 border-amber-700/30'
              }`}
          >
            {tab}
          </a>
        ))}
      </div>

      {/* Season info */}
      <div className="bg-amber-950/60 border border-amber-700/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-pixel text-amber-300 text-xs">
              {isSeasonActive
                ? `Season ${seasonId}`
                : seasonId === 0
                ? 'No Active Season'
                : `Season ${seasonId} Ended`}
            </p>
            {isSeasonActive && (
              <p className="text-amber-500 text-xs mt-1">
                {daysLeft}d {hoursLeft}h remaining · Top 3 earn Trophy NFTs
              </p>
            )}
          </div>
          {isSeasonActive && (
            <div className="flex gap-2 text-xs text-amber-400">
              <div className="flex items-center gap-1">
                <IconTrophy size={14} />
                <span className="font-pixel">Trophy for top 3</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rankings */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-pixel text-amber-600 text-xs">No rankings yet.</p>
          <p className="text-amber-700 text-xs mt-2">Start farming to appear here!</p>
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
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border
                  ${
                    isMe
                      ? 'bg-amber-800/40 border-amber-500'
                      : 'bg-amber-950/40 border-amber-800/30'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">{rankMedal(entry.rank)}</div>
                  <div>
                    <p className="text-sm text-amber-200 font-pixel">
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      {isMe && <span className="text-amber-400 ml-2">(you)</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <IconGold size={14} />
                  <p className="text-amber-300 font-pixel text-sm tabular-nums">
                    {Number(entry.earned).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
