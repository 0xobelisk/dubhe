/**
 * Runner configuration: deployment artifacts produced by the contracts
 * package (deployment.ts, buildings.json, dubhe.config.json) plus game
 * constants mirrored from the Move systems.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONTRACTS_DIR = path.resolve(HERE, '..', '..', 'contracts');
export const RUNNER_DIR = path.resolve(HERE, '..');

// ─── Tunables (override via env) ─────────────────────────────────────────────

/** Number of independent player wallets the runner manages. Social actions
 *  (talk / gift) require two different players on-chain, so keep this >= 2. */
export const CITIZEN_COUNT = int('CITIZEN_COUNT', 2);
/** Agents minted per citizen wallet (contract max: 3). */
export const AGENTS_PER_CITIZEN = int('AGENTS_PER_CITIZEN', 2);
/** Delay between decision rounds. */
export const STEP_INTERVAL_MS = int('STEP_INTERVAL_MS', 10_000);
/** Session key lifetime requested at activation (max 7 days). */
export const SESSION_DURATION_MS = int('SESSION_DURATION_MS', 12 * 60 * 60 * 1000);
/** Push a memory digest on-chain every N executed actions per agent. */
export const MEMORY_EVERY_N_ACTIONS = int('MEMORY_EVERY_N_ACTIONS', 20);

export const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT ?? 'http://localhost:4000/graphql';

function int(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? parseInt(v, 10) : fallback;
}

// ─── Constants mirrored from the Move systems ────────────────────────────────

export const Occupation = { None: 0, Farmer: 1, Barista: 2, Fisher: 3, Artisan: 4 } as const;
export const Activity = {
  Idle: 0,
  Sleeping: 1,
  Working: 2,
  Eating: 3,
  Chatting: 4,
  Wandering: 5
} as const;
export const BuildingKind = {
  Outdoors: 0,
  TownHall: 1,
  Farm: 2,
  Cafe: 3,
  Dock: 4,
  Workshop: 5,
  Tavern: 6
} as const;
export const EventKind = { None: 0, MarketDay: 1, Storm: 2, Merchant: 3 } as const;

/** BuildingKind → buildings.json key. */
export const KIND_TO_KEY: Record<number, string> = {
  1: 'town_hall',
  2: 'farm',
  3: 'cafe',
  4: 'dock',
  5: 'workshop',
  6: 'tavern'
};

/** Occupation → workplace BuildingKind (life_system::workplace_of). */
export const WORKPLACE_OF: Record<number, number> = {
  [Occupation.Farmer]: BuildingKind.Farm,
  [Occupation.Barista]: BuildingKind.Cafe,
  [Occupation.Fisher]: BuildingKind.Dock,
  [Occupation.Artisan]: BuildingKind.Workshop
};

// life_system tuning (must stay in sync with the Move constants)
export const ENERGY_DECAY_MS = 30_000;
export const WORK_ENERGY_COST = 20;
export const WORK_COOLDOWN_MS = 60_000;
export const SLEEP_COOLDOWN_MS = 600_000;
export const TALK_ENERGY_COST = 5;
export const NOMINATION_FEE = 20;

/** Approximate tile coordinates for each location (map is ~40x24 tiles).
 *  Purely cosmetic: emitted with move_to for spectators / the frontend. */
export const LOCATION_POS: Record<number, { x: number; y: number }> = {
  [BuildingKind.Outdoors]: { x: 20, y: 12 },
  [BuildingKind.TownHall]: { x: 20, y: 5 },
  [BuildingKind.Farm]: { x: 6, y: 18 },
  [BuildingKind.Cafe]: { x: 30, y: 8 },
  [BuildingKind.Dock]: { x: 36, y: 20 },
  [BuildingKind.Workshop]: { x: 10, y: 6 },
  [BuildingKind.Tavern]: { x: 28, y: 17 }
};

/** On-chain x/y are u64 tile coordinates scaled by POS_SCALE for sub-tile
 *  precision (tile 27.8 → 278). The client divides by the same factor. */
export const POS_SCALE = 10;

export interface Spot {
  x: number;
  y: number;
}

/**
 * Activity-aware standing spots per location, in (fractional) tile
 * coordinates. Working agents stand at workstations (crop rows, counters,
 * pier planks), eating agents sit at tables, everyone else hangs around
 * benches and doorways.
 *
 * These coordinates line up with the furniture drawn by the client map —
 * keep them in sync with LOCATION_SPOTS in
 * packages/client/src/app/lib/constants.ts.
 */
export const LOCATION_SPOTS: Record<number, { work: Spot[]; eat: Spot[]; idle: Spot[] }> = {
  [BuildingKind.Outdoors]: {
    work: [],
    eat: [],
    // Benches and corners around the fountain plaza.
    idle: [
      { x: 17.6, y: 12.6 },
      { x: 22.4, y: 12.6 },
      { x: 19.0, y: 14.2 },
      { x: 21.0, y: 14.2 },
      { x: 18.2, y: 11.2 },
      { x: 21.8, y: 11.2 },
      { x: 16.5, y: 13.8 },
      { x: 23.5, y: 13.8 }
    ]
  },
  [BuildingKind.TownHall]: {
    work: [],
    eat: [],
    // Forecourt in front of the door and the noticeboard.
    idle: [
      { x: 18.6, y: 6.6 },
      { x: 21.4, y: 6.6 },
      { x: 20.0, y: 7.4 },
      { x: 19.0, y: 7.9 },
      { x: 21.0, y: 7.9 }
    ]
  },
  [BuildingKind.Farm]: {
    // Crop rows in the fenced field south of the farmhouse.
    work: [
      { x: 3.0, y: 20.2 },
      { x: 5.0, y: 20.8 },
      { x: 7.0, y: 20.2 },
      { x: 9.0, y: 20.8 },
      { x: 4.0, y: 21.8 },
      { x: 8.0, y: 21.8 }
    ],
    eat: [],
    idle: [
      { x: 6.0, y: 18.8 },
      { x: 4.6, y: 18.8 }
    ]
  },
  [BuildingKind.Cafe]: {
    // Behind the counter, by the door.
    work: [
      { x: 29.2, y: 8.7 },
      { x: 30.8, y: 8.7 }
    ],
    // Chairs at the two terrace tables.
    eat: [
      { x: 27.2, y: 10.6 },
      { x: 28.8, y: 10.6 },
      { x: 31.2, y: 10.6 },
      { x: 32.8, y: 10.6 }
    ],
    idle: [
      { x: 30.0, y: 9.4 },
      { x: 28.6, y: 9.2 }
    ]
  },
  [BuildingKind.Dock]: {
    // Planks of the pier reaching into the water.
    work: [
      { x: 37.2, y: 21.0 },
      { x: 38.3, y: 21.8 },
      { x: 36.4, y: 21.9 }
    ],
    eat: [],
    idle: [
      { x: 35.2, y: 20.6 },
      { x: 34.6, y: 19.8 }
    ]
  },
  [BuildingKind.Workshop]: {
    // Workbench and anvil beside the house.
    work: [
      { x: 7.6, y: 7.2 },
      { x: 12.4, y: 7.2 },
      { x: 10.0, y: 7.8 }
    ],
    eat: [],
    idle: [
      { x: 9.0, y: 7.2 },
      { x: 11.0, y: 7.4 }
    ]
  },
  [BuildingKind.Tavern]: {
    work: [],
    // Chairs at the two tavern tables.
    eat: [
      { x: 25.2, y: 19.2 },
      { x: 26.8, y: 19.2 },
      { x: 29.2, y: 19.2 },
      { x: 30.8, y: 19.2 }
    ],
    idle: [
      { x: 28.0, y: 17.9 },
      { x: 27.0, y: 18.4 }
    ]
  }
};

/** Pick a standing spot for a location that fits the declared activity. */
export function pickSpot(locationKind: number, activity: number): Spot {
  const spots = LOCATION_SPOTS[locationKind];
  const anchor = LOCATION_POS[locationKind] ?? { x: 20, y: 12 };
  if (!spots) return anchor;
  const pool =
    activity === Activity.Working && spots.work.length > 0
      ? spots.work
      : activity === Activity.Eating && spots.eat.length > 0
        ? spots.eat
        : spots.idle.length > 0
          ? spots.idle
          : [anchor];
  return pool[Math.floor(Math.random() * pool.length)];
}

export const CLOCK_ID = '0x6';
export const RANDOM_ID = '0x8';

// ─── Deployment artifacts ────────────────────────────────────────────────────

export interface Deployment {
  network: string;
  packageId: string;
  dappKey: string;
  dappHubId: string;
  dappStorageId: string;
  frameworkPackageId?: string;
}

/** deployment.ts is generated by `pnpm config:store` after publishing. */
export async function loadDeployment(): Promise<Deployment> {
  const file = path.join(CONTRACTS_DIR, 'deployment.ts');
  if (!fs.existsSync(file)) {
    throw new Error(
      `deployment.ts not found at ${file} — deploy the contracts first (pnpm setup:localnet in packages/contracts)`
    );
  }
  const mod = await import(pathToFileURL(file).href);
  const dep: Record<string, any> = (mod as any).default ?? mod;
  return {
    network: dep['Network'],
    packageId: dep['PackageId'],
    dappKey: dep['DappKey'],
    dappHubId: dep['DappHubId'],
    dappStorageId: dep['DappStorageId'],
    frameworkPackageId: dep['FrameworkPackageId']
  };
}

/** buildings.json is written by the seed script (scripts/seed.ts). */
export function loadBuildings(): Record<string, string> {
  const file = path.join(CONTRACTS_DIR, 'buildings.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `buildings.json not found at ${file} — run the seed script first (pnpm seed:localnet in packages/contracts)`
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')).buildings;
}

/** dubhe.config.json gives the graphql client schema awareness. */
export function loadDubheMetadata(): any {
  return JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'dubhe.config.json'), 'utf-8'));
}
