'use client';

import { motion } from 'framer-motion';
import type { CardData } from '../lib/game';
import { KIND_NAME, KIND_EMOJI, RARITY_NAME, RARITY_COLOR, isAttackKind } from '../lib/game';

/**
 * A single playing card. Used in the collection, deck builder and battle pages.
 */
export function CardView({
  card,
  selected = false,
  disabled = false,
  used = false,
  small = false,
  onClick
}: {
  card: CardData;
  selected?: boolean;
  disabled?: boolean;
  /** Already played this match (duel rule: one use per card). */
  used?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const rarityCls = RARITY_COLOR[card.rarity] ?? RARITY_COLOR[0];
  const clickable = Boolean(onClick) && !disabled && !used;

  return (
    <motion.button
      type="button"
      onClick={clickable ? onClick : undefined}
      whileHover={clickable ? { y: -4, scale: 1.03 } : undefined}
      whileTap={clickable ? { scale: 0.97 } : undefined}
      disabled={!clickable && Boolean(onClick)}
      className={`relative flex flex-col items-center justify-between rounded-xl border-2 bg-slate-900/90 text-left transition-colors
        ${small ? 'w-20 h-28 p-1.5' : 'w-28 h-40 p-2.5'}
        ${rarityCls}
        ${selected ? 'ring-2 ring-amber-400 -translate-y-1' : ''}
        ${used || disabled ? 'opacity-40 grayscale' : ''}
        ${clickable ? 'cursor-pointer hover:bg-slate-800/90' : 'cursor-default'}`}
    >
      <span className={`font-pixel ${small ? 'text-[8px]' : 'text-[10px]'} text-slate-300`}>
        {KIND_NAME[card.kind] ?? '?'}
      </span>
      <span className={small ? 'text-2xl' : 'text-4xl'}>{KIND_EMOJI[card.kind] ?? '❓'}</span>
      <div className="w-full flex items-center justify-between">
        <span className={`${small ? 'text-[8px]' : 'text-[10px]'} opacity-80`}>
          {RARITY_NAME[card.rarity]}
        </span>
        <span
          className={`font-pixel ${small ? 'text-[9px]' : 'text-xs'} ${
            isAttackKind(card.kind) ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {card.power}
        </span>
      </div>
      {used && (
        <span className="absolute inset-0 flex items-center justify-center font-pixel text-[9px] text-red-400 bg-black/40 rounded-xl">
          USED
        </span>
      )}
    </motion.button>
  );
}
