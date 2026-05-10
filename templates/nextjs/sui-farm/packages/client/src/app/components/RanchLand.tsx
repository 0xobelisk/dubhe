'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PetAvatar, IconWarning } from './PetAvatar';
import {
  type PetData,
  type PetInventory,
  SPECIES_NAME,
  RARITY_COLOR,
  RARITY_LABEL,
  FAVORITE_FOOD,
  CROP_FULL
} from './PetPanel';

// ── Isometric geometry constants ───────────────────────────────────────────────
const TW = 110; // tile diamond width
const TH = 55; // tile diamond height (TW/2)
const TD = 20; // depth thickness
const COLS = 4;
const ROWS = 3;

// ViewBox: fits 4×3 isometric grid with extra headroom for fence posts/bubbles
const VBX = -185,
  VBY = -30,
  VBW = 450,
  VBH = 240;
const ASPECT = VBH / VBW;

// ── Color palette ──────────────────────────────────────────────────────────────
const GRASS = { t: '#4A8A28', r: '#2A5010', l: '#3A7018', s: '#5AAA34' };
const GRASS_H = { t: '#5CAA30', r: '#3A6818', l: '#4A8820', s: '#70CC40' };
const FENCE_TOP = '#A0683A';
const FENCE_SIDE = '#7A4A22';
const FENCE_DARK = '#5A3010';

// ── tileGeo ────────────────────────────────────────────────────────────────────
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
    cy: py + TH / 2,
    topV: { x: px + TW / 2, y: py },
    rightV: { x: px + TW, y: py + TH / 2 },
    bottomV: { x: px + TW / 2, y: py + TH },
    leftV: { x: px, y: py + TH / 2 }
  };
}

// ── Perimeter vertices (clockwise, continuous path) ────────────────────────────
// Mathematical proof: each consecutive pair is a tile-edge-connected vertex.
//   - topV(c,0) → topV(c+1,0)  :  topV(c+1,0) = rightV(c,0)  ✓
//   - topV(COLS-1,0) → rightV(COLS-1,0)  :  adjacent on same tile  ✓
//   - rightV(c,r) → rightV(c,r+1)  :  rightV(c,r+1) = bottomV(c,r)  ✓
//   - rightV(COLS-1,ROWS-1) → bottomV(COLS-1,ROWS-1)  :  adjacent  ✓
//   - bottomV(c,ROWS-1) → bottomV(c-1,ROWS-1)  :  bottomV(c-1,R) = leftV(c,R)  ✓
//   - bottomV(0,ROWS-1) → leftV(0,ROWS-1)  :  adjacent  ✓
//   - leftV(0,r) → leftV(0,r-1)  :  leftV(0,r-1) = topV(0,r)  ✓
//   - leftV(0,0) → topV(0,0)  :  adjacent (closes loop)  ✓
function buildPerimeter(): Array<{ x: number; y: number }> {
  const v: Array<{ x: number; y: number }> = [];
  for (let c = 0; c < COLS; c++) v.push(tileGeo(c, 0).topV);
  v.push(tileGeo(COLS - 1, 0).rightV);
  for (let r = 1; r < ROWS; r++) v.push(tileGeo(COLS - 1, r).rightV);
  v.push(tileGeo(COLS - 1, ROWS - 1).bottomV);
  for (let c = COLS - 2; c >= 0; c--) v.push(tileGeo(c, ROWS - 1).bottomV);
  v.push(tileGeo(0, ROWS - 1).leftV);
  for (let r = ROWS - 2; r >= 0; r--) v.push(tileGeo(0, r).leftV);
  return v;
}
const PERIMETER = buildPerimeter();

// ── SVG helpers ────────────────────────────────────────────────────────────────
function toPercent(svgX: number, svgY: number) {
  return {
    left: `${((svgX - VBX) / VBW) * 100}%`,
    top: `${((svgY - VBY) / VBH) * 100}%`
  };
}

function isoToScreen(col: number, row: number) {
  const px = ((col - row) * TW) / 2 + TW / 2;
  const py = ((col + row) * TH) / 2;
  return toPercent(px, py);
}

function isoZ(col: number, row: number) {
  return Math.round(row * COLS + col) + 10;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface WanderPos {
  col: number;
  row: number;
  flip: boolean;
}

interface RanchLandProps {
  inventory: PetInventory;
  cropInventory: Record<number, bigint>;
  isLoading: boolean;
  onFeedPet: (petId: string, cropType: number, amount: number) => void;
  onAssignSlot: (petId: string, slot: number) => void;
  onUnassignSlot: (slot: number) => void;
  onDismissPet: (petId: string) => void;
  onListPet: (petId: string, price: bigint) => void;
  onBuySlot: () => void;
}

// ── Satiety decay ──────────────────────────────────────────────────────────────
function currentSatiety(pet: PetData, now: number) {
  const drained = Math.floor((now - pet.fedAt) / (4 * 3600 * 1000)) * 20;
  return Math.max(0, pet.satiety - drained);
}

// ── ActionBubble ───────────────────────────────────────────────────────────────
function ActionBubble({
  pet,
  now,
  cropInventory,
  isLoading,
  emptySlots,
  onFeed,
  onAssign,
  onUnassign,
  onDismiss,
  onList,
  onClose,
  isActive,
  activeSlot
}: {
  pet: PetData;
  now: number;
  cropInventory: Record<number, bigint>;
  isLoading: boolean;
  emptySlots: number[];
  onFeed: (ct: number, amt: number) => void;
  onAssign: (slot: number) => void;
  onUnassign: () => void;
  onDismiss: () => void;
  onList: (price: bigint) => void;
  onClose: () => void;
  isActive: boolean;
  activeSlot?: number;
}) {
  const [mode, setMode] = useState<'actions' | 'feed' | 'list' | 'assign'>('actions');
  const [feedCrop, setFeedCrop] = useState(1);
  const [feedAmt, setFeedAmt] = useState(1);
  const [listPrice, setListPrice] = useState('');
  const satiety = currentSatiety(pet, now);
  const isFav = (ct: number) => FAVORITE_FOOD[pet.species] === CROP_FULL[ct];
  const CROP_SHORT: Record<number, string> = { 1: 'W', 2: 'C', 3: 'Ca', 4: 'P' };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 8 }}
      transition={{ duration: 0.15 }}
      className="bg-gray-950/95 border border-amber-600/50 rounded-xl shadow-2xl p-3 w-52 space-y-2"
      style={{ backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PetAvatar species={pet.species} level={pet.level} size={28} />
          <div>
            <p className="font-pixel text-amber-200 text-xs">{SPECIES_NAME[pet.species]}</p>
            <p className={`text-xs ${RARITY_COLOR[pet.rarity]}`}>
              {RARITY_LABEL[pet.rarity]} Lv.{pet.level}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-amber-700 hover:text-amber-400 text-xs leading-none pb-0.5"
        >
          ×
        </button>
      </div>

      {/* Satiety bar */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-amber-700 w-12 font-pixel">Satiety</span>
        <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              satiety >= 60 ? 'bg-green-500' : satiety >= 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${satiety}%` }}
          />
        </div>
        <span className="text-xs text-amber-600 w-5 text-right">{satiety}</span>
      </div>

      {isActive && activeSlot !== undefined && (
        <p className="text-xs text-emerald-500 font-pixel">Active — Slot {activeSlot + 1}</p>
      )}

      {/* Actions */}
      {mode === 'actions' && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setMode('feed')}
            disabled={isLoading}
            className="px-2 py-1 rounded-lg text-xs font-pixel bg-green-900/60 hover:bg-green-800 text-green-300 disabled:opacity-50 transition-colors"
          >
            Feed
          </button>
          {isActive ? (
            <button
              onClick={() => {
                onUnassign();
                onClose();
              }}
              disabled={isLoading}
              className="px-2 py-1 rounded-lg text-xs font-pixel bg-amber-900/60 hover:bg-amber-800 text-amber-300 disabled:opacity-50 transition-colors"
            >
              → Ranch
            </button>
          ) : (
            <button
              onClick={() => setMode('assign')}
              disabled={isLoading || emptySlots.length === 0}
              className="px-2 py-1 rounded-lg text-xs font-pixel bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 disabled:opacity-50 transition-colors"
              title={emptySlots.length === 0 ? 'No empty slots' : ''}
            >
              Activate
            </button>
          )}
          <button
            onClick={() => setMode('list')}
            disabled={isLoading}
            className="px-2 py-1 rounded-lg text-xs font-pixel bg-blue-900/60 hover:bg-blue-800 text-blue-300 disabled:opacity-50 transition-colors"
          >
            List
          </button>
          <button
            onClick={() => {
              onDismiss();
              onClose();
            }}
            disabled={isLoading}
            className="px-2 py-1 rounded-lg text-xs font-pixel bg-red-950/60 hover:bg-red-900 text-red-400 disabled:opacity-50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Feed */}
      {mode === 'feed' && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((ct) => (
              <button
                key={ct}
                onClick={() => setFeedCrop(ct)}
                className={`py-1 rounded text-xs font-pixel transition-colors relative
                  ${
                    feedCrop === ct ? 'bg-amber-700 text-white' : 'bg-amber-900/40 text-amber-400'
                  }`}
              >
                {isFav(ct) && (
                  <span className="absolute -top-1 -right-0.5 text-red-400 text-[9px]">♥</span>
                )}
                <div>{CROP_SHORT[ct]}</div>
                <div className="text-amber-700 opacity-80">{Number(cropInventory[ct] ?? 0)}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              min={1}
              max={Number(cropInventory[feedCrop] ?? 0)}
              value={feedAmt}
              onChange={(e) => setFeedAmt(Math.max(1, Number(e.target.value)))}
              className="w-14 bg-gray-800 text-amber-200 text-xs rounded px-1.5 py-1 border border-amber-700/40"
            />
            <button
              onClick={() => {
                onFeed(feedCrop, feedAmt);
                setMode('actions');
              }}
              disabled={isLoading || Number(cropInventory[feedCrop] ?? 0) < feedAmt}
              className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-pixel py-1 rounded-lg disabled:opacity-50 transition-colors"
            >
              Feed x{feedAmt}
              {isFav(feedCrop) ? ' ♥' : ''}
            </button>
          </div>
          <button
            onClick={() => setMode('actions')}
            className="text-amber-700 text-xs hover:text-amber-500"
          >
            ← back
          </button>
        </div>
      )}

      {/* Assign slot */}
      {mode === 'assign' && (
        <div className="space-y-2">
          <p className="text-amber-600 text-xs font-pixel">Choose slot:</p>
          <div className="flex gap-1.5">
            {emptySlots.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onAssign(s);
                  onClose();
                }}
                disabled={isLoading}
                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-pixel py-1.5 rounded-lg disabled:opacity-50"
              >
                Slot {s + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMode('actions')}
            className="text-amber-700 text-xs hover:text-amber-500"
          >
            ← back
          </button>
        </div>
      )}

      {/* List */}
      {mode === 'list' && (
        <div className="space-y-2">
          <input
            type="number"
            min={1}
            placeholder="Price (MIST)"
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
            className="w-full bg-gray-800 text-amber-200 text-xs rounded px-2 py-1.5 border border-amber-700/40"
          />
          <button
            onClick={() => {
              const p = BigInt(listPrice || '0');
              if (p > 0n) {
                onList(p);
                setMode('actions');
                onClose();
              }
            }}
            disabled={isLoading || !listPrice || BigInt(listPrice || '0') <= 0n}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white text-xs font-pixel py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            List on Market
          </button>
          <button
            onClick={() => setMode('actions')}
            className="text-amber-700 text-xs hover:text-amber-500"
          >
            ← back
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── RanchLand ──────────────────────────────────────────────────────────────────
export function RanchLand({
  inventory,
  cropInventory,
  isLoading,
  onFeedPet,
  onAssignSlot,
  onUnassignSlot,
  onDismissPet,
  onListPet
}: RanchLandProps) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [wanderPos, setWanderPos] = useState<Map<string, WanderPos>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { activeSlots, ranchPets, slotsOwned, hatch } = inventory;
  const slottedPets = activeSlots
    .map((p, i) => (p ? { pet: p, slot: i } : null))
    .filter(Boolean) as Array<{ pet: PetData; slot: number }>;
  const allPets: PetData[] = [...slottedPets.map((s) => s.pet), ...ranchPets];
  const emptySlots = Array.from({ length: slotsOwned }, (_, i) => i).filter(
    (i) => activeSlots[i] === null
  );

  // Init / sync wander positions
  useEffect(() => {
    setWanderPos((prev) => {
      const next = new Map(prev);
      allPets.forEach((pet) => {
        if (!next.has(pet.petId)) {
          next.set(pet.petId, {
            col: 0.7 + Math.random() * (COLS - 1.5),
            row: 0.5 + Math.random() * (ROWS - 1.2),
            flip: Math.random() > 0.5
          });
        }
      });
      for (const id of next.keys()) {
        if (!allPets.find((p) => p.petId === id)) next.delete(id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPets.length]);

  // Wander tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setWanderPos((prev) => {
        const next = new Map(prev);
        allPets.forEach((pet) => {
          const cur = next.get(pet.petId);
          const nc = 0.7 + Math.random() * (COLS - 1.5);
          const nr = 0.5 + Math.random() * (ROWS - 1.2);
          next.set(pet.petId, {
            col: nc,
            row: nr,
            flip: cur ? nc < cur.col : Math.random() > 0.5
          });
        });
        return next;
      });
    }, 3800 + Math.random() * 2400);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPets.length]);

  // Wall-clock tick for satiety decay + hatch empty-state messaging
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Tile grid ──
  const tiles: Array<{ col: number; row: number; key: string; g: ReturnType<typeof tileGeo> }> = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      tiles.push({ col, row, key: `${col}-${row}`, g: tileGeo(col, row) });
    }
  }

  // ── Decorations ──
  const troughG = tileGeo(COLS - 1, 0);
  const hayG = tileGeo(0, ROWS - 1);

  return (
    // Outer: padding-bottom keeps aspect ratio; NO overflow-hidden here so bubbles can escape
    <div className="relative w-full select-none" style={{ paddingBottom: `${ASPECT * 100}%` }}>
      {/* ── Layer 1: clipped background + SVG ── */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, #3A7040 0%, #1C4420 60%, #0C2010 100%)'
        }}
      >
        {/* Grass texture dots */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, #8AEE50 0.5px, transparent 0.5px)',
            backgroundSize: '16px 16px'
          }}
        />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`${VBX} ${VBY} ${VBW} ${VBH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              id="ranch-grass-dots"
              x="0"
              y="0"
              width="12"
              height="9"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-25)"
            >
              <circle cx="3" cy="3" r="0.7" fill="rgba(120,220,60,0.18)" />
              <circle cx="8" cy="6" r="0.5" fill="rgba(80,180,30,0.14)" />
            </pattern>
          </defs>

          {/* Grass tiles */}
          {tiles.map(({ key, col, row, g }) => {
            const isHov = hoveredTile === key;
            const isBorL = col === 0;
            const isBorR = col === COLS - 1;
            const isBorB = row === ROWS - 1;
            const c = isHov ? GRASS_H : GRASS;
            return (
              <g
                key={key}
                onMouseEnter={() => setHoveredTile(key)}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <polygon points={g.top} fill={c.t} />
                <polygon points={g.top} fill="url(#ranch-grass-dots)" />
                <polygon points={g.top} fill="none" stroke={c.s} strokeWidth="0.6" />
                {/* Perimeter side faces use fence colour; interior faces use dark green */}
                <polygon points={g.right} fill={isBorR || isBorB ? FENCE_SIDE : c.r} />
                <polygon points={g.left} fill={isBorL || isBorB ? FENCE_DARK : c.l} />
              </g>
            );
          })}

          {/* Water trough at back-right */}
          <g>
            <polygon
              points={`${troughG.cx - 16},${troughG.cy - 8} ${troughG.cx + 16},${troughG.cy - 8} ${
                troughG.cx + 16
              },${troughG.cy} ${troughG.cx - 16},${troughG.cy}`}
              fill="#5A3820"
            />
            <polygon
              points={`${troughG.cx - 13},${troughG.cy - 7} ${troughG.cx + 13},${troughG.cy - 7} ${
                troughG.cx + 13
              },${troughG.cy - 2} ${troughG.cx - 13},${troughG.cy - 2}`}
              fill="#3888CC"
              opacity="0.85"
            >
              <animate
                attributeName="opacity"
                values="0.65;0.95;0.65"
                dur="2s"
                repeatCount="indefinite"
              />
            </polygon>
          </g>

          {/* Hay pile at front-left */}
          <g>
            <ellipse cx={hayG.cx} cy={hayG.cy - 4} rx="15" ry="7" fill="#C8A030" opacity="0.9" />
            <ellipse cx={hayG.cx} cy={hayG.cy - 6} rx="10" ry="5" fill="#E8BC40" opacity="0.9" />
            <line
              x1={hayG.cx - 8}
              y1={hayG.cy - 5}
              x2={hayG.cx - 3}
              y2={hayG.cy - 9}
              stroke="#DAAE30"
              strokeWidth="1"
            />
            <line
              x1={hayG.cx + 4}
              y1={hayG.cy - 4}
              x2={hayG.cx + 9}
              y2={hayG.cy - 8}
              stroke="#DAAE30"
              strokeWidth="1"
            />
            <line
              x1={hayG.cx - 1}
              y1={hayG.cy - 3}
              x2={hayG.cx + 3}
              y2={hayG.cy - 8}
              stroke="#F0C84A"
              strokeWidth="1"
            />
          </g>

          {/* ── Fence rails: continuous perimeter polylines ── */}
          {/* Close the loop by appending PERIMETER[0] at the end */}
          {(() => {
            const closed = [...PERIMETER, PERIMETER[0]];
            const rail1 = closed.map((v) => `${v.x},${v.y - 6}`).join(' ');
            const rail2 = closed.map((v) => `${v.x},${v.y - 11}`).join(' ');
            return (
              <>
                <polyline
                  points={rail1}
                  fill="none"
                  stroke={FENCE_SIDE}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <polyline
                  points={rail2}
                  fill="none"
                  stroke={FENCE_TOP}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </>
            );
          })()}

          {/* ── Fence posts at each perimeter vertex ── */}
          {PERIMETER.map((v, i) => {
            const hw = 3.5,
              h = 15;
            const bx = v.x,
              by = v.y;
            const ty = by - h;
            return (
              <g key={`post-${i}`}>
                {/* top cap */}
                <polygon
                  points={`${bx},${ty} ${bx + hw},${ty + hw * 0.5} ${bx},${ty + hw} ${bx - hw},${
                    ty + hw * 0.5
                  }`}
                  fill={FENCE_TOP}
                />
                {/* right face */}
                <polygon
                  points={`${bx + hw},${ty + hw * 0.5} ${bx + hw},${by + hw * 0.5} ${bx},${
                    by + hw * 0.5
                  } ${bx},${ty + hw}`}
                  fill={FENCE_SIDE}
                />
                {/* left face */}
                <polygon
                  points={`${bx - hw},${ty + hw * 0.5} ${bx},${ty + hw} ${bx},${by + hw * 0.5} ${
                    bx - hw
                  },${by + hw * 0.5}`}
                  fill={FENCE_DARK}
                />
              </g>
            );
          })}
        </svg>

        {/* Labels (clipped layer) */}
        <div className="absolute top-2 left-3">
          <p className="text-[9px] font-pixel text-[#6ABF3A]/70 tracking-widest uppercase">
            Your Ranch
          </p>
        </div>
        <div className="absolute bottom-2 right-3">
          <p className="text-[9px] font-pixel text-[#2A5A18]/60">tap a pet to interact</p>
        </div>
        {allPets.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center pointer-events-none">
            {hatch ? (
              nowTick >= hatch.hatchAt ? (
                <>
                  <p className="text-emerald-400/90 font-pixel text-xs">Pet is ready!</p>
                  <p className="text-[#3A7020] font-pixel text-[10px] opacity-80 max-w-[220px]">
                    Open PETS → Hatch tab and tap <span className="text-emerald-500">Open Egg</span>{' '}
                    to bring them to your ranch.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[#5A9040] font-pixel text-xs">Egg is incubating…</p>
                  <p className="text-[#3A7020] font-pixel text-[10px] opacity-80 max-w-[220px]">
                    Your pet appears here after incubation finishes and you complete{' '}
                    <span className="text-amber-600/90">Open Egg</span> in the Hatch tab.
                  </p>
                </>
              )
            ) : (
              <p className="text-[#3A7020] font-pixel text-xs opacity-60 max-w-[240px]">
                Buy an egg in PETS → Shop, then start incubation in the Hatch tab. After the timer,
                use Open Egg to get your first pet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Layer 2: pets + action bubbles — NOT clipped ── */}
      {/* This layer sits on top of the clipped background and can overflow for bubbles. */}
      <div className="absolute inset-0" onClick={() => setSelectedPetId(null)}>
        {allPets.map((pet) => {
          const pos = wanderPos.get(pet.petId);
          if (!pos) return null;
          const { left, top } = isoToScreen(pos.col, pos.row);
          const z = isoZ(pos.col, pos.row);
          const sat = currentSatiety(pet, nowTick);
          const hungry = sat < 30;
          const slotInfo = slottedPets.find((s) => s.pet.petId === pet.petId);
          const isSelected = selectedPetId === pet.petId;

          const idleClass = (() => {
            const base: Record<number, string> = {
              1: 'pet-anim-bunny',
              2: 'pet-anim-chick',
              3: 'pet-anim-fox',
              4: 'pet-anim-deer',
              5: 'pet-anim-dragon'
            };
            const b = base[pet.species] ?? '';
            if (sat < 30) return 'pet-anim-starving';
            return sat < 60 ? `${b} pet-anim-slow` : b;
          })();

          return (
            <div
              key={pet.petId}
              className="absolute pointer-events-none"
              style={{
                left,
                top,
                zIndex: z,
                transform: 'translate(-50%, -80%)',
                transition: 'left 2.8s ease-in-out, top 2.8s ease-in-out'
              }}
            >
              {/* Pet sprite */}
              <div
                className={`relative pointer-events-auto cursor-pointer ${idleClass} ${
                  isSelected ? 'level-up-glow' : ''
                }`}
                style={{ transform: pos.flip ? 'scaleX(-1)' : 'scaleX(1)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPetId((prev) => (prev === pet.petId ? null : pet.petId));
                }}
              >
                <PetAvatar species={pet.species} level={pet.level} size={42} />
                {hungry && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                  >
                    <IconWarning size={12} />
                  </motion.div>
                )}
                {slotInfo && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-emerald-700 border border-emerald-400 flex items-center justify-center">
                    <span className="text-white font-pixel" style={{ fontSize: '7px' }}>
                      {slotInfo.slot + 1}
                    </span>
                  </div>
                )}
              </div>
              {/* Ground shadow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-2 bg-black/30 rounded-full blur-sm pointer-events-none pet-shadow" />
            </div>
          );
        })}

        {/* Action bubble for selected pet — rendered in the UNCLIPPED layer */}
        <AnimatePresence>
          {selectedPetId &&
            (() => {
              const pet = allPets.find((p) => p.petId === selectedPetId);
              if (!pet) return null;
              const pos = wanderPos.get(selectedPetId);
              if (!pos) return null;

              const { left, top } = isoToScreen(pos.col, pos.row);
              const z = isoZ(pos.col, pos.row) + 50;
              const slotInfo = slottedPets.find((s) => s.pet.petId === selectedPetId);

              // Show bubble above the pet normally.
              // If pet is in upper half of ranch (row < ROWS/2), show below instead.
              const showBelow = pos.row < ROWS / 2;
              const bubbleTransform = showBelow
                ? 'translate(-50%, 8px)' // below the pet
                : 'translate(-50%, -230%)'; // above the pet

              return (
                <div
                  key={selectedPetId}
                  className="absolute pointer-events-none"
                  style={{
                    left,
                    top,
                    zIndex: z,
                    transform: bubbleTransform,
                    transition: 'left 2.8s ease-in-out, top 2.8s ease-in-out'
                  }}
                >
                  <div className="pointer-events-auto">
                    <ActionBubble
                      pet={pet}
                      now={nowTick}
                      cropInventory={cropInventory}
                      isLoading={isLoading}
                      emptySlots={emptySlots}
                      onFeed={(ct, amt) => onFeedPet(pet.petId, ct, amt)}
                      onAssign={(slot) => onAssignSlot(pet.petId, slot)}
                      onUnassign={() => slotInfo && onUnassignSlot(slotInfo.slot)}
                      onDismiss={() => onDismissPet(pet.petId)}
                      onList={(price) => onListPet(pet.petId, price)}
                      onClose={() => setSelectedPetId(null)}
                      isActive={!!slotInfo}
                      activeSlot={slotInfo?.slot}
                    />
                  </div>
                </div>
              );
            })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
