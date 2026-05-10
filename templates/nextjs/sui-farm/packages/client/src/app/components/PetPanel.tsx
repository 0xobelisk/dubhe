'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PetAvatar,
  EggIcon,
  IconPaw,
  IconFeed,
  IconTag,
  IconWarning,
  IconHeart,
  IconStar
} from './PetAvatar';
import { IconGold } from './icons/GameIcons';

// ── Constants ─────────────────────────────────────────────────────────────────

export const SPECIES_NAME: Record<number, string> = {
  0: 'Unknown',
  1: 'Bunny',
  2: 'Chick',
  3: 'Fox',
  4: 'Deer',
  5: 'Dragon'
};
export const RARITY_LABEL: Record<number, string> = {
  0: 'Common',
  1: 'Uncommon',
  2: 'Rare'
};
export const RARITY_COLOR: Record<number, string> = {
  0: 'text-gray-400',
  1: 'text-blue-400',
  2: 'text-purple-400'
};
export const FAVORITE_FOOD: Record<number, string> = {
  1: 'Carrot',
  2: 'Wheat',
  3: 'Pumpkin',
  4: 'Corn',
  5: 'Any'
};
export const CROP_SHORT: Record<number, string> = { 1: 'W', 2: 'C', 3: 'Ca', 4: 'P' };
export const CROP_FULL: Record<number, string> = {
  1: 'Wheat',
  2: 'Corn',
  3: 'Carrot',
  4: 'Pumpkin'
};

const EGG_NAME: Record<number, string> = { 1: 'Common', 2: 'Rare', 3: 'Seasonal' };
const EGG_PRICE: Record<number, number> = { 1: 80, 2: 300, 3: 500 };
const EGG_RARITY_COLOR: Record<number, string> = {
  1: 'border-amber-700/60 bg-amber-900/30',
  2: 'border-purple-700/60 bg-purple-900/20',
  3: 'border-yellow-600/60 bg-yellow-900/20'
};

const XP_PER_LEVEL = 100;
const MAX_LEVEL = 10;
const SATIETY_DRAIN_INTERVAL_MS = 4 * 60 * 60 * 1000;
const SATIETY_DRAIN_AMOUNT = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PetData {
  petId: string;
  species: number;
  rarity: number;
  level: number;
  xp: number;
  happiness: number;
  satiety: number;
  fedAt: number;
  bornAt: number;
}

export interface PetHatchData {
  eggType: number;
  hatchAt: number;
}

export interface PetInventory {
  commonEgg: bigint;
  rareEgg: bigint;
  seasonalEgg: bigint;
  slotsOwned: number;
  hatch: PetHatchData | null;
  activeSlots: (PetData | null)[];
  ranchPets: PetData[];
}

interface PetPanelProps {
  gold: bigint;
  inventory: PetInventory;
  cropInventory: Record<number, bigint>;
  isLoading: boolean;
  onBuyEgg: (eggType: number) => void;
  onStartHatch: (eggType: number) => void;
  onOpenEgg: () => void;
  onFeedPet: (petId: string, cropType: number, amount: number) => void;
  onBuySlot: () => void;
  onDismissPet: (petId: string) => void;
  onListPet: (petId: string, price: bigint) => void;
  onAssignSlot: (petId: string, slot: number) => void;
  onUnassignSlot: (slot: number) => void;
}

// ── Selection state ────────────────────────────────────────────────────────────

interface Selection {
  pet: PetData;
  context: 'active' | 'ranch';
  slot?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeCurrentSatiety(pet: PetData, now: number): number {
  const elapsed = now - pet.fedAt;
  const drained = Math.floor(elapsed / SATIETY_DRAIN_INTERVAL_MS) * SATIETY_DRAIN_AMOUNT;
  return Math.max(0, pet.satiety - drained);
}

function satietyBarColor(s: number) {
  if (s >= 60) return 'bg-green-500';
  if (s >= 30) return 'bg-yellow-500';
  return 'bg-red-500';
}
function happinessBarColor(h: number) {
  if (h >= 60) return 'bg-pink-400';
  if (h >= 30) return 'bg-yellow-400';
  return 'bg-gray-500';
}

function stageLabel(level: number) {
  if (level >= 7) return { label: 'Adult', color: 'text-purple-400' };
  if (level >= 4) return { label: 'Young', color: 'text-blue-400' };
  return { label: 'Baby', color: 'text-green-400' };
}

function petBonus(species: number, level: number): string {
  const tier = level >= 7 ? 2 : 1;
  const pct = tier === 2 ? 20 : 10;
  if (species === 1) return `Carrot yield +${pct}%`;
  if (species === 2) return `Wheat grows ${pct}% faster`;
  if (species === 3) return `Sell price +${pct}%${tier === 2 ? ' + Scarecrow +2h' : ''}`;
  if (species === 4) return `All crop yield +${Math.round(pct * 0.75)}%`;
  if (species === 5) return `All bonuses +${pct + 5}%${tier === 2 ? ' + Season x1.5' : ''}`;
  return '';
}

/** Returns the species-specific idle CSS animation class, modified by satiety. */
function petIdleClass(species: number, satiety: number): string {
  if (satiety < 30) return 'pet-anim-starving';
  const base: Record<number, string> = {
    1: 'pet-anim-bunny',
    2: 'pet-anim-chick',
    3: 'pet-anim-fox',
    4: 'pet-anim-deer',
    5: 'pet-anim-dragon'
  };
  const cls = base[species] ?? '';
  return satiety < 60 ? `${cls} pet-anim-slow` : cls;
}

// ── Particle types ────────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  type: 'heart' | 'star';
  sx?: number;
  sy?: number;
}

// ── StatBar ───────────────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  colorClass
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-amber-600 w-14 shrink-0 font-pixel">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-2 rounded-full ${colorClass}`}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-amber-500 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

// ── SlotCell — large visual habitat box ───────────────────────────────────────

function SlotCell({
  pet,
  slot,
  isOwned,
  isSelected,
  isLoading,
  slotsOwned,
  onSelect,
  onBuySlot
}: {
  pet: PetData | null;
  slot: number;
  isOwned: boolean;
  isSelected: boolean;
  isLoading: boolean;
  slotsOwned: number;
  onSelect: (sel: Selection) => void;
  onBuySlot: () => void;
}) {
  const now = Date.now();

  // Locked slot
  if (!isOwned) {
    return (
      <motion.button
        onClick={onBuySlot}
        disabled={isLoading}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex-1 h-32 border-2 border-dashed border-amber-800/30 rounded-xl
                   flex flex-col items-center justify-center gap-1
                   bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-700/50
                   transition-all disabled:opacity-40"
      >
        <span className="text-2xl text-amber-800">+</span>
        <span className="text-amber-700 text-xs font-pixel">Slot {slot + 1}</span>
        <span className="text-amber-800 text-xs">{slotsOwned === 1 ? '200g' : '500g'}</span>
      </motion.button>
    );
  }

  // Owned but empty
  if (!pet) {
    return (
      <div
        className="flex-1 h-32 border-2 border-dashed border-amber-800/30 rounded-xl
                      flex flex-col items-center justify-center gap-1
                      bg-gradient-to-b from-slate-900/30 to-amber-950/30"
      >
        <span className="text-amber-800 text-xs font-pixel">Slot {slot + 1}</span>
        <span className="text-amber-900 text-xs">Empty</span>
      </div>
    );
  }

  const satiety = computeCurrentSatiety(pet, now);
  const hungry = satiety < 30;

  return (
    <motion.div
      onClick={() => onSelect({ pet, context: 'active', slot })}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={`flex-1 h-32 rounded-xl overflow-hidden cursor-pointer relative
                  bg-gradient-to-b from-slate-900/60 via-green-950/40 to-amber-950/50
                  border-2 transition-all select-none
                  ${
                    isSelected
                      ? 'pet-selected'
                      : hungry
                      ? 'border-red-700/50'
                      : 'border-amber-800/30 hover:border-amber-700/50'
                  }`}
    >
      {/* Sky gradient top */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent pointer-events-none" />

      {/* Slot number */}
      <div className="absolute top-1.5 left-2 text-amber-700/60 text-xs font-pixel">{slot + 1}</div>

      {/* Hunger warning badge */}
      {hungry && (
        <motion.div
          className="absolute top-1 right-1.5 z-10"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        >
          <IconWarning size={13} />
        </motion.div>
      )}

      {/* Pet sprite with species animation */}
      <div
        className={`flex items-center justify-center h-20 relative z-10 ${petIdleClass(
          pet.species,
          satiety
        )}`}
      >
        <PetAvatar species={pet.species} level={pet.level} size={56} />
      </div>

      {/* Ground strip */}
      <div className="absolute bottom-5 left-0 right-0 h-2 bg-green-900/60 ground-shimmer pointer-events-none" />
      <div className="absolute bottom-3 left-0 right-0 h-2 bg-green-950/50 pointer-events-none" />

      {/* Species + level label */}
      <div className="absolute bottom-5 left-0 right-0 flex justify-center">
        <span className="text-amber-600/70 text-xs font-pixel leading-none">
          {SPECIES_NAME[pet.species]} Lv.{pet.level}
        </span>
      </div>

      {/* Satiety bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-900/70">
        <motion.div
          className={`h-full ${satietyBarColor(satiety)}`}
          initial={false}
          animate={{ width: `${satiety}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

// ── RanchCell — compact grid portrait ─────────────────────────────────────────

function RanchCell({
  pet,
  isSelected,
  onSelect
}: {
  pet: PetData;
  isSelected: boolean;
  onSelect: (sel: Selection) => void;
}) {
  const now = Date.now();
  const satiety = computeCurrentSatiety(pet, now);
  const hungry = satiety < 30;

  return (
    <motion.div
      onClick={() => onSelect({ pet, context: 'ranch' })}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      className={`w-16 h-20 rounded-xl overflow-hidden cursor-pointer relative
                  bg-gradient-to-b from-slate-900/50 to-amber-950/60
                  border-2 transition-all select-none
                  ${
                    isSelected
                      ? 'pet-selected'
                      : hungry
                      ? 'border-red-700/50'
                      : 'border-amber-800/30 hover:border-amber-600/50'
                  }`}
    >
      {/* Hunger badge */}
      {hungry && (
        <motion.div
          className="absolute top-0.5 right-0.5 z-10"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        >
          <IconWarning size={10} />
        </motion.div>
      )}

      {/* Pet sprite */}
      <div
        className={`flex items-center justify-center h-12 pt-1 ${petIdleClass(
          pet.species,
          satiety
        )}`}
      >
        <PetAvatar species={pet.species} level={pet.level} size={38} />
      </div>

      {/* Level label */}
      <div className="text-center">
        <span className="text-amber-700 text-xs font-pixel">Lv.{pet.level}</span>
      </div>

      {/* Satiety bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-900/70">
        <div
          className={`h-full transition-all duration-700 ${satietyBarColor(satiety)}`}
          style={{ width: `${satiety}%` }}
        />
      </div>
    </motion.div>
  );
}

// ── PetDetailPane — inline interactive detail view ────────────────────────────

function PetDetailPane({
  selection,
  isLoading,
  cropInventory,
  emptySlots,
  onFeed,
  onDismiss,
  onList,
  onAssignSlot,
  onUnassign,
  onClose
}: {
  selection: Selection;
  isLoading: boolean;
  cropInventory: Record<number, bigint>;
  emptySlots: number[];
  onFeed: (cropType: number, amount: number) => void;
  onDismiss: () => void;
  onList: (price: bigint) => void;
  onAssignSlot: (slot: number) => void;
  onUnassign: () => void;
  onClose: () => void;
}) {
  const { pet, context } = selection;

  const [showFeed, setShowFeed] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [feedCrop, setFeedCrop] = useState(3);
  const [feedAmt, setFeedAmt] = useState(1);
  const [listPrice, setListPrice] = useState('');
  const [isEating, setIsEating] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [levelBanner, setLevelBanner] = useState<string | null>(null);
  const [glowing, setGlowing] = useState(false);
  const particleId = useRef(0);
  const prevLevel = useRef(pet.level);

  const now = Date.now();
  const satiety = computeCurrentSatiety(pet, now);
  const xpPct = pet.level >= MAX_LEVEL ? 100 : Math.floor((pet.xp / XP_PER_LEVEL) * 100);
  const stage = stageLabel(pet.level);

  // Level-up detection
  useEffect(() => {
    if (pet.level > prevLevel.current) {
      setLevelBanner(`Lv.${prevLevel.current} → Lv.${pet.level}!`);
      setGlowing(true);
      const id = ++particleId.current;
      const stars: Particle[] = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return {
          id: id * 100 + i,
          x: 0,
          y: 0,
          type: 'star' as const,
          sx: Math.round(Math.cos(angle) * 44),
          sy: Math.round(Math.sin(angle) * 44) - 10
        };
      });
      setParticles((p) => [...p, ...stars]);
      setTimeout(
        () => setParticles((p) => p.filter((x) => !stars.find((s) => s.id === x.id))),
        900
      );
      setTimeout(() => setLevelBanner(null), 2200);
      setTimeout(() => setGlowing(false), 1800);
    }
    prevLevel.current = pet.level;
  }, [pet.level]);

  const triggerFeedFx = useCallback(() => {
    setIsEating(true);
    setTimeout(() => setIsEating(false), 400);
    const id = ++particleId.current;
    const hearts: Particle[] = Array.from({ length: 5 }, (_, i) => ({
      id: id * 10 + i,
      x: (Math.random() - 0.5) * 40,
      y: 0,
      type: 'heart' as const
    }));
    setParticles((p) => [...p, ...hearts]);
    setTimeout(
      () => setParticles((p) => p.filter((h) => !hearts.find((n) => n.id === h.id))),
      1000
    );
  }, []);

  const handleFeed = () => {
    onFeed(feedCrop, feedAmt);
    triggerFeedFx();
    setShowFeed(false);
  };

  // Re-open with clean state when pet changes
  useEffect(() => {
    setShowFeed(false);
    setShowList(false);
    setShowAssign(false);
    setListPrice('');
    setFeedAmt(1);
  }, [pet.petId]);

  const canFeed = !isLoading && Number(cropInventory[feedCrop] ?? 0) >= feedAmt;

  return (
    <motion.div
      key={pet.petId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="bg-amber-950/80 border border-amber-600/40 rounded-xl p-3 space-y-3"
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 relative">
        {/* Particle layer over avatar */}
        <div className="absolute top-0 left-4 pointer-events-none z-20">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute"
              style={
                { '--sx': `${p.sx ?? p.x}px`, '--sy': `${p.sy ?? p.y}px` } as React.CSSProperties
              }
            >
              <span
                className={
                  p.type === 'star' ? 'star-burst inline-block' : 'heart-float inline-block'
                }
              >
                {p.type === 'star' ? <IconStar size={11} /> : <IconHeart size={9} />}
              </span>
            </span>
          ))}
        </div>

        {/* Large animated avatar */}
        <div
          className={`shrink-0 relative ${petIdleClass(pet.species, satiety)}
                         ${isEating ? 'pet-eating' : ''} ${glowing ? 'level-up-glow' : ''}`}
        >
          <PetAvatar species={pet.species} level={pet.level} size={72} />
          {satiety < 30 && (
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            >
              <IconWarning size={14} />
            </motion.div>
          )}
        </div>

        {/* Identity block */}
        <div className="flex-1 min-w-0">
          {/* Level-up banner */}
          <AnimatePresence>
            {levelBanner && (
              <motion.div
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                className="font-pixel text-yellow-400 text-xs mb-1"
              >
                {levelBanner}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-pixel text-amber-200 text-sm">{SPECIES_NAME[pet.species]}</span>
            <span className={`text-xs ${RARITY_COLOR[pet.rarity]}`}>
              {RARITY_LABEL[pet.rarity]}
            </span>
            <span className={`text-xs font-pixel ${stage.color}`}>{stage.label}</span>
          </div>
          <p className="text-amber-600 text-xs mt-0.5">
            Lv.{pet.level} · Fav: {FAVORITE_FOOD[pet.species]}
          </p>

          {/* XP bar */}
          {pet.level < MAX_LEVEL && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-amber-800 w-5">XP</span>
              <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={false}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <span className="text-xs text-amber-700 tabular-nums">
                {pet.xp}/{XP_PER_LEVEL}
              </span>
            </div>
          )}

          {/* Farm bonus (active only, lv4+) */}
          {context === 'active' && pet.level >= 4 && (
            <p className="text-xs text-emerald-400 font-pixel mt-1">
              + {petBonus(pet.species, pet.level)}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="shrink-0 text-amber-700 hover:text-amber-400 text-sm leading-none transition-colors"
        >
          x
        </button>
      </div>

      {/* ── Stat bars ── */}
      <div className="space-y-1.5">
        <StatBar label="Satiety" value={satiety} colorClass={satietyBarColor(satiety)} />
        <StatBar
          label="Happy"
          value={pet.happiness}
          colorClass={happinessBarColor(pet.happiness)}
        />
      </div>

      {/* ── Action buttons row ── */}
      <div className="flex flex-wrap gap-1.5">
        <motion.button
          onClick={() => {
            setShowFeed(!showFeed);
            setShowList(false);
            setShowAssign(false);
          }}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-pixel
                      disabled:opacity-50 transition-colors
                      ${
                        showFeed
                          ? 'bg-green-700 text-white'
                          : 'bg-green-900/60 hover:bg-green-800/80 text-green-300'
                      }`}
        >
          <IconFeed size={12} /> Feed
        </motion.button>

        {context === 'active' && (
          <motion.button
            onClick={() => {
              onUnassign();
              onClose();
            }}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-pixel
                       bg-amber-900/60 hover:bg-amber-800/80 text-amber-300 disabled:opacity-50 transition-colors"
          >
            Ranch
          </motion.button>
        )}
        {context === 'ranch' && (
          <motion.button
            onClick={() => {
              setShowAssign(!showAssign);
              setShowFeed(false);
              setShowList(false);
            }}
            disabled={isLoading || emptySlots.length === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-pixel
                        disabled:opacity-50 transition-colors
                        ${
                          showAssign
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300'
                        }`}
            title={emptySlots.length === 0 ? 'All slots occupied' : 'Put in active slot'}
          >
            Activate
          </motion.button>
        )}

        <motion.button
          onClick={() => {
            setShowList(!showList);
            setShowFeed(false);
            setShowAssign(false);
          }}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-pixel
                      disabled:opacity-50 transition-colors
                      ${
                        showList
                          ? 'bg-blue-700 text-white'
                          : 'bg-blue-900/60 hover:bg-blue-800/80 text-blue-300'
                      }`}
        >
          <IconTag size={12} /> List
        </motion.button>

        <motion.button
          onClick={() => {
            onDismiss();
            onClose();
          }}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-pixel
                     bg-red-950/60 hover:bg-red-900/60 text-red-400 disabled:opacity-50 transition-colors"
          title="Permanently release this pet"
        >
          Dismiss
        </motion.button>
      </div>

      {/* ── Feed panel ── */}
      <AnimatePresence>
        {showFeed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-2 border-t border-amber-800/30">
              {/* Crop type selector */}
              <div className="grid grid-cols-4 gap-1 pt-2">
                {[1, 2, 3, 4].map((ct) => {
                  const amt = Number(cropInventory[ct] ?? 0);
                  const isFav = FAVORITE_FOOD[pet.species] === CROP_FULL[ct];
                  return (
                    <button
                      key={ct}
                      onClick={() => setFeedCrop(ct)}
                      className={`py-1.5 rounded-lg text-xs font-pixel transition-colors relative
                        ${
                          feedCrop === ct
                            ? 'bg-amber-700 text-white'
                            : 'bg-amber-900/40 text-amber-400 hover:bg-amber-800/50'
                        }`}
                    >
                      {isFav && (
                        <span className="absolute -top-1 -right-1">
                          <IconHeart size={8} />
                        </span>
                      )}
                      <div>{CROP_SHORT[ct]}</div>
                      <div className="text-amber-600 text-xs opacity-70">{amt}</div>
                    </button>
                  );
                })}
              </div>
              {/* Amount + feed button */}
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  max={Number(cropInventory[feedCrop] ?? 0)}
                  value={feedAmt}
                  onChange={(e) => setFeedAmt(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-gray-800/80 text-amber-200 text-xs rounded-lg px-2 py-1.5 border border-amber-700/40"
                />
                <motion.button
                  onClick={handleFeed}
                  disabled={!canFeed}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-pixel
                             py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  Feed x{feedAmt}
                  {FAVORITE_FOOD[pet.species] === CROP_FULL[feedCrop] ? ' (Fav!)' : ''}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Assign slot picker ── */}
      <AnimatePresence>
        {showAssign && context === 'ranch' && emptySlots.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1 border-t border-amber-800/30">
              <p className="text-amber-600 text-xs font-pixel mb-2 pt-1">
                Pick a slot to activate:
              </p>
              <div className="flex gap-2">
                {emptySlots.map((s) => (
                  <motion.button
                    key={s}
                    onClick={() => {
                      onAssignSlot(s);
                      onClose();
                    }}
                    disabled={isLoading}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white
                               text-xs font-pixel py-2 rounded-lg disabled:opacity-50"
                  >
                    Slot {s + 1}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List price panel ── */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1 border-t border-amber-800/30">
              <div className="flex gap-2 items-center pt-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Price (MIST)"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  className="flex-1 bg-gray-800/80 text-amber-200 text-xs rounded-lg px-2 py-1.5 border border-amber-700/40"
                />
                <motion.button
                  onClick={() => {
                    const p = BigInt(listPrice || '0');
                    if (p > 0n) {
                      onList(p);
                      setShowList(false);
                      setListPrice('');
                      onClose();
                    }
                  }}
                  disabled={isLoading || !listPrice || BigInt(listPrice || '0') <= 0n}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-pixel
                             px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  List
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── EggIncubator ──────────────────────────────────────────────────────────────

function EggIncubator({
  hatch,
  isLoading,
  onOpenEgg
}: {
  hatch: PetHatchData;
  isLoading: boolean;
  onOpenEgg: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [cracking, setCracking] = useState(false);
  // Tracks whether we've already fired the tx; cleared only on tx failure (isLoading → false).
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // If loading stopped but the hatch record still exists (tx failed), reset all local state.
  useEffect(() => {
    if (!isLoading && (cracking || submitted)) {
      setCracking(false);
      setSubmitted(false);
    }
  }, [isLoading]);

  const ready = now >= hatch.hatchAt;
  const refMs = 5 * 60 * 1000;
  const startMs = hatch.hatchAt - refMs;
  const elapsed = now - startMs;
  const progress = Math.min(100, Math.round((elapsed / refMs) * 100));
  const secsLeft = Math.max(0, Math.ceil((hatch.hatchAt - now) / 1000));
  const eggClass = ready ? 'egg-ready egg-glow' : progress > 80 ? 'egg-rocking' : '';

  const handleOpen = () => {
    setCracking(true);
    setSubmitted(true);
    setTimeout(() => onOpenEgg(), 450);
  };

  // Show "Hatching..." while transaction is in flight OR after it succeeds
  // (submitted=true stays true until parent clears hatch via optimistic update).
  const showHatching = submitted && (isLoading || cracking);

  return (
    <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-4 text-center space-y-3">
      {showHatching ? (
        // Transaction pending — animated loading state
        <div className="py-4 space-y-3">
          <div className="inline-block pet-pop-in">
            <IconPaw size={40} />
          </div>
          <p className="font-pixel text-emerald-300 text-xs animate-pulse">Hatching...</p>
          <p className="text-amber-700 text-xs">Waiting for confirmation...</p>
        </div>
      ) : (
        <>
          <div className="relative inline-block">
            {cracking && !showHatching ? (
              // Crack animation (450ms window before tx fires)
              <div className="relative w-12 h-12 mx-auto">
                <span className="absolute inset-0 flex items-center justify-center egg-crack-left">
                  <EggIcon eggType={hatch.eggType} size={48} />
                </span>
                <span className="absolute inset-0 flex items-center justify-center egg-crack-right">
                  <EggIcon eggType={hatch.eggType} size={48} />
                </span>
              </div>
            ) : (
              <span className={`inline-block ${eggClass}`}>
                <EggIcon eggType={hatch.eggType} size={48} />
              </span>
            )}
          </div>

          <p className="font-pixel text-amber-300 text-xs">{EGG_NAME[hatch.eggType]} Egg</p>

          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 rounded-full bg-emerald-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>

          {ready ? (
            <>
              <p className="text-emerald-400 text-xs font-pixel animate-pulse">Ready to hatch!</p>
              <p className="text-amber-700 text-[10px] leading-snug px-1">
                Starting incubation was step 1. This button sends the on-chain transaction that
                creates your pet.
              </p>
              <motion.button
                onClick={handleOpen}
                disabled={isLoading || cracking || submitted}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white
                           font-pixel text-xs py-2 rounded-xl disabled:opacity-50 transition-colors"
              >
                Open Egg
              </motion.button>
            </>
          ) : (
            <>
              <p className="text-amber-700 text-[10px] px-1">
                When the bar fills, tap Open Egg below to claim your pet (second on-chain step).
              </p>
              <p className="text-amber-500 text-xs tabular-nums">
                {Math.floor(secsLeft / 60)}m {secsLeft % 60}s remaining ({progress}%)
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main PetPanel ─────────────────────────────────────────────────────────────

export function PetPanel({
  gold,
  inventory,
  cropInventory,
  isLoading,
  onBuyEgg,
  onStartHatch,
  onOpenEgg,
  onFeedPet,
  onBuySlot,
  onDismissPet,
  onListPet,
  onAssignSlot,
  onUnassignSlot
}: PetPanelProps) {
  const [tab, setTab] = useState<'pets' | 'hatch' | 'shop'>('pets');
  const [selection, setSelection] = useState<Selection | null>(null);

  const { activeSlots, ranchPets, slotsOwned } = inventory;

  const emptySlots = Array.from({ length: slotsOwned }, (_, i) => i).filter(
    (i) => activeSlots[i] === null
  );

  const totalPets = activeSlots.filter(Boolean).length + ranchPets.length;

  const availableEggs = [
    { type: 1, count: inventory.commonEgg },
    { type: 2, count: inventory.rareEgg },
    { type: 3, count: inventory.seasonalEgg }
  ].filter((e) => e.count > 0n);

  const hatchTabLabel = inventory.hatch
    ? Date.now() >= inventory.hatch.hatchAt
      ? 'Hatch [!]'
      : 'Hatch ...'
    : 'Hatch';

  // Deselect if selected pet no longer exists
  useEffect(() => {
    if (!selection) return;
    const allIds = [
      ...activeSlots.filter(Boolean).map((p) => p!.petId),
      ...ranchPets.map((p) => p.petId)
    ];
    if (!allIds.includes(selection.pet.petId)) setSelection(null);
  }, [activeSlots, ranchPets]);

  // Keep selection in sync with latest pet data
  const syncedSelection = selection
    ? (() => {
        const allPets = [
          ...activeSlots.flatMap((p, i) =>
            p ? [{ pet: p, context: 'active' as const, slot: i }] : []
          ),
          ...ranchPets.map((p) => ({ pet: p, context: 'ranch' as const, slot: undefined }))
        ];
        const found = allPets.find((x) => x.pet.petId === selection.pet.petId);
        return found ?? null;
      })()
    : null;

  const handleSelect = (sel: Selection) => {
    setSelection((prev) => (prev?.pet.petId === sel.pet.petId ? null : sel));
  };

  return (
    <div className="bg-amber-950/40 border border-amber-700/30 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconPaw size={16} />
          <h2 className="font-pixel text-amber-300 text-xs">PETS</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-600 font-pixel">Slots {slotsOwned}/3</span>
          <span className="text-xs text-amber-700 font-pixel">Owned {totalPets}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1">
        {(
          [
            { key: 'pets', label: 'My Pets' },
            { key: 'hatch', label: hatchTabLabel },
            { key: 'shop', label: 'Shop' }
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1.5 text-xs font-pixel rounded-lg transition-colors
              ${
                tab === key
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-amber-900/30 text-amber-500 hover:bg-amber-800/30'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── My Pets tab ── */}
      {tab === 'pets' && (
        <div className="space-y-3">
          {/* Ranch view hint */}
          <div className="flex items-center gap-2 bg-green-950/50 border border-green-700/30 rounded-xl px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11 L7 3 L12 11 L2 11Z" fill="#4A8A28" opacity="0.8" />
              <path d="M4 11 L7 6 L10 11" fill="#3A7018" />
            </svg>
            <p className="text-xs text-green-500 font-pixel">
              Switch to Ranch view to see your pets move
            </p>
          </div>

          {/* Slot overview bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => {
              const pet = activeSlots[i];
              const owned = i < slotsOwned;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-lg border px-1.5 py-1.5 text-center
                    ${
                      pet
                        ? 'border-emerald-700/50 bg-emerald-950/30'
                        : owned
                        ? 'border-amber-700/30 bg-amber-950/20'
                        : 'border-gray-700/30 bg-gray-900/20'
                    }`}
                >
                  {pet ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <PetAvatar species={pet.species} level={pet.level} size={22} />
                      <span className="text-emerald-400 font-pixel" style={{ fontSize: '7px' }}>
                        Slot {i + 1}
                      </span>
                    </div>
                  ) : owned ? (
                    <div className="flex flex-col items-center gap-0.5 opacity-40">
                      <div className="w-5 h-5 rounded-full border border-amber-600/40 flex items-center justify-center">
                        <span className="text-amber-600 text-xs">+</span>
                      </div>
                      <span className="text-amber-700 font-pixel" style={{ fontSize: '7px' }}>
                        empty
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 opacity-30">
                      <div className="w-5 h-5 rounded-full border border-gray-600/40 flex items-center justify-center">
                        <span className="text-gray-600 text-xs">+</span>
                      </div>
                      <span className="text-gray-700 font-pixel" style={{ fontSize: '7px' }}>
                        {200}g
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pet list: all pets compact */}
          {totalPets === 0 ? (
            <div className="text-amber-800 text-xs text-center font-pixel py-4 space-y-1 px-1">
              {inventory.hatch ? (
                Date.now() >= inventory.hatch.hatchAt ? (
                  <>
                    <p className="text-emerald-500">
                      Pet ready — go to Hatch tab and tap Open Egg.
                    </p>
                    <p className="text-amber-700 text-[10px] opacity-90">
                      (Starting incubation only places the egg; Open Egg mints your pet on-chain.)
                    </p>
                  </>
                ) : (
                  <>
                    <p>Egg is incubating — wait for the timer, then use Open Egg.</p>
                    <p className="text-amber-700 text-[10px] opacity-90">
                      Ranch stays empty until Open Egg succeeds.
                    </p>
                  </>
                )
              ) : (
                <p>No pets yet — buy an egg in Shop, then Hatch tab to incubate.</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {[
                ...activeSlots.flatMap((p, i) =>
                  p ? [{ pet: p, context: 'active' as const, slot: i }] : []
                ),
                ...ranchPets.map((p) => ({ pet: p, context: 'ranch' as const, slot: undefined }))
              ].map(({ pet, context, slot }) => {
                const isSelected = syncedSelection?.pet.petId === pet.petId;
                return (
                  <button
                    key={pet.petId}
                    onClick={() => handleSelect({ pet, context, slot })}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border
                      text-left transition-colors
                      ${
                        isSelected
                          ? 'border-amber-500/60 bg-amber-900/40'
                          : 'border-amber-800/20 bg-amber-950/20 hover:bg-amber-900/20'
                      }`}
                  >
                    <PetAvatar species={pet.species} level={pet.level} size={26} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-200 font-pixel text-xs">
                          {SPECIES_NAME[pet.species]}
                        </span>
                        <span className={`text-xs ${RARITY_COLOR[pet.rarity]}`}>
                          {RARITY_LABEL[pet.rarity]}
                        </span>
                        {context === 'active' && (
                          <span className="text-emerald-500 font-pixel" style={{ fontSize: '7px' }}>
                            S{(slot ?? 0) + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-amber-700 font-pixel" style={{ fontSize: '9px' }}>
                          Lv.{pet.level}
                        </span>
                        <div className="flex-1 bg-gray-800 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pet.satiety >= 60
                                ? 'bg-green-600'
                                : pet.satiety >= 30
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${pet.satiety}%` }}
                          />
                        </div>
                        <span className="text-amber-700" style={{ fontSize: '9px' }}>
                          {pet.satiety}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Detail pane (inline, animated) */}
          <AnimatePresence>
            {syncedSelection && (
              <PetDetailPane
                key={syncedSelection.pet.petId}
                selection={syncedSelection}
                isLoading={isLoading}
                cropInventory={cropInventory}
                emptySlots={emptySlots}
                onFeed={(ct, amt) => onFeedPet(syncedSelection.pet.petId, ct, amt)}
                onDismiss={() => onDismissPet(syncedSelection.pet.petId)}
                onList={(price) => onListPet(syncedSelection.pet.petId, price)}
                onAssignSlot={(slot) => onAssignSlot(syncedSelection.pet.petId, slot)}
                onUnassign={() => onUnassignSlot(syncedSelection.slot!)}
                onClose={() => setSelection(null)}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Hatch tab ── */}
      {tab === 'hatch' && (
        <div className="space-y-3">
          {inventory.hatch ? (
            <EggIncubator hatch={inventory.hatch} isLoading={isLoading} onOpenEgg={onOpenEgg} />
          ) : (
            <>
              <p className="text-amber-600 text-xs text-center font-pixel">No egg incubating.</p>
              {availableEggs.length > 0 ? (
                <div className="space-y-2">
                  {availableEggs.map(({ type, count }) => (
                    <motion.button
                      key={type}
                      onClick={() => onStartHatch(type)}
                      disabled={isLoading}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-between px-3 py-2
                                  border rounded-xl hover:bg-amber-800/30
                                  transition-colors disabled:opacity-50 ${EGG_RARITY_COLOR[type]}`}
                    >
                      <div className="flex items-center gap-2">
                        <EggIcon eggType={type} size={24} />
                        <span className="font-pixel text-amber-200 text-xs">
                          {EGG_NAME[type]} x{String(count)}
                        </span>
                      </div>
                      <span className="text-amber-500 text-xs">Incubate</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-amber-700 text-xs text-center font-pixel">
                  No eggs — buy from the Shop tab.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Shop tab ── */}
      {tab === 'shop' && (
        <div className="space-y-2">
          {[
            { type: 1, pool: '70% Bunny  30% Chick' },
            { type: 2, pool: '60% Fox  35% Deer  5% Dragon' },
            { type: 3, pool: 'Guaranteed Uncommon+  Seasonal look' }
          ].map(({ type, pool }) => {
            const price = EGG_PRICE[type];
            return (
              <div
                key={type}
                className={`border rounded-xl p-3 space-y-2 ${EGG_RARITY_COLOR[type]}`}
              >
                <div className="flex items-center gap-3">
                  <EggIcon eggType={type} size={32} />
                  <div className="flex-1">
                    <p className="font-pixel text-amber-200 text-xs">{EGG_NAME[type]} Egg</p>
                    <p className="text-amber-600 text-xs mt-0.5">{pool}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconGold size={12} />
                    <span className="font-pixel text-amber-400 text-xs">{price}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 3, 5].map((qty) => (
                    <motion.button
                      key={qty}
                      onClick={() => onBuyEgg(type)}
                      disabled={isLoading || gold < BigInt(price * qty)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.93 }}
                      className="flex-1 bg-amber-700 hover:bg-amber-600 text-white
                                 text-xs font-pixel py-1.5 rounded-lg
                                 disabled:opacity-50 transition-colors"
                    >
                      x{qty}
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
