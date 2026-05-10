'use client';

import { CROP_LIST } from '../lib/crops';
import {
  SeedBagIcon,
  IconGold,
  IconWheat,
  IconCorn,
  IconCarrot,
  IconPumpkin,
  IconPlots
} from './icons/GameIcons';

interface ResourceHUDProps {
  gold: bigint;
  inventory: Record<number, bigint>; // harvested crops
  seedInventory: Record<number, bigint>; // seeds (buyable, plantable)
  plotsOwned: number;
}

const CROP_ICONS = {
  1: <IconWheat size={18} />,
  2: <IconCorn size={18} />,
  3: <IconCarrot size={18} />,
  4: <IconPumpkin size={18} />
} as Record<number, React.ReactNode>;

export function ResourceHUD({ gold, inventory, seedInventory, plotsOwned }: ResourceHUDProps) {
  return (
    <div
      className="
      flex flex-col gap-1
      bg-[#2A1A0E] border-2 border-[#C8A96E]
      rounded-lg px-3 py-2
      shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.5)]
    "
    >
      {/* Row 1: Gold + plots */}
      <div className="flex flex-wrap gap-1 items-center">
        {/* Gold */}
        <div className="flex items-center gap-2 px-3 py-1">
          <IconGold size={20} />
          <div>
            <p className="text-[9px] text-[#8B7355] font-pixel uppercase tracking-widest leading-none">
              Gold
            </p>
            <p className="text-sm text-[#FFD700] font-bold leading-tight tabular-nums">
              {Number(gold).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="w-px self-stretch bg-[#5C3D1A] mx-1" />

        {/* Plots */}
        <div className="flex items-center gap-2 px-3 py-1">
          <IconPlots size={20} />
          <div>
            <p className="text-[9px] text-[#8B7355] font-pixel uppercase tracking-widest leading-none">
              Plots
            </p>
            <p className="text-sm text-[#F5E6C8] font-bold leading-tight">
              {plotsOwned}
              <span className="text-[#5C3D1A]">/12</span>
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#3C2010] mx-1" />

      {/* Row 2: Seeds */}
      <div className="flex flex-wrap gap-0.5 items-center px-1">
        <span className="text-[8px] font-pixel text-[#6B4E20] uppercase tracking-widest mr-1 whitespace-nowrap">
          Seeds
        </span>
        {CROP_LIST.map((crop) => {
          const amount = Number(seedInventory[crop.type] ?? BigInt(0));
          return (
            <div
              key={crop.type}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#1A0E06]/40"
            >
              <SeedBagIcon cropType={crop.type} size={18} />
              <span
                className={`text-xs font-bold tabular-nums ${
                  amount > 0 ? 'text-[#DAA520]' : 'text-[#5C3D1A]'
                }`}
              >
                {amount}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-[#3C2010] mx-1" />

      {/* Row 3: Harvested crops */}
      <div className="flex flex-wrap gap-0.5 items-center px-1">
        <span className="text-[8px] font-pixel text-[#6B4E20] uppercase tracking-widest mr-1 whitespace-nowrap">
          Crops
        </span>
        {CROP_LIST.map((crop) => {
          const amount = Number(inventory[crop.type] ?? BigInt(0));
          return (
            <div
              key={crop.type}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#1A0E06]/40"
            >
              {CROP_ICONS[crop.type]}
              <span
                className={`text-xs font-bold tabular-nums ${
                  amount > 0 ? 'text-[#F5E6C8]' : 'text-[#5C3D1A]'
                }`}
              >
                {amount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
