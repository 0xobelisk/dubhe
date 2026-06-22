'use client';

/**
 * Core game hook shared by every page.
 *
 * Bundles:
 *  - wallet connection + SUI balance
 *  - UserStorage discovery, registration state
 *  - player resources (gold / profile / deck / cards / battle_state) via ECS indexer
 *  - transaction execution (session key silent-sign, main-wallet fallback,
 *    auto settle_writes prepending)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction
} from '@mysten/dapp-kit';
import { useDubhe, useDubheTx, SessionInvalidatedError } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import { ZERO_ADDRESS } from '@0xobelisk/graphql-client';
import { toast } from 'sonner';

import { DappHubId, DappStorageId, PackageId } from 'contracts/deployment';
import type { CardData, ProfileData, BattleStateData } from '../lib/game';

export interface PlayerState {
  isRegistered: boolean;
  gold: bigint;
  profile: ProfileData | null;
  deck: string[];
  cards: CardData[];
  battle: BattleStateData;
}

const INITIAL_PLAYER: PlayerState = {
  isRegistered: false,
  gold: 0n,
  profile: null,
  deck: [],
  cards: [],
  battle: { matchId: ZERO_ADDRESS, hp: 0n, shield: 0n }
};

export function useGame(pollMs = 10000) {
  const account = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const dubheCtx = useDubhe();
  const { contract, ecsWorld, graphqlClient, dappStorageId, dappHubId, network, packageId } =
    dubheCtx;

  const hubId = dappHubId ?? DappHubId;
  const storageId = dappStorageId ?? DappStorageId;
  const pkg = packageId ?? PackageId;
  const isConnected = connectionStatus === 'connected';

  const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER);
  const [balance, setBalance] = useState(0);
  const [userStorageId, setUserStorageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Main-wallet signer injected into the framework tx layer.
  const signWithWallet = useCallback(
    async (tx: Transaction) => {
      const resp = await signAndExecuteTransaction({
        transaction: tx.serialize() as any,
        chain: `sui:${network ?? 'localnet'}`
      });
      return { digest: resp.digest };
    },
    [signAndExecuteTransaction, network]
  );

  // Framework tx layer: session state is scoped to the connected main wallet
  // (switching accounts never shows or signs with another account's session)
  // and settle_writes is prepended automatically when the threshold is hit.
  const dubheTx = useDubheTx({
    owner: account?.address ?? null,
    userStorageId,
    signWithWallet
  });
  const session = dubheTx.session;

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchPlayerState = useCallback(
    async (addr: string) => {
      if (!ecsWorld) return;
      try {
        const profileData = await ecsWorld
          .getComponent<{ wins: number; losses: number; rating: number }>(addr, 'profile')
          .catch(() => null);

        if (!profileData) {
          setPlayer((p) => ({ ...p, isRegistered: false }));
          return;
        }

        const [goldData, deckData, battleData, cardsResult] = await Promise.all([
          ecsWorld.getComponent<{ amount: string }>(addr, 'gold').catch(() => null),
          ecsWorld.getComponent<{ cardIds: string[] }>(addr, 'deck').catch(() => null),
          ecsWorld
            .getComponent<{ matchId: string; hp: string; shield: string }>(addr, 'battleState')
            .catch(() => null),
          ecsWorld
            .getResources<{ cardId: string; kind: number; power: number; rarity: number }>('card', {
              filters: { entityId: addr },
              limit: 200
            })
            .catch(() => ({ items: [] as any[] }))
        ]);

        const cards: CardData[] = cardsResult.items
          .filter((c: any) => !c.isDeleted)
          .map((c: any) => ({
            cardId: String(c.cardId),
            kind: Number(c.kind),
            power: Number(c.power),
            rarity: Number(c.rarity)
          }));

        setPlayer({
          isRegistered: true,
          gold: BigInt(goldData?.amount ?? 0),
          profile: {
            wins: Number(profileData.wins ?? 0),
            losses: Number(profileData.losses ?? 0),
            rating: Number(profileData.rating ?? 0)
          },
          deck: (deckData?.cardIds ?? []).map(String),
          cards,
          battle: {
            matchId: String(battleData?.matchId ?? ZERO_ADDRESS),
            hp: BigInt(battleData?.hp ?? 0),
            shield: BigInt(battleData?.shield ?? 0)
          }
        });
      } catch (err) {
        console.error('fetchPlayerState error:', err);
      }
    },
    [ecsWorld]
  );

  const refresh = useCallback(async () => {
    if (!account?.address || !contract) return;
    try {
      const b = await contract.balanceOf(account.address);
      setBalance(Number(b.totalBalance) / 1_000_000_000);
    } catch {}
    try {
      const id = await contract.getUserStorageId(account.address);
      setUserStorageId(id);
    } catch {
      setUserStorageId(null);
    }
    dubheTx.refreshSettleState().catch(() => {});
    await fetchPlayerState(account.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, contract, fetchPlayerState, dubheTx.refreshSettleState]);

  useEffect(() => {
    if (isConnected && account?.address) {
      refresh();
      const interval = setInterval(refresh, pollMs);
      return () => clearInterval(interval);
    } else {
      setPlayer(INITIAL_PLAYER);
      setUserStorageId(null);
      setBalance(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account?.address, pollMs]);

  // ── Tx helpers ──────────────────────────────────────────────────────────────

  const explorerUrl = (digest: string) =>
    contract?.getTxExplorerUrl(digest) ??
    `https://suiscan.xyz/${network ?? 'testnet'}/tx/${digest}`;

  const txToast = useCallback(
    (msg: string, digest: string) =>
      toast.success(msg, {
        description: `Tx: ${digest.slice(0, 10)}… — ${explorerUrl(digest)}`
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contract, network]
  );

  const checkPreconditions = useCallback(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }
    if (balance === 0) {
      toast.error('Your SUI balance is 0. Please top up before proceeding.');
      return false;
    }
    return true;
  }, [isConnected, balance]);

  /** Always main wallet (UserStorage creation, register, marketplace, admin). */
  const execTxWithMainWallet = useCallback(
    async (
      buildFn: (tx: Transaction) => void | Promise<void>,
      successMsg: string,
      onSuccess?: () => void
    ) => {
      if (!checkPreconditions()) return;
      setIsLoading(true);
      try {
        const { digest } = await dubheTx.execTxWithMainWallet(buildFn);
        txToast(successMsg, digest);
        onSuccess?.();
        setTimeout(refresh, 1500);
      } catch (err: any) {
        console.error('tx error:', err);
        toast.error(`Transaction failed: ${err?.message ?? err}`);
      } finally {
        setIsLoading(false);
      }
    },
    [checkPreconditions, dubheTx, txToast, refresh]
  );

  /**
   * Game action: session key silent-sign when active, otherwise main wallet.
   * settle_writes is prepended automatically by the framework tx layer.
   */
  const execTx = useCallback(
    async (
      buildFn: (tx: Transaction) => void | Promise<void>,
      successMsg: string,
      onSuccess?: () => void
    ) => {
      if (!checkPreconditions()) return;
      setIsLoading(true);
      try {
        const { digest } = await dubheTx.execTx(buildFn);
        onSuccess?.();
        txToast(successMsg, digest);
        setTimeout(refresh, 1500);
      } catch (err: any) {
        if (err instanceof SessionInvalidatedError) {
          toast.error('Session is no longer valid — please activate it again.');
        } else {
          console.error('tx error:', err);
          toast.error(`Transaction failed: ${err?.message ?? err}`);
        }
        setTimeout(refresh, 500);
      } finally {
        setIsLoading(false);
      }
    },
    [checkPreconditions, dubheTx, txToast, refresh]
  );

  // ── Onboarding actions ──────────────────────────────────────────────────────

  const handleCreateStorage = useCallback(
    () =>
      execTxWithMainWallet((tx) => {
        tx.moveCall({
          target: `${pkg}::user_storage_init::init_user_storage`,
          arguments: [tx.object(hubId), tx.object(storageId)]
        });
      }, 'UserStorage created! Now register to play.'),
    [execTxWithMainWallet, pkg, hubId, storageId]
  );

  const handleRegister = useCallback(
    () =>
      execTxWithMainWallet((tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::player_system::register`,
          arguments: [tx.object(storageId), tx.object(userStorageId)]
        });
      }, 'Welcome to Card Duel! You received 500 gold and a starter deck.'),
    [execTxWithMainWallet, pkg, storageId, userStorageId]
  );

  return {
    // context
    account,
    isConnected,
    contract,
    ecsWorld,
    graphqlClient,
    network,
    pkg,
    hubId,
    storageId,
    // state
    player,
    balance,
    userStorageId,
    isLoading,
    setIsLoading,
    // session
    session,
    // actions
    refresh,
    execTx,
    execTxWithMainWallet,
    handleCreateStorage,
    handleRegister,
    signAndExecuteTransaction,
    txToast
  };
}
