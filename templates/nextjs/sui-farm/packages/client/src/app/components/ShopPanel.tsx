'use client';

import { useState } from 'react';
import { CROP_LIST } from '../lib/crops';
import { SeedBagIcon, IconWheat, IconCorn, IconCarrot, IconPumpkin } from './icons/GameIcons';

const MAX_PLOTS = 12;

const CROP_ICONS: Record<number, React.ReactNode> = {
  1: <IconWheat size={24} />,
  2: <IconCorn size={24} />,
  3: <IconCarrot size={24} />,
  4: <IconPumpkin size={24} />
};

interface ShopPanelProps {
  gold: bigint;
  inventory: Record<number, bigint>; // seeds
  cropInventory: Record<number, bigint>; // harvested crops
  plotsOwned: number;
  onBuySeeds: (cropType: number, count: number) => void;
  onBuyPlot: () => void;
  onSellCrops: (cropType: number, amount: number) => void;
  isLoading?: boolean;
}

export function ShopPanel({
  gold,
  inventory,
  cropInventory,
  plotsOwned,
  onBuySeeds,
  onBuyPlot,
  onSellCrops,
  isLoading
}: ShopPanelProps) {
  const [tab, setTab] = useState<'seeds' | 'sell' | 'land'>('seeds');

  return (
    <div className="bg-amber-950/80 border-2 border-amber-700 rounded-2xl p-4">
      <h2 className="font-pixel text-amber-300 text-xs mb-3">Shop</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['seeds', 'sell', 'land'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1 text-xs font-pixel rounded-lg transition-colors capitalize
              ${
                tab === t
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-amber-900/40 text-amber-500 hover:bg-amber-800/40'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Seeds tab ── */}
      {tab === 'seeds' && (
        <div className="space-y-2">
          {CROP_LIST.map((crop) => {
            const canAfford = gold >= BigInt(crop.seedPrice);
            const owned = Number(inventory[crop.type] ?? BigInt(0));
            return (
              <div
                key={crop.type}
                className="flex items-center justify-between bg-amber-900/30 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <SeedBagIcon cropType={crop.type} size={28} />
                  <div>
                    <p className="font-pixel text-xs text-amber-200">{crop.name} Seed</p>
                    <p className="text-xs text-amber-500">
                      {crop.seedPrice}g · yields {crop.yieldPerSeed}× · in bag: {owned}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 5, 10].map((qty) => (
                    <button
                      key={qty}
                      disabled={!canAfford || isLoading || gold < BigInt(crop.seedPrice * qty)}
                      onClick={() => onBuySeeds(crop.type, qty)}
                      className="px-2 py-1 text-xs bg-green-800 hover:bg-green-700 text-white rounded
                                 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ×{qty}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sell tab ── */}
      {tab === 'sell' && (
        <div className="space-y-2">
          {CROP_LIST.map((crop) => {
            const held = Number(cropInventory[crop.type] ?? BigInt(0));
            const canSell = held > 0 && !isLoading;
            return (
              <div
                key={crop.type}
                className="flex items-center justify-between bg-amber-900/30 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {CROP_ICONS[crop.type]}
                  <div>
                    <p className="font-pixel text-xs text-amber-200">{crop.name}</p>
                    <p className="text-xs text-amber-500">
                      {crop.sellPrice}g each · held:{' '}
                      <span className={held > 0 ? 'text-amber-300' : ''}>{held}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {([1, 5, 'all'] as const).map((qty) => {
                    const sellAmt = qty === 'all' ? held : qty;
                    return (
                      <button
                        key={qty}
                        disabled={!canSell || held < (qty === 'all' ? 1 : qty)}
                        onClick={() => onSellCrops(crop.type, sellAmt)}
                        className="px-2 py-1 text-xs bg-rose-800 hover:bg-rose-700 text-white rounded
                                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {qty === 'all' ? 'All' : `×${qty}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Estimated revenue preview */}
          <div className="mt-2 px-3 py-2 bg-amber-900/20 rounded-lg">
            <p className="text-[10px] font-pixel text-amber-600 mb-1">Sell All Preview</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {CROP_LIST.map((crop) => {
                const held = Number(cropInventory[crop.type] ?? 0);
                const value = held * crop.sellPrice;
                return (
                  <span
                    key={crop.type}
                    className={`text-xs tabular-nums ${
                      held > 0 ? 'text-amber-300' : 'text-amber-800'
                    }`}
                  >
                    {crop.name[0]}: {value}g
                  </span>
                );
              })}
              <span className="text-xs text-amber-400 font-bold ml-auto">
                Total:{' '}
                {CROP_LIST.reduce(
                  (sum, c) => sum + Number(cropInventory[c.type] ?? 0) * c.sellPrice,
                  0
                )}
                g
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Land tab ── */}
      {tab === 'land' && (
        <div className="space-y-3">
          <div className="bg-amber-900/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-pixel text-xs text-amber-200">Farm Plots</p>
              <span className="font-pixel text-xs text-amber-400">
                {plotsOwned} / {MAX_PLOTS}
              </span>
            </div>

            {/* 4×3 mini plot grid — mirrors the in-game isometric layout */}
            <div className="grid grid-cols-3 gap-1 mb-3">
              {Array.from({ length: MAX_PLOTS }).map((_, i) => {
                const owned = i < plotsOwned;
                return (
                  <div
                    key={i}
                    title={owned ? `Plot ${i + 1} (owned)` : `Plot ${i + 1} (locked)`}
                    className={`h-5 rounded flex items-center justify-center text-[8px] font-pixel
                      transition-colors
                      ${
                        owned
                          ? 'bg-green-800/70 border border-green-600 text-green-300'
                          : 'bg-amber-950/60 border border-amber-800/40 text-amber-700'
                      }`}
                  >
                    {owned ? i + 1 : '·'}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-amber-950/60 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-500"
                style={{ width: `${(plotsOwned / MAX_PLOTS) * 100}%` }}
              />
            </div>

            {plotsOwned < MAX_PLOTS ? (
              <button
                disabled={gold < BigInt(200) || isLoading}
                onClick={onBuyPlot}
                className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-pixel
                           rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reclaim Land · 200g
              </button>
            ) : (
              <p className="text-xs text-green-400 font-pixel text-center">
                All 12 plots reclaimed!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
