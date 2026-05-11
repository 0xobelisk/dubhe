// Crop type constants (must match Move enum CropType order)
export const CROP_NONE = 0;
export const CROP_WHEAT = 1;
export const CROP_CORN = 2;
export const CROP_CARROT = 3;
export const CROP_PUMPKIN = 4;

export interface CropInfo {
  type: number;
  name: string;
  icon: string;
  growthMs: number; // must match farm_system.move *_MS constants
  seedPrice: number;
  sellPrice: number;
  stages: number;
  color: string;
  yieldPerSeed: number; // must match farm_system.move crop_yield() — crops returned per 1 seed planted
}

export const CROPS: Record<number, CropInfo> = {
  [CROP_WHEAT]: {
    type: CROP_WHEAT,
    name: 'Wheat',
    icon: '/assets/crops/wheat',
    growthMs: 1 * 60 * 1000, // 1 min
    seedPrice: 5,
    sellPrice: 8,
    stages: 4,
    color: 'amber',
    yieldPerSeed: 6 // plant 1 seed → harvest 6 wheat
  },
  [CROP_CORN]: {
    type: CROP_CORN,
    name: 'Corn',
    icon: '/assets/crops/corn',
    growthMs: 2 * 60 * 1000, // 2 min
    seedPrice: 20,
    sellPrice: 35,
    stages: 4,
    color: 'yellow',
    yieldPerSeed: 4 // plant 1 seed → harvest 4 corn
  },
  [CROP_CARROT]: {
    type: CROP_CARROT,
    name: 'Carrot',
    icon: '/assets/crops/carrot',
    growthMs: 4 * 60 * 1000, // 4 min
    seedPrice: 60,
    sellPrice: 120,
    stages: 4,
    color: 'orange',
    yieldPerSeed: 3 // plant 1 seed → harvest 3 carrots
  },
  [CROP_PUMPKIN]: {
    type: CROP_PUMPKIN,
    name: 'Pumpkin',
    icon: '/assets/crops/pumpkin',
    growthMs: 5 * 60 * 1000, // 5 min
    seedPrice: 40,
    sellPrice: 100,
    stages: 4,
    color: 'orange',
    yieldPerSeed: 3 // plant 1 seed → harvest 3 pumpkins
  }
};

export const CROP_LIST = Object.values(CROPS);

/** Returns growth stage index 0–3 from planted_at and harvest_at timestamps. */
export function growthStage(plantedAt: number, harvestAt: number, now: number): number {
  if (harvestAt === 0 || plantedAt === 0) return 0;
  const duration = harvestAt - plantedAt;
  const elapsed = Math.min(now - plantedAt, duration);
  const progress = elapsed / duration;
  if (progress >= 1) return 3;
  if (progress >= 0.66) return 2;
  if (progress >= 0.33) return 1;
  return 0;
}

/** Progress 0–1 from planted_at and harvest_at. */
export function growthProgress(plantedAt: number, harvestAt: number, now: number): number {
  if (harvestAt === 0 || plantedAt === 0) return 0;
  return Math.min(1, (now - plantedAt) / (harvestAt - plantedAt));
}

/** Format ms duration as "Xh Ym" or "Zm" string. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'Ready!';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
