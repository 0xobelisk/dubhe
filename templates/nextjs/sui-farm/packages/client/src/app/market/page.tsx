'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useDubhe } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CROP_LIST } from '../lib/crops';
import { DappHubId, DappStorageId, PackageId, Network } from 'contracts/deployment';
import {
  SPECIES_NAME,
  RARITY_LABEL,
  RARITY_COLOR,
  FAVORITE_FOOD,
  type PetData
} from '../components/PetPanel';
import { PetAvatar, EggIcon, IconShop } from '../components/PetAvatar';
import { IconGold } from '../components/icons/GameIcons';

// ── BCS helpers ──────────────────────────────────────────────────────────────

function decodeBcsU64(raw: string): bigint {
  let hexStr: string;
  try {
    const arr = JSON.parse(raw) as string[];
    hexStr = arr[0] ?? '0x00';
  } catch {
    hexStr = raw;
  }
  const clean = hexStr.replace(/^0x/i, '');
  const bytes = clean.match(/../g) ?? [];
  const arr8 = Uint8Array.from(bytes.map((b) => parseInt(b, 16)));
  let n = BigInt(0);
  for (let i = 7; i >= 0; i--) n = (n << 8n) | BigInt(arr8[i] ?? 0);
  return n;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CropListing {
  id: string;
  seller: string;
  cropType: number;
  cropName: string;
  amount: bigint;
  price: bigint;
}

interface EggListing {
  id: string;
  seller: string;
  eggType: number; // 1=common 2=rare 3=seasonal
  amount: bigint;
  price: bigint;
}

interface PetListing {
  id: string;
  seller: string;
  pet: PetData;
  price: bigint;
}

const CROP_NAMES: Record<number, string> = { 1: 'wheat', 2: 'corn', 3: 'carrot', 4: 'pumpkin' };
const CROP_BY_NAME: Record<string, number> = { wheat: 1, corn: 2, carrot: 3, pumpkin: 4 };
const EGG_NAMES: Record<number, string> = { 1: 'common_egg', 2: 'rare_egg', 3: 'seasonal_egg' };
const EGG_BY_NAME: Record<string, number> = { common_egg: 1, rare_egg: 2, seasonal_egg: 3 };
const EGG_LABEL: Record<number, string> = { 1: 'Common', 2: 'Rare', 3: 'Seasonal' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const {
    contract: dubhe,
    graphqlClient,
    dappStorageId,
    dappHubId,
    network,
    packageId
  } = useDubhe();
  const storageId = dappStorageId ?? DappStorageId;
  const hubId = dappHubId ?? DappHubId;
  const pkg = packageId ?? PackageId;

  const [activeTab, setActiveTab] = useState<'crops' | 'eggs' | 'pets'>('crops');
  const [isLoading, setIsLoading] = useState(false);
  const [userStorageId, setUserStorageId] = useState<string | null>(null);

  // Crops
  const [cropListings, setCropListings] = useState<CropListing[]>([]);
  const [cropInv, setCropInv] = useState<Record<number, bigint>>({});
  const [listForm, setListForm] = useState({ cropType: 1, amount: 1, pricePerUnit: 10_000_000 });

  // Eggs
  const [eggListings, setEggListings] = useState<EggListing[]>([]);
  const [eggInv, setEggInv] = useState<Record<number, bigint>>({});
  const [eggListForm, setEggListForm] = useState({ eggType: 1, amount: 1, price: 0 });

  // Pets
  const [petListings, setPetListings] = useState<PetListing[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!graphqlClient) return;
    try {
      const result = await graphqlClient.getMarketplaceListings({ status: 'listed' });

      const crops: CropListing[] = [];
      const eggs: EggListing[] = [];
      const pets: PetListing[] = [];

      result.edges.forEach(({ node }) => {
        const { recordType, listingId, seller, price, recordDataRaw } = node;

        if (recordType in CROP_BY_NAME) {
          const amount = decodeBcsU64(recordDataRaw);
          crops.push({
            id: listingId,
            seller,
            cropType: CROP_BY_NAME[recordType],
            cropName: recordType,
            amount,
            price: BigInt(price)
          });
          return;
        }
        if (recordType in EGG_BY_NAME) {
          const amount = decodeBcsU64(recordDataRaw);
          eggs.push({
            id: listingId,
            seller,
            eggType: EGG_BY_NAME[recordType],
            amount,
            price: BigInt(price)
          });
          return;
        }
        if (recordType === 'pet') {
          try {
            // recordDataRaw fields (no slot field): species, rarity, level, xp, happiness, satiety, fed_at, born_at
            const raw = JSON.parse(recordDataRaw) as string[];
            const petData: PetData = {
              petId: listingId, // use listing id as display key; real pet_id is in record_key
              species: parseInt(raw[0] ?? '0x00', 16),
              rarity: parseInt(raw[1] ?? '0x00', 16),
              level: parseInt(raw[2] ?? '0x00', 16),
              xp: 0,
              happiness: parseInt(raw[4] ?? '0x00', 16),
              satiety: parseInt(raw[5] ?? '0x00', 16),
              fedAt: 0,
              bornAt: 0
            };
            pets.push({ id: listingId, seller, pet: petData, price: BigInt(price) });
          } catch {
            /* skip malformed */
          }
        }
      });

      setCropListings(crops);
      setEggListings(eggs);
      setPetListings(pets);
    } catch (err) {
      console.error('[market] fetchAll error:', err);
    }
  }, [graphqlClient]);

  const fetchInventory = useCallback(async () => {
    if (!graphqlClient || !account?.address) return;
    const addr = account.address;
    try {
      const [w, c, ca, p, ce, re, se] = await Promise.all([
        graphqlClient.getTableByCondition<any>('wheat', { entityId: addr }).catch(() => null),
        graphqlClient.getTableByCondition<any>('corn', { entityId: addr }).catch(() => null),
        graphqlClient.getTableByCondition<any>('carrot', { entityId: addr }).catch(() => null),
        graphqlClient.getTableByCondition<any>('pumpkin', { entityId: addr }).catch(() => null),
        graphqlClient.getTableByCondition<any>('common_egg', { entityId: addr }).catch(() => null),
        graphqlClient.getTableByCondition<any>('rare_egg', { entityId: addr }).catch(() => null),
        graphqlClient.getTableByCondition<any>('seasonal_egg', { entityId: addr }).catch(() => null)
      ]);
      setCropInv({
        1: BigInt(w?.amount ?? 0),
        2: BigInt(c?.amount ?? 0),
        3: BigInt(ca?.amount ?? 0),
        4: BigInt(p?.amount ?? 0)
      });
      setEggInv({
        1: BigInt(ce?.amount ?? 0),
        2: BigInt(re?.amount ?? 0),
        3: BigInt(se?.amount ?? 0)
      });
    } catch (err) {
      console.error('[market] fetchInventory error:', err);
    }
  }, [graphqlClient, account?.address]);

  const fetchUserStorageId = useCallback(async () => {
    if (!dubhe || !account?.address) return;
    try {
      setUserStorageId(await dubhe.getUserStorageId(account.address));
    } catch {}
  }, [dubhe, account?.address]);

  useEffect(() => {
    if (account && graphqlClient) {
      fetchAll();
      fetchInventory();
    }
    if (account && dubhe) fetchUserStorageId();
  }, [account, dubhe, graphqlClient, fetchAll, fetchInventory, fetchUserStorageId]);

  // ── Transaction helper ────────────────────────────────────────────────────

  const exec = async (buildFn: (tx: Transaction) => void, successMsg: string) => {
    if (!account) {
      toast.error('Connect wallet first');
      return;
    }
    setIsLoading(true);
    try {
      const tx = new Transaction();
      buildFn(tx);
      await signAndExecuteTransaction(
        { transaction: tx.serialize() as any, chain: `sui:${network ?? 'localnet'}` },
        {
          onSuccess: () => {
            toast.success(successMsg);
            setTimeout(() => {
              fetchAll();
              fetchInventory();
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

  // ── Crop actions ──────────────────────────────────────────────────────────

  const handleListCrop = () => {
    if (!userStorageId) {
      toast.error('UserStorage not found');
      return;
    }
    const name = CROP_NAMES[listForm.cropType];
    const totalMist = BigInt(listForm.pricePerUnit) * BigInt(listForm.amount);
    exec(
      (tx) =>
        tx.moveCall({
          target: `${pkg}::market_system::list_${name}`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId!),
            tx.pure.u64(listForm.amount),
            tx.pure.u64(totalMist)
          ]
        }),
      `Listed ${listForm.amount} ${name}`
    );
  };

  const handleBuyCrop = (l: CropListing) => {
    if (!userStorageId) {
      toast.error('UserStorage not found');
      return;
    }
    exec((tx) => {
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(l.price)]);
      tx.moveCall({
        target: `${pkg}::market_system::buy_${l.cropName}`,
        arguments: [
          tx.object(hubId),
          tx.object(storageId),
          tx.object(l.id),
          tx.object(userStorageId!),
          payment
        ]
      });
    }, `Bought ${l.amount} ${l.cropName}!`);
  };

  const handleCancelCrop = (l: CropListing) => {
    if (!userStorageId) return;
    exec(
      (tx) =>
        tx.moveCall({
          target: `${pkg}::market_system::cancel_${l.cropName}`,
          arguments: [tx.object(l.id), tx.object(userStorageId!)]
        }),
      'Listing cancelled'
    );
  };

  // ── Egg actions ───────────────────────────────────────────────────────────

  const handleListEgg = () => {
    if (!userStorageId) {
      toast.error('UserStorage not found');
      return;
    }
    const name = EGG_NAMES[eggListForm.eggType];
    exec(
      (tx) =>
        tx.moveCall({
          target: `${pkg}::market_system::list_${name}`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId!),
            tx.pure.u64(eggListForm.amount),
            tx.pure.u64(eggListForm.price)
          ]
        }),
      `Listed ${eggListForm.amount} ${EGG_LABEL[eggListForm.eggType]} eggs`
    );
  };

  const handleBuyEgg = (l: EggListing) => {
    if (!userStorageId) {
      toast.error('UserStorage not found');
      return;
    }
    const name = EGG_NAMES[l.eggType];
    exec((tx) => {
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(l.price)]);
      tx.moveCall({
        target: `${pkg}::market_system::buy_${name}`,
        arguments: [
          tx.object(hubId),
          tx.object(storageId),
          tx.object(l.id),
          tx.object(userStorageId!),
          payment
        ]
      });
    }, `Bought ${l.amount} ${EGG_LABEL[l.eggType]} egg(s)!`);
  };

  const handleCancelEgg = (l: EggListing) => {
    if (!userStorageId) return;
    const name = EGG_NAMES[l.eggType];
    exec(
      (tx) =>
        tx.moveCall({
          target: `${pkg}::market_system::cancel_${name}`,
          arguments: [tx.object(l.id), tx.object(userStorageId!)]
        }),
      'Egg listing cancelled'
    );
  };

  // ── Pet actions ───────────────────────────────────────────────────────────

  const handleBuyPet = (l: PetListing) => {
    if (!userStorageId) {
      toast.error('UserStorage not found');
      return;
    }
    exec((tx) => {
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(l.price)]);
      tx.moveCall({
        target: `${pkg}::pet_system::buy_pet`,
        arguments: [
          tx.object(hubId),
          tx.object(storageId),
          tx.object(userStorageId!),
          tx.object(l.id),
          payment
        ]
      });
    }, `${SPECIES_NAME[l.pet.species]} arrived in your ranch!`);
  };

  const handleCancelPetListing = (l: PetListing) => {
    if (!userStorageId) return;
    exec(
      (tx) =>
        tx.moveCall({
          target: `${pkg}::pet_system::cancel_pet_listing`,
          arguments: [tx.object(userStorageId!), tx.object(l.id)]
        }),
      'Pet listing cancelled'
    );
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ConnectButton />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'crops', label: 'Crops' },
    { key: 'eggs', label: 'Eggs' },
    { key: 'pets', label: 'Pets' }
  ] as const;

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ background: 'radial-gradient(ellipse at top, #1a3a1a 0%, #0a1a0a 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <IconShop size={24} />
          <h1 className="font-pixel text-amber-300 text-sm">MARKET</h1>
        </div>
        <ConnectButton />
      </div>

      {/* Nav */}
      <div className="flex gap-2 mb-6">
        {['Farm', 'Market', 'Leaderboard'].map((t) => (
          <a
            key={t}
            href={t === 'Farm' ? '/' : `/${t.toLowerCase()}`}
            className={`px-4 py-2 text-xs font-pixel rounded-lg transition-colors border ${
              t === 'Market'
                ? 'bg-amber-700 text-amber-100 border-amber-600'
                : 'bg-amber-900/40 hover:bg-amber-800/40 text-amber-400 border-amber-700/30'
            }`}
          >
            {t}
          </a>
        ))}
      </div>

      <p className="mb-4 text-xs text-amber-700/60 font-pixel px-1">
        Market requires main wallet signature (session key not permitted by the framework)
      </p>

      {/* Asset tabs */}
      <div className="flex gap-1 mb-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 text-xs font-pixel rounded-xl transition-colors border
                    ${
                      activeTab === key
                        ? 'bg-amber-700 text-amber-100 border-amber-600'
                        : 'bg-amber-900/40 text-amber-500 border-amber-800/40 hover:bg-amber-800/40'
                    }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Crops tab ── */}
      {activeTab === 'crops' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-amber-950/80 border-2 border-amber-700 rounded-2xl p-4 space-y-3">
              <h2 className="font-pixel text-amber-300 text-xs">List Crops</h2>
              <select
                value={listForm.cropType}
                onChange={(e) => setListForm((f) => ({ ...f, cropType: Number(e.target.value) }))}
                className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-3 py-2 text-sm"
              >
                {CROP_LIST.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.name} (owned: {Number(cropInv[c.type] ?? 0n)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={listForm.amount}
                onChange={(e) => setListForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                placeholder="Amount"
                className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-3 py-2 text-sm"
              />
              <div>
                <input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={listForm.pricePerUnit / 1e9}
                  onChange={(e) =>
                    setListForm((f) => ({
                      ...f,
                      pricePerUnit: Math.round(Number(e.target.value) * 1e9)
                    }))
                  }
                  placeholder="Price per unit (SUI)"
                  className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-amber-700 text-xs mt-1">
                  Total: {((listForm.pricePerUnit * listForm.amount) / 1e9).toFixed(4)} SUI
                </p>
              </div>
              <button
                onClick={handleListCrop}
                disabled={isLoading || (cropInv[listForm.cropType] ?? 0n) < BigInt(listForm.amount)}
                className="w-full py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
              >
                {isLoading ? 'Wait...' : 'List Crops'}
              </button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-pixel text-amber-400 text-xs mb-2">Active Listings</h2>
            {cropListings.length === 0 ? (
              <EmptyState text="No crop listings yet." />
            ) : (
              cropListings.map((l) => (
                <ListingRow
                  key={l.id}
                  left={
                    <>
                      <span className="font-pixel text-amber-200 text-xs capitalize">
                        {l.cropName} ×{Number(l.amount)}
                      </span>
                      <span className="text-amber-700 text-xs block">
                        {shortAddr(l.seller)}
                        {l.seller === account.address && (
                          <span className="text-amber-500 ml-1">(you)</span>
                        )}
                      </span>
                    </>
                  }
                  right={
                    <span className="text-amber-400 text-xs">
                      {(Number(l.price) / 1e9).toFixed(4)} SUI
                    </span>
                  }
                  isMine={l.seller === account.address}
                  isLoading={isLoading}
                  onBuy={() => handleBuyCrop(l)}
                  onCancel={() => handleCancelCrop(l)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Eggs tab ── */}
      {activeTab === 'eggs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-amber-950/80 border-2 border-amber-700 rounded-2xl p-4 space-y-3">
              <h2 className="font-pixel text-amber-300 text-xs">List Eggs</h2>
              <select
                value={eggListForm.eggType}
                onChange={(e) => setEggListForm((f) => ({ ...f, eggType: Number(e.target.value) }))}
                className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-3 py-2 text-sm"
              >
                {[1, 2, 3].map((t) => (
                  <option key={t} value={t}>
                    {EGG_LABEL[t]} (owned: {Number(eggInv[t] ?? 0n)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={eggListForm.amount}
                onChange={(e) => setEggListForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                placeholder="Amount"
                className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0.001}
                step={0.001}
                value={eggListForm.price / 1e9}
                onChange={(e) =>
                  setEggListForm((f) => ({ ...f, price: Math.round(Number(e.target.value) * 1e9) }))
                }
                placeholder="Total price (SUI)"
                className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleListEgg}
                disabled={
                  isLoading || (eggInv[eggListForm.eggType] ?? 0n) < BigInt(eggListForm.amount)
                }
                className="w-full py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
              >
                {isLoading ? 'Wait...' : 'List Eggs'}
              </button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-pixel text-amber-400 text-xs mb-2">Egg Listings</h2>
            {eggListings.length === 0 ? (
              <EmptyState text="No egg listings." />
            ) : (
              eggListings.map((l) => (
                <ListingRow
                  key={l.id}
                  left={
                    <div className="flex items-center gap-2">
                      <EggIcon eggType={l.eggType} size={20} />
                      <div>
                        <span className="font-pixel text-amber-200 text-xs">
                          {EGG_LABEL[l.eggType]} Egg x{Number(l.amount)}
                        </span>
                        <span className="text-amber-700 text-xs block">
                          {shortAddr(l.seller)}
                          {l.seller === account.address && (
                            <span className="text-amber-500 ml-1">(you)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  }
                  right={
                    <span className="text-amber-400 text-xs">
                      {(Number(l.price) / 1e9).toFixed(4)} SUI
                    </span>
                  }
                  isMine={l.seller === account.address}
                  isLoading={isLoading}
                  onBuy={() => handleBuyEgg(l)}
                  onCancel={() => handleCancelEgg(l)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Pets tab ── */}
      {activeTab === 'pets' && (
        <div className="space-y-4">
          <p className="text-xs text-amber-600 font-pixel px-1">
            Purchased pets go directly to your ranch. Use Assign on the farm page to activate them.
          </p>

          {petListings.length === 0 ? (
            <EmptyState text="No pet listings yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {petListings.map((l) => {
                const p = l.pet;
                const isMine = l.seller === account.address;
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-950/60 border border-amber-700/40 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <PetAvatar species={p.species} level={p.level} size={40} />
                      <div>
                        <p className="font-pixel text-amber-200 text-xs">
                          {SPECIES_NAME[p.species]}
                        </p>
                        <p className={`text-xs ${RARITY_COLOR[p.rarity]}`}>
                          {RARITY_LABEL[p.rarity]} · Lv.{p.level}
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="font-pixel text-amber-400 text-xs">
                          {(Number(l.price) / 1e9).toFixed(4)} SUI
                        </p>
                        <p className="text-amber-700 text-xs">
                          {shortAddr(l.seller)}
                          {isMine && <span className="text-amber-500"> (you)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-amber-500">
                      <span>Satiety: {p.satiety}%</span>
                      <span>Happy: {p.happiness}%</span>
                      <span>Fav: {FAVORITE_FOOD[p.species]}</span>
                    </div>
                    {isMine ? (
                      <button
                        onClick={() => handleCancelPetListing(l)}
                        disabled={isLoading}
                        className="w-full py-1.5 bg-red-900/60 hover:bg-red-800 text-red-300 text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyPet(l)}
                        disabled={isLoading}
                        className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Buy → Ranch
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared mini-components ────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-8 text-center">
      <p className="text-amber-600 font-pixel text-xs">{text}</p>
    </div>
  );
}

function ListingRow({
  left,
  right,
  isMine,
  isLoading,
  onBuy,
  onCancel
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  isMine: boolean;
  isLoading: boolean;
  onBuy: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between bg-amber-900/30 border border-amber-800/40 rounded-xl px-4 py-3"
    >
      <div>{left}</div>
      <div className="flex items-center gap-3">
        {right}
        {isMine ? (
          <button
            disabled={isLoading}
            onClick={onCancel}
            className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            disabled={isLoading}
            onClick={onBuy}
            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
          >
            Buy
          </button>
        )}
      </div>
    </motion.div>
  );
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
