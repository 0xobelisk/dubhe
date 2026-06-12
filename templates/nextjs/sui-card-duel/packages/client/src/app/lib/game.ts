/**
 * Game constants mirrored from the Move contracts
 * (card_system.move / duel_system.move / brawl_system.move).
 */

// ── Card kinds (enum CardKind) ────────────────────────────────────────────────

export const KIND_STRIKE = 1;
export const KIND_FIREBALL = 2;
export const KIND_HEAL = 3;
export const KIND_SHIELD = 4;

export const KIND_NAME: Record<number, string> = {
  [KIND_STRIKE]: 'Strike',
  [KIND_FIREBALL]: 'Fireball',
  [KIND_HEAL]: 'Heal',
  [KIND_SHIELD]: 'Shield'
};

export const KIND_EMOJI: Record<number, string> = {
  [KIND_STRIKE]: '⚔️',
  [KIND_FIREBALL]: '🔥',
  [KIND_HEAL]: '💚',
  [KIND_SHIELD]: '🛡️'
};

export const isAttackKind = (kind: number) => kind === KIND_STRIKE || kind === KIND_FIREBALL;
export const isDefenseKind = (kind: number) => kind === KIND_HEAL || kind === KIND_SHIELD;

// ── Rarities (enum Rarity) ────────────────────────────────────────────────────

export const RARITY_COMMON = 0;
export const RARITY_RARE = 1;
export const RARITY_EPIC = 2;

export const RARITY_NAME: Record<number, string> = {
  [RARITY_COMMON]: 'Common',
  [RARITY_RARE]: 'Rare',
  [RARITY_EPIC]: 'Epic'
};

export const RARITY_COLOR: Record<number, string> = {
  [RARITY_COMMON]: 'text-slate-400 border-slate-600',
  [RARITY_RARE]: 'text-sky-400 border-sky-600',
  [RARITY_EPIC]: 'text-fuchsia-400 border-fuchsia-600'
};

// ── Match states (enum MatchState) ────────────────────────────────────────────

export const STATE_WAITING = 0; // duel: invite pending / brawl: room open
export const STATE_ACTIVE = 1;
export const STATE_FINISHED = 2;

export const DECK_SIZE = 5;

// ── Shared types ──────────────────────────────────────────────────────────────

export interface CardData {
  cardId: string;
  kind: number;
  power: number;
  rarity: number;
}

export interface ProfileData {
  wins: number;
  losses: number;
  rating: number;
}

export interface BattleStateData {
  matchId: string;
  hp: bigint;
  shield: bigint;
}

export const shortAddr = (addr: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—');
