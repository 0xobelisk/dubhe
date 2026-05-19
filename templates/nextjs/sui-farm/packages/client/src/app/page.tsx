'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction
} from '@mysten/dapp-kit';
import { useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { FarmLand } from './components/FarmLand';
import { RanchLand } from './components/RanchLand';
import { ShopPanel } from './components/ShopPanel';
import { ResourceHUD } from './components/ResourceHUD';
import {
  PetPanel,
  type PetData,
  type PetHatchData,
  type PetInventory
} from './components/PetPanel';
import { IconFarm, IconSprout } from './components/PetAvatar';
import { CROP_NONE } from './lib/crops';
import {
  DappHubId,
  DappStorageId,
  PackageId,
  Network,
  FrameworkPackageId
} from 'contracts/deployment';
import { useWorldPermitId } from './hooks/useWorldPermitId';
import { useSessionKey } from './hooks/useSessionKey';

interface PlotData {
  plotId: number;
  cropType: number;
  count: bigint;
  plantedAt: bigint;
  harvestAt: bigint;
}

interface PlayerState {
  gold: bigint;
  // Seeds (bought from shop, consumed when planting)
  wheatSeed: bigint;
  cornSeed: bigint;
  carrotSeed: bigint;
  pumpkinSeed: bigint;
  // Crops (harvested output, sellable / listable on market)
  wheat: bigint;
  corn: bigint;
  carrot: bigint;
  pumpkin: bigint;
  plotsOwned: number;
  plots: (PlotData | null)[];
  isRegistered: boolean;
}

// Unsettled write count threshold — settle_writes is prepended to the PTB
// once the user's unsettled count reaches this value (75% of the 2 000 hard limit).
const SETTLE_THRESHOLD = 5n; // TODO: restore to 1500n before production

const INITIAL_STATE: PlayerState = {
  gold: BigInt(0),
  wheatSeed: BigInt(0),
  cornSeed: BigInt(0),
  carrotSeed: BigInt(0),
  pumpkinSeed: BigInt(0),
  wheat: BigInt(0),
  corn: BigInt(0),
  carrot: BigInt(0),
  pumpkin: BigInt(0),
  plotsOwned: 0,
  plots: Array(12).fill(null),
  isRegistered: false
};

export default function FarmPage() {
  const account = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { contract, ecsWorld, dappStorageId, dappHubId, network, packageId } = useDubhe();
  const { permitId: worldPermitId } = useWorldPermitId();
  const {
    isActive: sessionActive,
    keypairLoading: sessionKeypairLoading,
    minutesLeft: sessionMinutesLeft,
    sessionAddress,
    buildActivateTx,
    confirmActivation,
    signAndSend: sessionSignAndSend,
    clearSession,
    getSessionBalance,
    buildFundSessionTx,
    SESSION_DURATION_MS
  } = useSessionKey();

  const [sessionBalance, setSessionBalance] = useState<number | null>(null);

  // Use deployment.ts values as fallback when DubheProvider hasn't resolved yet
  const hubId = dappHubId ?? DappHubId;
  const storageId = dappStorageId ?? DappStorageId;

  const [mainView, setMainView] = useState<'farm' | 'ranch'>('farm');
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const [balance, setBalance] = useState(0);
  const [userStorageId, setUserStorageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unsettledCount, setUnsettledCount] = useState<bigint>(0n);
  // 0 = DAPP_SUBSIDIZES (auto-settle safe), 1 = USER_PAYS (skip auto-settle)
  const [settlementMode, setSettlementMode] = useState<number>(0);

  // ── Pet state ──────────────────────────────────────────────────────────────
  const INITIAL_PET_INV: PetInventory = {
    commonEgg: 0n,
    rareEgg: 0n,
    seasonalEgg: 0n,
    slotsOwned: 1,
    hatch: null,
    activeSlots: Array(3).fill(null),
    ranchPets: []
  };
  const [petInv, setPetInv] = useState<PetInventory>(INITIAL_PET_INV);

  const inventory: Record<number, bigint> = {
    1: state.wheat,
    2: state.corn,
    3: state.carrot,
    4: state.pumpkin
  };

  const seedInventory: Record<number, bigint> = {
    1: state.wheatSeed,
    2: state.cornSeed,
    3: state.carrotSeed,
    4: state.pumpkinSeed
  };

  const isConnected = connectionStatus === 'connected';

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    if (!account?.address || !contract) return;
    try {
      const b = await contract.balanceOf(account.address);
      setBalance(Number(b.totalBalance) / 1_000_000_000);
    } catch {}
  }, [account?.address, contract]);

  const fetchUserStorageId = useCallback(
    async (addr: string) => {
      if (!contract) return null;
      try {
        const id = await contract.getUserStorageId(addr);
        setUserStorageId(id);
        return id;
      } catch {
        setUserStorageId(null);
        return null;
      }
    },
    [contract]
  );

  // Query all game state via the ECS/indexer client.
  // entityId = player wallet address (canonical owner address)
  const fetchGameState = useCallback(
    async (addr: string) => {
      if (!ecsWorld) return;
      try {
        // Check registration by presence of profile resource
        const profile = await ecsWorld
          .getComponent<{ totalEarned: string; plotsOwned: number }>(addr, 'profile')
          .catch(() => null);

        if (!profile) {
          setState((s) => ({ ...s, isRegistered: false }));
          return;
        }

        // Fetch all single-key resources in parallel (seeds + crops)
        const [
          goldData,
          wheatSeedData,
          cornSeedData,
          carrotSeedData,
          pumpkinSeedData,
          wheatData,
          cornData,
          carrotData,
          pumpkinData
        ] = await Promise.all([
          ecsWorld.getComponent<{ amount: string }>(addr, 'gold').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'wheatSeed').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'cornSeed').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'carrotSeed').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'pumpkinSeed').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'wheat').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'corn').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'carrot').catch(() => null),
          ecsWorld.getComponent<{ amount: string }>(addr, 'pumpkin').catch(() => null)
        ]);

        // farm_plot has composite key [entity_id, plot_id].
        // getResources now accepts both camelCase and snake_case after the framework bug fix.
        const plotsOwned = Number(profile?.plotsOwned ?? 1);
        const plotResult = await ecsWorld
          .getResources<{
            entityId: string;
            plotId: number;
            cropType: number;
            count: string;
            plantedAt: string;
            harvestAt: string;
          }>('farmPlot', {
            filters: { entityId: addr },
            orderBy: [{ field: 'plotId', direction: 'ASC' }],
            limit: 12
          })
          .catch(() => ({ items: [] as any[] }));

        const plots: (PlotData | null)[] = Array(12).fill(null);
        for (let i = 0; i < plotsOwned; i++) {
          const p = plotResult.items.find((r) => Number(r.plotId) === i);
          plots[i] = {
            plotId: i,
            cropType: Number(p?.cropType ?? 0),
            count: BigInt(p?.count ?? 0),
            plantedAt: BigInt(p?.plantedAt ?? 0),
            harvestAt: BigInt(p?.harvestAt ?? 0)
          };
        }

        setState({
          gold: BigInt(goldData?.amount ?? 0),
          wheatSeed: BigInt(wheatSeedData?.amount ?? 0),
          cornSeed: BigInt(cornSeedData?.amount ?? 0),
          carrotSeed: BigInt(carrotSeedData?.amount ?? 0),
          pumpkinSeed: BigInt(pumpkinSeedData?.amount ?? 0),
          wheat: BigInt(wheatData?.amount ?? 0),
          corn: BigInt(cornData?.amount ?? 0),
          carrot: BigInt(carrotData?.amount ?? 0),
          pumpkin: BigInt(pumpkinData?.amount ?? 0),
          plotsOwned,
          plots,
          isRegistered: true
        });

        // ── Pet inventory ──────────────────────────────────────────────────
        const [cEgg, rEgg, sEgg, hatchData, petSlotsData, petResult, slotIndexResult] =
          await Promise.all([
            ecsWorld.getComponent<{ amount: string }>(addr, 'commonEgg').catch(() => null),
            ecsWorld.getComponent<{ amount: string }>(addr, 'rareEgg').catch(() => null),
            ecsWorld.getComponent<{ amount: string }>(addr, 'seasonalEgg').catch(() => null),
            ecsWorld
              .getComponent<{ eggType: number; hatchAt: string }>(addr, 'petHatch')
              .catch(() => null),
            ecsWorld.getComponent<{ slotsOwned: number }>(addr, 'petSlots').catch(() => null),
            // All pets owned by the player (keyed by pet_id, no slot field)
            ecsWorld
              .getResources<{
                petId: string;
                species: number;
                rarity: number;
                level: number;
                xp: number;
                happiness: number;
                satiety: number;
                fedAt: string;
                bornAt: string;
              }>('pet', { filters: { entityId: addr }, limit: 50 })
              .catch(() => ({ items: [] as any[] })),
            // Active slot assignments: slot → pet_id
            ecsWorld
              .getResources<{ slot: number; petId: string }>('petSlotIndex', {
                filters: { entityId: addr },
                limit: 3
              })
              .catch(() => ({ items: [] as any[] }))
          ]);

        const slotsOwned = petSlotsData?.slotsOwned ?? 1;

        // Build a map of all owned pets by petId — skip soft-deleted rows
        const allPetsMap = new Map<string, PetData>();
        petResult.items.forEach((p) => {
          if ((p as any).isDeleted) return;
          allPetsMap.set(String(p.petId), {
            petId: String(p.petId),
            species: Number(p.species),
            rarity: Number(p.rarity),
            level: Number(p.level),
            xp: Number(p.xp),
            happiness: Number(p.happiness),
            satiety: Number(p.satiety),
            fedAt: Number(p.fedAt),
            bornAt: Number(p.bornAt)
          });
        });

        // Build activeSlots — skip slot index rows that point to deleted pets
        const activeSlots: (PetData | null)[] = Array(3).fill(null);
        const activePetIds = new Set<string>();
        slotIndexResult.items.forEach((s) => {
          if ((s as any).isDeleted) return;
          const slot = Number(s.slot);
          const petId = String(s.petId);
          const pet = allPetsMap.get(petId);
          if (slot < 3 && pet) {
            activeSlots[slot] = pet;
            activePetIds.add(petId);
          }
        });

        // Ranch = all pets NOT in any active slot
        const ranchPets: PetData[] = [];
        allPetsMap.forEach((pet) => {
          if (!activePetIds.has(pet.petId)) ranchPets.push(pet);
        });

        // Guard against soft-deleted rows: the indexer marks deleted records with
        // isDeleted=true but keeps them in the database. Treat as absent.
        const hatch: PetHatchData | null =
          hatchData && !(hatchData as any).isDeleted
            ? { eggType: Number(hatchData.eggType), hatchAt: Number(hatchData.hatchAt) }
            : null;

        setPetInv({
          commonEgg: BigInt(cEgg?.amount ?? 0),
          rareEgg: BigInt(rEgg?.amount ?? 0),
          seasonalEgg: BigInt(sEgg?.amount ?? 0),
          slotsOwned,
          hatch,
          activeSlots,
          ranchPets
        });
      } catch (err) {
        console.error('fetchGameState error:', err);
      }
    },
    [ecsWorld]
  );
  // Refresh everything for the current account
  const refresh = useCallback(async () => {
    if (!account?.address) return;
    await fetchBalance();
    const userStorageId = await fetchUserStorageId(account.address);
    if (userStorageId && contract) {
      contract
        .getUserStorageFields(userStorageId)
        .then((fields) => setUnsettledCount(fields.unsettled_count))
        .catch(() => {});
    } else {
      setUnsettledCount(0n);
    }
    // Fetch DappStorage settlement mode once so buildWithSettle knows which
    // settle_writes variant (if any) is safe to prepend automatically.
    if (contract) {
      contract
        .getDappStorageFields(storageId)
        .then((fields) => setSettlementMode(fields.settlement_mode))
        .catch(() => {});
    }
    // Game state comes from the indexer keyed by wallet address (entityId = canonical owner address)
    await fetchGameState(account.address);
    // Refresh session wallet balance so the UI stays accurate
    getSessionBalance()
      .then(setSessionBalance)
      .catch(() => {});
  }, [
    account?.address,
    fetchBalance,
    fetchUserStorageId,
    fetchGameState,
    getSessionBalance,
    contract,
    storageId
  ]);

  useEffect(() => {
    if (isConnected && account?.address) {
      refresh();
      const interval = setInterval(refresh, 10000);
      return () => clearInterval(interval);
    } else {
      setState(INITIAL_STATE);
      setUserStorageId(null);
      setBalance(0);
      setUnsettledCount(0n);
    }
  }, [isConnected, account?.address]);

  // ── Transaction helpers ────────────────────────────────────────────────────

  const explorerUrl = (digest: string) =>
    contract?.getTxExplorerUrl(digest) ??
    `https://suiscan.xyz/${network ?? 'testnet'}/tx/${digest}`;

  const txToast = (msg: string, digest: string) =>
    toast.success(msg, {
      description: (
        <a
          href={explorerUrl(digest)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
        >
          View TX ↗
        </a>
      )
    });

  // Always uses main wallet (for registration and session management).
  const execTxWithMainWallet = async (
    buildFn: (tx: Transaction) => void | Promise<void>,
    successMsg: string,
    onSuccess?: () => void
  ) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (balance === 0) {
      toast.error('Your SUI balance is 0. Please top up before proceeding.');
      return;
    }

    setIsLoading(true);
    try {
      const tx = new Transaction();
      await buildFn(tx);
      await signAndExecuteTransaction(
        { transaction: tx.serialize() as any, chain: `sui:${network ?? 'localnet'}` },
        {
          onSuccess: async (resp) => {
            txToast(successMsg, resp.digest);
            onSuccess?.();
            setTimeout(refresh, 1500);
          },
          onError: (err) => {
            console.error('tx error:', err);
            toast.error(`Transaction failed: ${err.message}`);
          }
        }
      );
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? err}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute a game action PTB.
   * - If a session key is active: signs silently with the ephemeral keypair (no wallet popup).
   * - Otherwise: falls back to main wallet via dapp-kit.
   *
   * When the user's unsettled write count reaches SETTLE_THRESHOLD (1 500), a
   * `settle_writes` moveCall is prepended to the PTB so that settlement happens
   * in the same transaction at no extra round-trip.
   */
  const execTx = async (
    buildFn: (tx: Transaction) => void | Promise<void>,
    successMsg: string,
    onSuccess?: () => void
  ) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (balance === 0) {
      toast.error('Your SUI balance is 0. Please top up before proceeding.');
      return;
    }

    // Track whether settle_writes was actually prepended so we only reset
    // unsettledCount after the transaction is confirmed, not before.
    let didPrependSettle = false;

    const buildWithSettle = async (tx: Transaction) => {
      if (userStorageId && contract && unsettledCount >= SETTLE_THRESHOLD) {
        if (settlementMode === 0) {
          // DAPP_SUBSIDIZES: operator's credit_pool covers the fee, no coin needed.
          contract.buildSettleWritesTx(tx, { dappHubId: hubId, userStorageId });
        } else {
          // USER_PAYS: split payment from the signer's gas coin inline.
          // Change is merged back into tx.gas automatically (whoever pays gets the refund).
          contract.buildSettleWritesUserPaysTx(tx, { dappHubId: hubId, userStorageId });
        }
        didPrependSettle = true;
      }
      await buildFn(tx);
    };

    setIsLoading(true);
    try {
      if (sessionActive) {
        // Session path — no wallet popup
        const result = await sessionSignAndSend(buildWithSettle);
        if (didPrependSettle) setUnsettledCount(0n);
        onSuccess?.();
        txToast(successMsg, result.digest);
        setTimeout(refresh, 1500);
      } else {
        // Fallback: main wallet
        const tx = new Transaction();
        await buildWithSettle(tx);
        await signAndExecuteTransaction(
          { transaction: tx.serialize() as any, chain: `sui:${network ?? 'localnet'}` },
          {
            onSuccess: async (resp) => {
              if (didPrependSettle) setUnsettledCount(0n);
              onSuccess?.();
              txToast(successMsg, resp.digest);
              setTimeout(refresh, 1500);
            },
            onError: (err) => {
              console.error('tx error:', err);
              toast.error(`Transaction failed: ${err.message}`);
              setTimeout(refresh, 500);
            }
          }
        );
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? err}`);
      // Restore accurate unsettledCount quickly so the next write
      // correctly decides whether to prepend settle_writes again.
      setTimeout(refresh, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Session management actions ─────────────────────────────────────────────

  const handleActivateSessionDirect = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!userStorageId) {
      toast.error('Create storage first');
      return;
    }
    if (balance === 0) {
      toast.error('Your SUI balance is 0');
      return;
    }

    setIsLoading(true);
    try {
      const tx = buildActivateTx(userStorageId, SESSION_DURATION_MS);
      await signAndExecuteTransaction(
        { transaction: (tx as any).serialize(), chain: `sui:${network ?? 'localnet'}` },
        {
          onSuccess: (resp) => {
            confirmActivation(SESSION_DURATION_MS);
            txToast(
              'Session activated for 1 hour. No wallet popups for game actions!',
              resp.digest
            );
          },
          onError: (err) => toast.error(`Failed: ${err.message}`)
        }
      );
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateSession = async () => {
    if (!userStorageId) {
      clearSession();
      return;
    }
    setIsLoading(true);
    try {
      if (sessionActive) {
        // Session key can revoke itself — no main wallet needed
        await sessionSignAndSend((tx) => {
          tx.moveCall({
            target: `${FrameworkPackageId}::dapp_system::deactivate_session`,
            typeArguments: [`${packageId ?? PackageId}::dapp_key::DappKey`],
            arguments: [tx.object(DappHubId), tx.object(userStorageId)]
          });
        });
      }
      clearSession();
      toast.success('Session deactivated.');
    } catch {
      clearSession();
      toast.success('Session cleared locally.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Game actions ───────────────────────────────────────────────────────────

  // Step 1: Create UserStorage (first time only — always main wallet)
  const handleCreateStorage = () =>
    execTxWithMainWallet(async (tx) => {
      tx.moveCall({
        target: `${packageId ?? PackageId}::user_storage_init::init_user_storage`,
        arguments: [tx.object(hubId), tx.object(storageId)]
      });
    }, 'UserStorage created! Now register your farm.');

  // Step 2: Register in the game world — always main wallet (one-time)
  const handleRegister = () =>
    execTxWithMainWallet(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      if (!worldPermitId) throw new Error('World permit not loaded yet — please wait a moment');
      tx.moveCall({
        target: `${packageId ?? PackageId}::world_system::register`,
        arguments: [tx.object(storageId), tx.object(userStorageId), tx.object(worldPermitId)]
      });
    }, 'Welcome to Harvest! You received 50 gold.');

  // Sui shared Clock object (0x6) — needed by any function that reads the current time.
  const CLOCK = '0x6';

  // Crop growth durations in milliseconds (must match farm_system.move constants)
  const CROP_DURATION_MS: Record<number, number> = {
    1: 1 * 60 * 1000, // Wheat   — 1 min
    2: 2 * 60 * 1000, // Corn    — 2 min
    3: 4 * 60 * 1000, // Carrot  — 4 min
    4: 5 * 60 * 1000 // Pumpkin — 5 min
  };

  // Yield per seed (must match farm_system.move crop_yield constants)
  const CROP_YIELD: Record<number, number> = {
    1: 6, // Wheat
    2: 4, // Corn
    3: 3, // Carrot
    4: 3 // Pumpkin
  };

  const handlePlant = (plotId: number, cropType: number, _count: number) => {
    // Optimistic update: show yield_per_seed plants immediately
    const now = Date.now();
    const harvestAt = now + (CROP_DURATION_MS[cropType] ?? 0);
    const yieldCount = CROP_YIELD[cropType] ?? 1;
    setState((s) => {
      const plots = [...s.plots];
      plots[plotId] = {
        plotId,
        cropType,
        count: BigInt(yieldCount),
        plantedAt: BigInt(now),
        harvestAt: BigInt(harvestAt)
      };
      // Deduct 1 seed from the dedicated seed resource (not the crop resource)
      const key =
        cropType === 1
          ? 'wheatSeed'
          : cropType === 2
          ? 'cornSeed'
          : cropType === 3
          ? 'carrotSeed'
          : 'pumpkinSeed';
      return { ...s, [key]: (s as any)[key] - BigInt(1), plots };
    });

    return execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::farm_system::plant`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u8(plotId),
          tx.pure.u8(cropType),
          tx.object(CLOCK)
        ]
      });
    }, 'Planted! Check back when ready to harvest.');
  };

  const handleHarvest = (plotId: number) => {
    // Optimistic update: clear the plot immediately
    const plot = state.plots[plotId];
    const harvestedCropType = plot?.cropType ?? 0;
    const harvestedCount = plot?.count ?? BigInt(0);
    setState((s) => {
      const plots = [...s.plots];
      plots[plotId] = {
        plotId,
        cropType: 0,
        count: BigInt(0),
        plantedAt: BigInt(0),
        harvestAt: BigInt(0)
      };
      const key =
        harvestedCropType === 1
          ? 'wheat'
          : harvestedCropType === 2
          ? 'corn'
          : harvestedCropType === 3
          ? 'carrot'
          : 'pumpkin';
      return { ...s, [key]: (s as any)[key] + harvestedCount, plots };
    });

    return execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::farm_system::harvest`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u8(plotId),
          tx.object(CLOCK)
        ]
      });
    }, 'Harvested! Check your crop inventory.');
  };

  const handleBuySeeds = (cropType: number, count: number) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::shop_system::buy_seeds`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u8(cropType),
          tx.pure.u64(count)
        ]
      });
    }, `Bought ${count} seed(s)!`);

  const handleBuyPlot = () =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::shop_system::buy_extra_plot`,
        arguments: [tx.object(storageId), tx.object(userStorageId)]
      });
    }, 'New farm plot unlocked!');

  const handleSellCrops = (cropType: number, amount: number) => {
    const cropKey =
      cropType === 1 ? 'wheat' : cropType === 2 ? 'corn' : cropType === 3 ? 'carrot' : 'pumpkin';
    const sellPrices: Record<number, number> = { 1: 8, 2: 35, 3: 120, 4: 100 };
    const earned = BigInt(sellPrices[cropType] ?? 0) * BigInt(amount);
    // Optimistic update: deduct crops, add gold
    setState((s) => ({
      ...s,
      [cropKey]: (s as any)[cropKey] - BigInt(amount),
      gold: s.gold + earned
    }));
    return execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::shop_system::sell_crops`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u8(cropType),
          tx.pure.u64(amount)
        ]
      });
    }, `Sold ${amount} crop(s) for ${Number(earned)}g!`);
  };

  // ── Pet handlers ───────────────────────────────────────────────────────────

  const SUI_RANDOM = '0x8';

  const handleBuyEgg = (eggType: number) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      const fnName =
        eggType === 1 ? 'buy_common_egg' : eggType === 2 ? 'buy_rare_egg' : 'buy_seasonal_egg';
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::${fnName}`,
        arguments: [tx.object(storageId), tx.object(userStorageId), tx.pure.u64(1)]
      });
    }, 'Egg purchased!');

  const handleStartHatch = (eggType: number) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::start_hatch`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u8(eggType),
          tx.object(CLOCK)
        ]
      });
    }, 'Egg placed in incubator!');

  const handleOpenEgg = () =>
    execTx(
      async (tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${packageId ?? PackageId}::pet_system::open_egg`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.object(SUI_RANDOM),
            tx.object(CLOCK)
          ]
        });
      },
      'New pet hatched!',
      // Optimistic update: clear hatch record immediately so the button disappears
      () => setPetInv((prev) => ({ ...prev, hatch: null }))
    );

  const handleFeedPet = (petId: string, cropType: number, amount: number) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::feed_pet`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.address(petId),
          tx.pure.u8(cropType),
          tx.pure.u64(amount),
          tx.object(CLOCK)
        ]
      });
    }, 'Pet fed!');

  const handleBuyPetSlot = () =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::buy_pet_slot`,
        arguments: [tx.object(storageId), tx.object(userStorageId)]
      });
    }, 'New pet slot unlocked!');

  const handleDismissPet = (petId: string) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::dismiss_pet`,
        arguments: [tx.object(storageId), tx.object(userStorageId), tx.pure.address(petId)]
      });
    }, 'Pet dismissed.');

  const handleListPet = (petId: string, price: bigint) =>
    execTxWithMainWallet(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::list_pet`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.address(petId),
          tx.pure.u64(price)
        ]
      });
    }, 'Pet listed on market!');

  const handleAssignSlot = (petId: string, slot: number) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::assign_slot`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.address(petId),
          tx.pure.u8(slot)
        ]
      });
    }, `Pet assigned to slot ${slot + 1}!`);

  const handleUnassignSlot = (slot: number) =>
    execTx(async (tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${packageId ?? PackageId}::pet_system::unassign_slot`,
        arguments: [tx.object(storageId), tx.object(userStorageId), tx.pure.u8(slot)]
      });
    }, 'Pet moved to ranch.');

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 p-8"
        style={{ background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0a1a0a 100%)' }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className="mb-4 flex justify-center">
            <IconFarm size={80} />
          </div>
          <h1 className="font-pixel text-amber-300 text-2xl mb-2">HARVEST</h1>
          <p className="text-amber-600 text-sm mb-8">Full-Chain Casual Farming on Sui</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  // Low balance warning
  const balanceWarning = balance === 0 && (
    <div className="mb-4 bg-red-900/40 border border-red-600/50 rounded-xl px-4 py-3 text-red-300 text-xs font-pixel">
      Your SUI balance is 0. Please get some {network ?? 'localnet'} SUI before making transactions.
    </div>
  );

  // No UserStorage yet
  if (!userStorageId) {
    return (
      <div
        className="min-h-screen p-4 md:p-6"
        style={{ background: 'radial-gradient(ellipse at top, #1a3a1a 0%, #0a1a0a 100%)' }}
      >
        <div className="flex justify-end mb-6">
          <ConnectButton />
        </div>
        {balanceWarning}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-4 flex justify-center">
            <IconFarm size={60} />
          </div>
          <h2 className="font-pixel text-amber-300 text-lg mb-2">Setup Your Account</h2>
          <p className="text-amber-500 text-sm mb-2">Step 1 of 2 — Create your on-chain storage</p>
          <p className="text-amber-700 text-xs mb-6 max-w-xs">
            This creates your personal UserStorage object on Sui — required before interacting with
            any DApp.
          </p>
          <motion.button
            onClick={handleCreateStorage}
            disabled={isLoading || balance === 0}
            className="bg-blue-700 hover:bg-blue-600 text-white font-pixel px-8 py-3 rounded-xl
                       disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? 'Creating...' : 'Create Storage (Step 1)'}
          </motion.button>
          {balance === 0 && (
            <p className="text-red-400 text-xs font-pixel mt-3">Need SUI balance to pay gas</p>
          )}
        </div>
      </div>
    );
  }

  // Has UserStorage but not registered in game
  if (!state.isRegistered) {
    return (
      <div
        className="min-h-screen p-4 md:p-6"
        style={{ background: 'radial-gradient(ellipse at top, #1a3a1a 0%, #0a1a0a 100%)' }}
      >
        <div className="flex justify-end mb-6">
          <ConnectButton />
        </div>
        {balanceWarning}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-4 flex justify-center">
            <IconSprout size={60} />
          </div>
          <h2 className="font-pixel text-amber-300 text-lg mb-2">Start Your Farm</h2>
          <p className="text-amber-500 text-sm mb-2">Step 2 of 2 — Register in the game world</p>
          <p className="text-amber-700 text-xs mb-6 max-w-xs">
            You will receive 50 gold and your first farm plot.
            <br />
            After registering, activate a Session Key to play without wallet popups.
          </p>
          <motion.button
            onClick={handleRegister}
            disabled={isLoading || balance === 0}
            className="bg-green-700 hover:bg-green-600 text-white font-pixel px-8 py-3 rounded-xl
                       disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? 'Registering...' : 'Start Farming (Step 2)'}
          </motion.button>
          {balance === 0 && (
            <p className="text-red-400 text-xs font-pixel mt-3">Need SUI balance to pay gas</p>
          )}
        </div>
      </div>
    );
  }

  // Main game UI
  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ background: 'radial-gradient(ellipse at top, #1a3a1a 0%, #0a1a0a 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <IconFarm size={28} />
          <h1 className="font-pixel text-amber-300 text-sm">HARVEST</h1>
        </div>
        <div className="flex items-center gap-3">
          {balance > 0 ? (
            <span className="text-xs text-amber-600 font-pixel">{balance.toFixed(3)} SUI</span>
          ) : (
            <span className="text-xs text-red-400 font-pixel">0 SUI — top up needed</span>
          )}
          <ConnectButton />
        </div>
      </div>

      {balanceWarning}

      {/* Session key status bar */}
      {state.isRegistered && (
        <div
          className={`mb-4 flex items-center justify-between px-4 py-2 rounded-xl border text-xs font-pixel flex-wrap gap-2
          ${
            sessionActive
              ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
              : 'bg-amber-900/20 border-amber-700/30 text-amber-500'
          }`}
        >
          {sessionKeypairLoading ? (
            <span className="opacity-60">Loading session key...</span>
          ) : sessionActive ? (
            <>
              <span className="flex items-center gap-2 flex-wrap">
                Session active — {sessionMinutesLeft}m left
                {sessionBalance !== null && (
                  <span
                    className={`${sessionBalance < 0.01 ? 'text-red-400' : 'text-emerald-400'}`}
                  >
                    (gas: {sessionBalance.toFixed(4)} SUI)
                  </span>
                )}
                {sessionAddress && (
                  <span className="flex items-center gap-1 font-mono text-xs text-emerald-400/70">
                    <span>
                      {sessionAddress.slice(0, 6)}…{sessionAddress.slice(-4)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(sessionAddress);
                        toast.success('Session address copied');
                      }}
                      title="Copy session address"
                      className="hover:text-emerald-300 transition-colors"
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
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {sessionBalance !== null && sessionBalance < 0.05 && (
                  <button
                    onClick={() => {
                      if (!userStorageId) return;
                      setIsLoading(true);
                      const tx = buildFundSessionTx(0.1);
                      signAndExecuteTransaction(
                        {
                          transaction: (tx as any).serialize(),
                          chain: `sui:${network ?? 'localnet'}`
                        },
                        {
                          onSuccess: (resp) => {
                            txToast('Topped up 0.1 SUI to session wallet', resp.digest);
                            setTimeout(refresh, 1500);
                          },
                          onError: (e) => toast.error(`Top-up failed: ${e.message}`)
                        }
                      ).finally(() => setIsLoading(false));
                    }}
                    disabled={isLoading}
                    className="bg-amber-700 hover:bg-amber-600 text-white px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                  >
                    Top up 0.1 SUI
                  </button>
                )}
                <button
                  onClick={handleDeactivateSession}
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
                onClick={handleActivateSessionDirect}
                disabled={isLoading || !userStorageId || sessionKeypairLoading}
                className="ml-4 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg
                           disabled:opacity-50 transition-colors"
              >
                Activate Session (1h)
              </button>
            </>
          )}
        </div>
      )}
      <div className="mb-6">
        <ResourceHUD
          gold={state.gold}
          inventory={inventory}
          seedInventory={seedInventory}
          plotsOwned={state.plotsOwned}
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-6">
        {(['Farm', 'Market', 'Leaderboard'] as const).map((tab) => (
          <a
            key={tab}
            href={tab === 'Farm' ? '/' : `/${tab.toLowerCase()}`}
            className="px-4 py-2 text-xs font-pixel rounded-lg bg-amber-900/40 hover:bg-amber-800/40
                       text-amber-400 hover:text-amber-200 transition-colors border border-amber-700/30"
          >
            {tab}
          </a>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {/* Farm / Ranch view toggle */}
          <div className="flex gap-1.5">
            {(['farm', 'ranch'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMainView(v)}
                className={`px-4 py-1.5 text-xs font-pixel rounded-lg border transition-colors capitalize
                  ${
                    mainView === v
                      ? 'bg-amber-700 border-amber-500 text-amber-100'
                      : 'bg-amber-900/30 border-amber-700/30 text-amber-500 hover:bg-amber-800/40 hover:text-amber-300'
                  }`}
              >
                {v === 'farm' ? 'Farm' : 'Ranch'}
              </button>
            ))}
          </div>

          {mainView === 'farm' && (
            <FarmLand
              plots={state.plots}
              plotsOwned={state.plotsOwned}
              inventory={seedInventory}
              now={Date.now()}
              isLoading={isLoading}
              onPlant={handlePlant}
              onHarvest={handleHarvest}
            />
          )}

          {mainView === 'ranch' && (
            <RanchLand
              inventory={petInv}
              cropInventory={inventory}
              isLoading={isLoading || balance === 0}
              onFeedPet={handleFeedPet}
              onAssignSlot={handleAssignSlot}
              onUnassignSlot={handleUnassignSlot}
              onDismissPet={handleDismissPet}
              onListPet={handleListPet}
              onBuySlot={handleBuyPetSlot}
            />
          )}
        </div>
        <div className="space-y-4">
          <ShopPanel
            gold={state.gold}
            inventory={seedInventory}
            cropInventory={inventory}
            plotsOwned={state.plotsOwned}
            onBuySeeds={handleBuySeeds}
            onBuyPlot={handleBuyPlot}
            onSellCrops={handleSellCrops}
            isLoading={isLoading || balance === 0}
          />
          <PetPanel
            gold={state.gold}
            inventory={petInv}
            cropInventory={inventory}
            isLoading={isLoading || balance === 0}
            onBuyEgg={handleBuyEgg}
            onStartHatch={handleStartHatch}
            onOpenEgg={handleOpenEgg}
            onFeedPet={handleFeedPet}
            onBuySlot={handleBuyPetSlot}
            onDismissPet={handleDismissPet}
            onListPet={handleListPet}
            onAssignSlot={handleAssignSlot}
            onUnassignSlot={handleUnassignSlot}
          />
        </div>
      </div>
    </div>
  );
}
