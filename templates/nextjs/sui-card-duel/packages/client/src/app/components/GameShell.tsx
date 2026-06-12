'use client';

import { usePathname } from 'next/navigation';
import { ConnectButton } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import type { useGame } from '../hooks/useGame';
import { IconCards, IconGold, IconTrophy } from './icons';

type Game = ReturnType<typeof useGame>;

const NAV = [
  { href: '/', label: 'Lobby' },
  { href: '/collection', label: 'Collection' },
  { href: '/market', label: 'Market' },
  { href: '/leaderboard', label: 'Leaderboard' }
];

const BG = 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0a1a 65%)';

/**
 * Common page chrome: header, nav, session-key bar and onboarding gates
 * (connect wallet → create UserStorage → register). Children render only
 * once the player is fully onboarded, unless `gate` is set to false.
 */
export function GameShell({
  game,
  children,
  gate = true
}: {
  game: Game;
  children: React.ReactNode;
  /** Set false for pages that are viewable before registration (e.g. leaderboard). */
  gate?: boolean;
}) {
  const pathname = usePathname();
  const { isConnected, player, balance, userStorageId, isLoading } = game;

  if (!isConnected) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 p-8"
        style={{ background: BG }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className="mb-4 flex justify-center">
            <IconCards size={80} />
          </div>
          <h1 className="font-pixel text-indigo-300 text-2xl mb-2">CARD DUEL</h1>
          <p className="text-indigo-500 text-sm mb-8">Full-Chain PvP Card Battles on Sui</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  const balanceWarning = balance === 0 && (
    <div className="mb-4 bg-red-900/40 border border-red-600/50 rounded-xl px-4 py-3 text-red-300 text-xs font-pixel">
      Your SUI balance is 0. Please get some {game.network ?? 'localnet'} SUI before making
      transactions.
    </div>
  );

  const header = (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <IconCards size={28} />
        <h1 className="font-pixel text-indigo-300 text-sm">CARD DUEL</h1>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {player.isRegistered && (
          <>
            <span className="flex items-center gap-1 text-xs font-pixel text-amber-300">
              <IconGold size={14} /> {player.gold.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-xs font-pixel text-indigo-300">
              <IconTrophy size={14} /> {player.profile?.rating ?? 0}
            </span>
          </>
        )}
        {balance > 0 ? (
          <span className="text-xs text-indigo-500 font-pixel">{balance.toFixed(3)} SUI</span>
        ) : (
          <span className="text-xs text-red-400 font-pixel">0 SUI — top up needed</span>
        )}
        <ConnectButton />
      </div>
    </div>
  );

  const nav = (
    <div className="flex gap-2 mb-6 flex-wrap">
      {NAV.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className={`px-4 py-2 text-xs font-pixel rounded-lg border transition-colors ${
            pathname === href
              ? 'bg-indigo-700 text-indigo-100 border-indigo-500'
              : 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-400 border-indigo-800/40'
          }`}
        >
          {label}
        </a>
      ))}
    </div>
  );

  // ── Onboarding gates ────────────────────────────────────────────────────────

  if (gate && !userStorageId) {
    return (
      <div className="min-h-screen p-4 md:p-6" style={{ background: BG }}>
        {header}
        {balanceWarning}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-4">
            <IconCards size={60} />
          </div>
          <h2 className="font-pixel text-indigo-300 text-lg mb-2">Setup Your Account</h2>
          <p className="text-indigo-500 text-sm mb-2">Step 1 of 2 — Create your on-chain storage</p>
          <p className="text-indigo-700 text-xs mb-6 max-w-xs">
            This creates your personal UserStorage object on Sui — required before interacting with
            any DApp.
          </p>
          <motion.button
            onClick={game.handleCreateStorage}
            disabled={isLoading || balance === 0}
            className="bg-blue-700 hover:bg-blue-600 text-white font-pixel px-8 py-3 rounded-xl disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? 'Creating...' : 'Create Storage (Step 1)'}
          </motion.button>
        </div>
      </div>
    );
  }

  if (gate && !player.isRegistered) {
    return (
      <div className="min-h-screen p-4 md:p-6" style={{ background: BG }}>
        {header}
        {balanceWarning}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-4">
            <IconCards size={60} />
          </div>
          <h2 className="font-pixel text-indigo-300 text-lg mb-2">Enter the Arena</h2>
          <p className="text-indigo-500 text-sm mb-2">Step 2 of 2 — Register as a duelist</p>
          <p className="text-indigo-700 text-xs mb-6 max-w-xs">
            You will receive 500 gold and a 5-card starter deck.
            <br />
            After registering, activate a Session Key to play without wallet popups.
          </p>
          <motion.button
            onClick={game.handleRegister}
            disabled={isLoading || balance === 0}
            className="bg-indigo-700 hover:bg-indigo-600 text-white font-pixel px-8 py-3 rounded-xl disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? 'Registering...' : 'Register (Step 2)'}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: BG }}>
      {header}
      {balanceWarning}
      {player.isRegistered && <SessionBar game={game} />}
      {nav}
      {children}
    </div>
  );
}

// ── Session key status bar ──────────────────────────────────────────────────

function SessionBar({ game }: { game: Game }) {
  const {
    session,
    userStorageId,
    isLoading,
    setIsLoading,
    network,
    signAndExecuteTransaction,
    txToast
  } = game;

  const handleActivate = async () => {
    if (!userStorageId) {
      toast.error('Create storage first');
      return;
    }
    setIsLoading(true);
    try {
      const tx = session.buildActivateTx(userStorageId, session.SESSION_DURATION_MS);
      await signAndExecuteTransaction(
        { transaction: (tx as any).serialize(), chain: `sui:${network ?? 'localnet'}` },
        {
          onSuccess: (resp: any) => {
            session.confirmActivation(session.SESSION_DURATION_MS);
            txToast(
              'Session activated for 1 hour — no wallet popups for game actions!',
              resp.digest
            );
          },
          onError: (err: any) => toast.error(`Failed: ${err.message}`)
        }
      );
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFund = async () => {
    setIsLoading(true);
    try {
      const tx = session.buildFundSessionTx(0.1);
      await signAndExecuteTransaction(
        { transaction: (tx as any).serialize(), chain: `sui:${network ?? 'localnet'}` },
        {
          onSuccess: (resp: any) => txToast('Topped up 0.1 SUI to session wallet', resp.digest),
          onError: (e: any) => toast.error(`Top-up failed: ${e.message}`)
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`mb-4 flex items-center justify-between px-4 py-2 rounded-xl border text-xs font-pixel flex-wrap gap-2 ${
        session.isActive
          ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
          : 'bg-indigo-900/20 border-indigo-700/30 text-indigo-400'
      }`}
    >
      {session.keypairLoading ? (
        <span className="opacity-60">Loading session key...</span>
      ) : session.isActive ? (
        <>
          <span className="flex items-center gap-2 flex-wrap">
            Session active — {session.minutesLeft}m left
            <span className="font-mono text-emerald-400/70">
              {session.sessionAddress.slice(0, 6)}…{session.sessionAddress.slice(-4)}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFund}
              disabled={isLoading}
              className="bg-indigo-800 hover:bg-indigo-700 text-white px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
            >
              Fund 0.1 SUI
            </button>
            <button
              onClick={() => {
                session.clearSession();
                toast.success('Session cleared.');
              }}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Deactivate
            </button>
          </div>
        </>
      ) : (
        <>
          <span>Session inactive — wallet approval required for every action</span>
          <button
            onClick={handleActivate}
            disabled={isLoading || !userStorageId || session.keypairLoading}
            className="ml-4 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
          >
            Activate Session (1h)
          </button>
        </>
      )}
    </div>
  );
}
