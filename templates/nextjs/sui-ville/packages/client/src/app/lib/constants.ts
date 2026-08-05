/**
 * Presentation constants for the pixel town. Coordinates mirror
 * agent-runner/src/config.ts LOCATION_POS on a 40x24 tile map.
 */

export const MAP_W = 40;
export const MAP_H = 24;

/** On-chain agent_position x/y are tile coordinates scaled by this factor
 *  (mirrors POS_SCALE in agent-runner/src/config.ts). */
export const POS_SCALE = 10;

export const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? 'http://localhost:4000/graphql';

/** Poll cadence for on-chain state (the indexer mirrors the chain). */
export const POLL_MS = 3000;

/** How long a freshly indexed dialogue is shown as a speech bubble. */
export const BUBBLE_TTL_MS = 12_000;

export const BuildingKind = {
  Outdoors: 0,
  TownHall: 1,
  Farm: 2,
  Cafe: 3,
  Dock: 4,
  Workshop: 5,
  Tavern: 6
} as const;

export interface BuildingMeta {
  kind: number;
  label: string;
  /** Tile coordinates of the building anchor (its door). */
  x: number;
  y: number;
  wall: string;
  roof: string;
  trim: string;
}

export const BUILDINGS: BuildingMeta[] = [
  { kind: 1, label: 'TOWN HALL', x: 20, y: 5, wall: '#e8d5b0', roof: '#b13e53', trim: '#5d275d' },
  { kind: 2, label: 'FARM', x: 6, y: 18, wall: '#d9a066', roof: '#8f563b', trim: '#45283c' },
  { kind: 3, label: 'CAFE', x: 30, y: 8, wall: '#f4cca1', roof: '#df7126', trim: '#8a4836' },
  { kind: 4, label: 'DOCK', x: 36, y: 20, wall: '#8a6f30', roof: '#6abe30', trim: '#37946e' },
  { kind: 5, label: 'WORKSHOP', x: 10, y: 6, wall: '#847e87', roof: '#696a6a', trim: '#3f3f74' },
  { kind: 6, label: 'TAVERN', x: 28, y: 17, wall: '#c68642', roof: '#663931', trim: '#8f563b' }
];

/** Where agents stand while "outdoors" (the town square). */
export const SQUARE = { x: 20, y: 12 };

/** Door-side offsets so agents at the same location don't overlap. */
export const STAND_OFFSETS = [
  { x: -1.4, y: 2.8 },
  { x: 1.6, y: 3.0 },
  { x: -2.8, y: 3.7 },
  { x: 3.0, y: 3.9 },
  { x: 0.2, y: 4.2 },
  { x: -3.6, y: 2.6 },
  { x: 3.8, y: 2.7 },
  { x: 1.0, y: 4.8 }
];

export const ACTIVITY_LABEL: Record<number, string> = {
  0: 'idle',
  1: 'sleeping',
  2: 'working',
  3: 'eating',
  4: 'chatting',
  5: 'wandering'
};

/** Small status glyph drawn above the sprite. */
export const ACTIVITY_GLYPH: Record<number, string> = {
  1: 'z',
  2: '*',
  3: '~',
  4: '…'
};

export const EVENT_LABEL: Record<number, string> = {
  1: 'MARKET DAY — wages x1.5',
  2: 'STORM — farm & dock closed',
  3: 'MERCHANT — meals half price'
};

export const EVENT_COLOR: Record<number, string> = {
  1: '#ffcd75',
  2: '#5fcde4',
  3: '#6abe30'
};

export const OCCUPATION_LABEL: Record<number, string> = {
  0: 'Drifter',
  1: 'Farmer',
  2: 'Barista',
  3: 'Fisher',
  4: 'Artisan'
};

export const LOCATION_LABEL: Record<number, string> = {
  0: 'town square',
  1: 'town hall',
  2: 'farm',
  3: 'cafe',
  4: 'dock',
  5: 'workshop',
  6: 'tavern'
};

export interface AgentPalette {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
}

/** Deterministic per-agent look, picked by hashing the agent id. */
export const AGENT_PALETTES: AgentPalette[] = [
  { hair: '#663931', skin: '#eec39a', shirt: '#5b6ee1', pants: '#3f3f74' },
  { hair: '#f4b41b', skin: '#ffe0bd', shirt: '#ac3232', pants: '#45283c' },
  { hair: '#222034', skin: '#d9a066', shirt: '#6abe30', pants: '#524b24' },
  { hair: '#8f563b', skin: '#eec39a', shirt: '#df7126', pants: '#45283c' },
  { hair: '#cbdbfc', skin: '#ffe0bd', shirt: '#76428a', pants: '#222034' },
  { hair: '#37946e', skin: '#d9a066', shirt: '#d95763', pants: '#3f3f74' },
  { hair: '#595652', skin: '#eec39a', shirt: '#fbf236', pants: '#696a6a' },
  { hair: '#b13e53', skin: '#ffe0bd', shirt: '#38b764', pants: '#29366f' }
];

export function paletteFor(agentId: string): AgentPalette {
  let h = 0;
  for (let i = 2; i < Math.min(agentId.length, 18); i++) {
    h = (h * 31 + agentId.charCodeAt(i)) >>> 0;
  }
  return AGENT_PALETTES[h % AGENT_PALETTES.length];
}

/** Decorative trees/bushes scattered on the grass (tile coords). */
export const TREES: Array<{ x: number; y: number; big?: boolean }> = [
  { x: 2, y: 3, big: true },
  { x: 4, y: 10 },
  { x: 1, y: 14, big: true },
  { x: 15, y: 2 },
  { x: 26, y: 2, big: true },
  { x: 34, y: 3 },
  { x: 38, y: 7, big: true },
  { x: 14, y: 21 },
  { x: 20, y: 19, big: true },
  { x: 24, y: 22 },
  { x: 3, y: 22 },
  { x: 16, y: 12 },
  { x: 25, y: 12 },
  { x: 36, y: 12 }
];

export function isZeroAddr(addr: string | null | undefined): boolean {
  return !addr || /^0x0+$/.test(addr);
}

export function shortAddr(addr: string): string {
  if (isZeroAddr(addr)) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
