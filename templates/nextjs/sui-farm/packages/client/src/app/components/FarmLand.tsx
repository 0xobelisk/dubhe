'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CROP_NONE, growthProgress, formatDuration } from '../lib/crops';
import { CropStageIcon, IconSeedling } from './icons/GameIcons';
import { PlantModal } from './PlantModal';

// ─── Isometric geometry ───────────────────────────────────────────────────────
const TW = 110; // tile diamond width
const TH = 55; // tile diamond height (TW / 2)
const TD = 16; // soil depth thickness

const COLS = 3;
const ROWS = 4;

// ViewBox: fits 3×4 isometric grid
// x: [left vertex of (0,ROWS-1)] to [right vertex of (COLS-1,0)]
// x range: (0 - (ROWS-1)) * TW/2 = -165  to  (COLS-1) * TW/2 + TW = 220
// y range: 0 to max bottom depth at (COLS-1, ROWS-1)
const VBX = -180,
  VBY = -15,
  VBW = 415,
  VBH = 240;
const ASPECT = VBH / VBW;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlotData {
  plotId: number;
  cropType: number;
  count: bigint;
  plantedAt: bigint;
  harvestAt: bigint;
}

interface FarmLandProps {
  plots: (PlotData | null)[];
  plotsOwned: number;
  inventory: Record<number, bigint>;
  now: number;
  isLoading?: boolean;
  onPlant: (plotId: number, cropType: number, count: number) => void;
  onHarvest: (plotId: number) => void;
}

type TileState =
  | 'empty'
  | 'growing'
  | 'ready'
  | 'locked'
  | 'hover_empty'
  | 'hover_growing'
  | 'hover_ready';

// ─── Color palette per state ──────────────────────────────────────────────────
const SOIL: Record<TileState, { t: string; r: string; l: string; s: string }> = {
  empty: { t: '#9B7040', r: '#5C3D1A', l: '#7A5230', s: '#7A5A30' },
  growing: { t: '#875E2A', r: '#4A2E0E', l: '#63461E', s: '#634E28' },
  ready: { t: '#6A8A35', r: '#385015', l: '#587025', s: '#88C840' },
  // Wasteland: uneven wild grass — green top, dark earthy sides
  locked: { t: '#4A7030', r: '#1E3A10', l: '#2E5018', s: '#3A5C24' },
  hover_empty: { t: '#B88055', r: '#6E4D2A', l: '#8E6040', s: '#C8A96E' },
  hover_growing: { t: '#9A7038', r: '#5A3818', l: '#7A5428', s: '#9A8040' },
  hover_ready: { t: '#7EAA3A', r: '#406A1A', l: '#62922A', s: '#AADD50' }
};

// ─── Grid: 3×4, all 12 tiles are game plots ───────────────────────────────────
// plotIndex layout (front = row ROWS-1, back = row 0):
//   row 0 (back):  plotIndex 9, 10, 11
//   row 1:         plotIndex 6, 7, 8
//   row 2:         plotIndex 3, 4, 5
//   row 3 (front): plotIndex 0, 1, 2  ← initially unlocked (plotsOwned=3)
const GRID = (() => {
  const tiles = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const plotIndex = (ROWS - 1 - row) * COLS + col;
      tiles.push({ col, row, plotIndex });
    }
  }
  return tiles;
})();

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function tileGeo(col: number, row: number) {
  const px = ((col - row) * TW) / 2;
  const py = ((col + row) * TH) / 2;
  const pt = (x: number, y: number) => `${x},${y}`;
  return {
    top: [
      pt(px + TW / 2, py),
      pt(px + TW, py + TH / 2),
      pt(px + TW / 2, py + TH),
      pt(px, py + TH / 2)
    ].join(' '),
    right: [
      pt(px + TW, py + TH / 2),
      pt(px + TW, py + TH / 2 + TD),
      pt(px + TW / 2, py + TH + TD),
      pt(px + TW / 2, py + TH)
    ].join(' '),
    left: [
      pt(px, py + TH / 2),
      pt(px + TW / 2, py + TH),
      pt(px + TW / 2, py + TH + TD),
      pt(px, py + TH / 2 + TD)
    ].join(' '),
    cx: px + TW / 2,
    cy: py + TH / 2
  };
}

function toPercent(svgX: number, svgY: number) {
  return {
    left: `${((svgX - VBX) / VBW) * 100}%`,
    top: `${((svgY - VBY) / VBH) * 100}%`
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FarmLand({
  plots,
  plotsOwned,
  inventory,
  now,
  isLoading,
  onPlant,
  onHarvest
}: FarmLandProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [plantingPlotId, setPlantingPlotId] = useState<number | null>(null);

  function basePlotState(plotIndex: number): TileState {
    if (plotIndex >= plotsOwned) return 'locked';
    const plot = plots[plotIndex];
    if (!plot || plot.cropType === CROP_NONE) return 'empty';
    const harvestAt = Number(plot.harvestAt);
    if (now >= harvestAt && harvestAt > 0) return 'ready';
    return 'growing';
  }

  function resolveState(plotIndex: number, key: string): TileState {
    const bs = basePlotState(plotIndex);
    if (hoveredKey !== key) return bs;
    if (bs === 'empty') return 'hover_empty';
    if (bs === 'ready') return 'hover_ready';
    if (bs === 'growing') return 'hover_growing';
    return bs;
  }

  const tiles = GRID.map((t) => {
    const key = `${t.col}-${t.row}`;
    const bs = basePlotState(t.plotIndex);
    const cs = resolveState(t.plotIndex, key);
    const interactive = !isLoading && bs !== 'locked';
    return { ...t, key, bs, cs, interactive, g: tileGeo(t.col, t.row) };
  });

  function handleClick(tile: (typeof tiles)[number]) {
    if (!tile.interactive) return;
    if (tile.bs === 'ready') {
      onHarvest(tile.plotIndex);
      return;
    }
    if (tile.bs === 'empty') {
      setPlantingPlotId(tile.plotIndex);
    }
  }

  return (
    <>
      <div
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{ paddingBottom: `${ASPECT * 100}%` }}
      >
        {/* Grassy background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #3D7A24 0%, #1C4A0C 60%, #0C2606 100%)'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'radial-gradient(circle, #7ADE40 0.5px, transparent 0.5px)',
            backgroundSize: '14px 14px'
          }}
        />

        {/* SVG: isometric soil tiles */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`${VBX} ${VBY} ${VBW} ${VBH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="tile-hover-shadow">
              <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#000" floodOpacity="0.5" />
            </filter>
            {/* Furrow lines for tilled soil */}
            <pattern
              id="furrows"
              x="0"
              y="0"
              width="14"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-28)"
            >
              <line x1="0" y1="3.5" x2="14" y2="3.5" stroke="rgba(0,0,0,0.10)" strokeWidth="1" />
            </pattern>
            {/* Rough grass dots for wild/locked land */}
            <pattern
              id="wildgrass"
              x="0"
              y="0"
              width="12"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-20)"
            >
              <circle cx="3" cy="3" r="0.8" fill="rgba(120,200,60,0.22)" />
              <circle cx="9" cy="7" r="0.6" fill="rgba(80,160,30,0.18)" />
              <circle cx="6" cy="1" r="0.5" fill="rgba(100,180,50,0.15)" />
            </pattern>
          </defs>

          {tiles.map(({ key, cs, bs, interactive, g, plotIndex }) => {
            const c = SOIL[cs];
            const isHov = hoveredKey === key;
            return (
              <g
                key={key}
                style={{ filter: isHov ? 'url(#tile-hover-shadow)' : undefined }}
                className={interactive ? 'cursor-pointer' : 'cursor-default'}
                onMouseEnter={() => interactive && setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => handleClick(tiles.find((t) => t.key === key)!)}
              >
                <polygon points={g.top} fill={c.t} />
                <polygon points={g.right} fill={c.r} />
                <polygon points={g.left} fill={c.l} />

                {/* Furrow texture on unlocked / tilled plots */}
                {bs !== 'locked' && <polygon points={g.top} fill="url(#furrows)" />}

                {/* Wild-grass texture on locked / wasteland plots */}
                {bs === 'locked' && <polygon points={g.top} fill="url(#wildgrass)" />}

                {/* Top face outline */}
                <polygon
                  points={g.top}
                  fill="none"
                  stroke={c.s}
                  strokeWidth="0.7"
                  strokeLinejoin="round"
                />

                {/* Ready harvest pulse ring */}
                {bs === 'ready' && (
                  <polygon points={g.top} fill="none" stroke="#7CFC00" strokeWidth="1.8">
                    <animate
                      attributeName="stroke-opacity"
                      values="0.1;0.85;0.1"
                      dur="1.3s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0;0.12;0"
                      dur="1.3s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                )}

                {/* Hover shimmer */}
                {isHov && bs !== 'locked' && (
                  <polygon points={g.top} fill="rgba(255,255,255,0.06)" />
                )}
              </g>
            );
          })}
        </svg>

        {/* HTML overlay: crop icons + status */}
        {tiles.map(({ key, bs, g, plotIndex }) => {
          const isHov = hoveredKey === key;
          const plot = plotIndex < plotsOwned ? plots[plotIndex] : null;
          const cropType = plot?.cropType ?? CROP_NONE;
          const harvestAt = Number(plot?.harvestAt ?? 0);
          const plantedAt = Number(plot?.plantedAt ?? 0);
          const seedCount = Number(plot?.count ?? 1);
          const progress = cropType !== CROP_NONE ? growthProgress(plantedAt, harvestAt, now) : 0;
          const timeLeft = cropType !== CROP_NONE ? Math.max(0, harvestAt - now) : 0;

          // Growth stage: 0=seed 1=sprout 2=growing 3=ripe
          const growStage = bs === 'ready' ? 3 : progress < 0.05 ? 0 : progress < 0.4 ? 1 : 2;

          // How many icons to render (cap at 9 for a 3×3 max)
          const visibleIcons = Math.min(seedCount, 9);
          // Icon size shrinks as count grows
          const iconSize = visibleIcons === 1 ? 30 : visibleIcons <= 4 ? 22 : 18;
          // Grid columns: 1→1, 2-4→2, 5-9→3
          const gridCols = visibleIcons === 1 ? 1 : visibleIcons <= 4 ? 2 : 3;

          const { left, top } = toPercent(g.cx, g.cy);

          return (
            <div
              key={`ov-${key}`}
              className="absolute pointer-events-none"
              style={{ left, top, transform: 'translate(-50%, -80%)', zIndex: 20 }}
            >
              {bs === 'locked' ? (
                <div className="flex flex-col items-center gap-0.5 opacity-70">
                  {/* Grass tufts — three short SVG strokes to suggest wild weeds */}
                  <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                    <line
                      x1="5"
                      y1="14"
                      x2="4"
                      y2="6"
                      stroke="#6AAE30"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="5"
                      y1="14"
                      x2="6"
                      y2="5"
                      stroke="#80C840"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="11"
                      y1="15"
                      x2="10"
                      y2="5"
                      stroke="#72B832"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="11"
                      y1="15"
                      x2="12"
                      y2="4"
                      stroke="#88D040"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="17"
                      y1="14"
                      x2="16"
                      y2="7"
                      stroke="#6AAE30"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="17"
                      y1="14"
                      x2="18"
                      y2="6"
                      stroke="#80C840"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {isHov && (
                    <span
                      className="text-[7px] font-pixel text-[#A8D870]
                      bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      200g reclaim
                    </span>
                  )}
                </div>
              ) : bs === 'empty' ? (
                isHov ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.08 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-[#C8A96E]
                      bg-[#C8A96E]/20 flex items-center justify-center
                      text-[#C8A96E] text-2xl font-thin leading-none"
                    >
                      +
                    </div>
                    <span
                      className="text-[8px] font-pixel text-[#C8A96E]
                      bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      plant
                    </span>
                  </motion.div>
                ) : (
                  <div className="opacity-[0.15]">
                    <IconSeedling size={18} />
                  </div>
                )
              ) : (
                // ── Growing or ready: multi-icon grid ──
                <div className="flex flex-col items-center gap-0.5">
                  {/* Crop icon grid */}
                  <motion.div
                    key={`crop-${plotIndex}-${cropType}-${growStage}`}
                    initial={{ scale: 0, y: 6 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${gridCols}, ${iconSize}px)`,
                      gap: '1px'
                    }}
                  >
                    {Array.from({ length: visibleIcons }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.04, type: 'spring', stiffness: 300 }}
                      >
                        <CropStageIcon cropType={cropType} stage={growStage} size={iconSize} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Overflow count badge */}
                  {seedCount > 9 && (
                    <span className="text-[8px] font-pixel text-[#C8A96E] bg-black/60 px-1 rounded">
                      +{seedCount - 9}
                    </span>
                  )}

                  {bs === 'growing' && (
                    <div className="flex flex-col items-center gap-0.5 mt-0.5">
                      {/* Progress bar width scales with grid */}
                      <div
                        className="h-1.5 bg-black/50 rounded-full overflow-hidden"
                        style={{ width: `${gridCols * iconSize + (gridCols - 1)}px` }}
                      >
                        <div
                          className="h-full bg-[#DAA520] rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                      </div>
                      {isHov && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[8px] font-pixel text-[#B8A060]
                            bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap"
                        >
                          {formatDuration(timeLeft)}
                        </motion.span>
                      )}
                    </div>
                  )}

                  {bs === 'ready' && (
                    <motion.span
                      animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
                      transition={{ repeat: Infinity, duration: 1.1 }}
                      className="text-[8px] font-pixel text-[#CCFF66]
                        bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      harvest!
                    </motion.span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Plot index badges on owned plots */}
        {tiles
          .filter((t) => t.plotIndex < plotsOwned)
          .map(({ key, g, plotIndex }) => {
            const { left, top } = toPercent(g.cx + TW * 0.26, g.cy - TH * 0.32);
            return (
              <div
                key={`badge-${key}`}
                className="absolute pointer-events-none text-[7px] font-pixel text-[#8B7040]/55"
                style={{ left, top, transform: 'translate(-50%, -50%)' }}
              >
                {plotIndex + 1}
              </div>
            );
          })}

        {/* Farm title + hint */}
        <div className="absolute top-2 left-3 pointer-events-none">
          <p className="text-[9px] font-pixel text-[#6ABF3A]/70 tracking-widest uppercase">
            Your Farm
          </p>
        </div>
        <div className="absolute bottom-2 right-3 pointer-events-none">
          <p className="text-[9px] font-pixel text-[#2A5A18]/55">
            tap soil to plant · tap crop to harvest
          </p>
        </div>
      </div>

      <PlantModal
        plotId={plantingPlotId}
        inventory={inventory}
        onPlant={(plotId, cropType, count) => {
          onPlant(plotId, cropType, count);
          setPlantingPlotId(null);
        }}
        onClose={() => setPlantingPlotId(null)}
      />
    </>
  );
}
