'use client';

import { memo, useMemo } from 'react';
import type { AgentRow, PositionRow } from '../lib/types';
import { BUILDINGS, MAP_H, MAP_W, POS_SCALE, SQUARE, STAND_OFFSETS, TREES } from '../lib/constants';
import { BuildingSprite } from './BuildingSprite';
import { AgentSprite } from './AgentSprite';

interface Props {
  agents: AgentRow[];
  /** agentId → live position from the offchain agent_position table. */
  positions: Record<string, PositionRow>;
  /** agentId → speech bubble text (recent dialogue). */
  bubbles: Record<string, string>;
  selectedId: string | null;
  onSelect: (agentId: string) => void;
  night: boolean;
  /** Active EventKind (0 = none). */
  eventKind: number;
}

const ANCHORS: Record<number, { x: number; y: number }> = {
  0: SQUARE,
  ...Object.fromEntries(BUILDINGS.map((b) => [b.kind, { x: b.x, y: b.y }]))
};

export const TownMap = memo(function TownMap({
  agents,
  positions,
  bubbles,
  selectedId,
  onSelect,
  night,
  eventKind
}: Props) {
  const storm = eventKind === 2;

  // Agents with a live on-chain position stand exactly there; the rest fall
  // back to a stable door-side slot at their coarse location.
  const placed = useMemo(() => {
    const out: Array<{ agent: AgentRow; x: number; y: number; activity: number | null }> = [];
    const fallback: AgentRow[] = [];
    for (const a of agents) {
      const pos = positions[a.agentId];
      if (pos) {
        out.push({ agent: a, x: pos.x / POS_SCALE, y: pos.y / POS_SCALE, activity: pos.activity });
      } else {
        fallback.push(a);
      }
    }
    const byLoc = new Map<number, AgentRow[]>();
    for (const a of fallback) {
      const list = byLoc.get(a.location) ?? [];
      list.push(a);
      byLoc.set(a.location, list);
    }
    for (const [loc, list] of byLoc) {
      const anchor = ANCHORS[loc] ?? SQUARE;
      list.sort((a, b) => (a.agentId < b.agentId ? -1 : 1));
      list.forEach((agent, i) => {
        const off = STAND_OFFSETS[i % STAND_OFFSETS.length];
        out.push({ agent, x: anchor.x + off.x, y: anchor.y + off.y, activity: null });
      });
    }
    return out;
  }, [agents, positions]);

  return (
    <div
      className="pixel-border relative mx-auto select-none"
      style={{
        aspectRatio: `${MAP_W} / ${MAP_H}`,
        // Fill the column, but never grow taller than ~60% of the viewport
        // so the dialogue feed below always stays visible.
        width: 'min(100%, 100vh)',
        background: storm ? '#28584a' : night ? '#1e3a34' : '#38b764'
      }}
    >
      {/* terrain, paths, water and furniture live in one crisp SVG layer */}
      <svg
        className="absolute inset-0 z-0 h-full w-full"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <Terrain night={night} />
        <Paths />
        <Plaza night={night} />
        <FarmField night={night} />
        <DockPier />
        <CafeTerrace />
        <TavernPatio />
        <WorkshopYard />
        <TownHallForecourt />
        <Decorations night={night} />
      </svg>

      {/* trees (DOM sprites, drawn above the terrain but below agents) */}
      {TREES.map((t, i) => (
        <Tree key={i} x={t.x} y={t.y} big={t.big} night={night} />
      ))}

      {/* buildings */}
      {BUILDINGS.map((b) => (
        <BuildingSprite key={b.kind} b={b} night={night} />
      ))}

      {/* the traveling merchant parks a caravan by the square */}
      {eventKind === 3 && <MerchantCaravan />}

      {/* market-day stalls on the square */}
      {eventKind === 1 && <MarketStalls />}

      {/* residents */}
      {placed.map(({ agent, x, y, activity }) => (
        <AgentSprite
          key={agent.agentId}
          agentId={agent.agentId}
          name={agent.name}
          activity={activity ?? inferActivity(agent)}
          selected={agent.agentId === selectedId}
          bubble={bubbles[agent.agentId]}
          onClick={() => onSelect(agent.agentId)}
          leftPct={(x / MAP_W) * 100}
          topPct={(y / MAP_H) * 100}
        />
      ))}

      {/* weather + night overlays */}
      {storm && (
        <>
          <div className="pointer-events-none absolute inset-0 z-30 bg-[#29366f]/30" />
          <div className="animate-rain pointer-events-none absolute inset-0 z-30" />
        </>
      )}
      {night && <div className="pointer-events-none absolute inset-0 z-30 bg-[#1a1c2c]/35" />}
    </div>
  );
});

// ─── Terrain ─────────────────────────────────────────────────────────────────

function Terrain({ night }: { night: boolean }) {
  const grass2 = night ? '#255c48' : '#2f9e58';
  const sand = night ? '#6b5a3c' : '#d9c07e';
  const water = night ? '#27356e' : '#3b5dc9';
  const waterHi = night ? '#31427f' : '#4a6fd6';
  return (
    <>
      {/* mowed-grass checkering */}
      {GRASS_PATCHES.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={grass2} opacity="0.5" />
      ))}

      {/* shoreline + river running along the south-east corner */}
      <polygon points="30,24 32.6,21.4 35,20.2 38,18.6 40,17.8 40,24" fill={sand} />
      <polygon points="31.4,24 33.6,21.9 36,20.7 39,19.2 40,18.8 40,24" fill={water} />
      {/* water sparkle rows */}
      <g fill={waterHi}>
        <rect x="34.4" y="21.6" width="1.4" height="0.28">
          <animate attributeName="opacity" values="1;0.2;1" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <rect x="37.2" y="20.4" width="1.2" height="0.28">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2.8s" repeatCount="indefinite" />
        </rect>
        <rect x="33.2" y="23" width="1.6" height="0.28">
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="38.4" y="22.2" width="1.2" height="0.28">
          <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3.1s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* small pond in the north-east meadow */}
      <ellipse cx="36.4" cy="4.6" rx="2.4" ry="1.4" fill={sand} />
      <ellipse cx="36.4" cy="4.6" rx="2" ry="1.1" fill={water} />
      <rect x="35.4" y="4.3" width="1" height="0.25" fill={waterHi}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
      </rect>
    </>
  );
}

/** Dirt paths: plaza → every building door, tavern → dock. */
function Paths() {
  const edge = '#a5793f';
  const fill = '#c8a06a';
  return (
    <g strokeLinecap="square">
      {PATHS.map(([pts], i) => (
        <g key={i}>
          <polyline points={pts} fill="none" stroke={edge} strokeWidth="1.2" opacity="0.6" />
          <polyline points={pts} fill="none" stroke={fill} strokeWidth="0.9" />
        </g>
      ))}
    </g>
  );
}

/** Central stone plaza with an animated fountain and benches.
 *  Idle spots (runner): (17.6,12.6) (22.4,12.6) (19,14.2) (21,14.2)
 *  (18.2,11.2) (21.8,11.2) (16.5,13.8) (23.5,13.8). */
function Plaza({ night }: { night: boolean }) {
  const stone = night ? '#4d4636' : '#a77b5b';
  const stoneDark = night ? '#403a2d' : '#96684a';
  return (
    <>
      <rect x="16" y="10.4" width="8" height="4.4" fill={stone} />
      {/* paving joints */}
      <g fill={stoneDark}>
        <rect x="16" y="11.5" width="8" height="0.14" />
        <rect x="16" y="12.6" width="8" height="0.14" />
        <rect x="16" y="13.7" width="8" height="0.14" />
        <rect x="18" y="10.4" width="0.14" height="4.4" />
        <rect x="20" y="10.4" width="0.14" height="4.4" />
        <rect x="22" y="10.4" width="0.14" height="4.4" />
      </g>
      {/* fountain */}
      <rect x="19.1" y="11.4" width="1.8" height="1.4" fill="#94b0c2" />
      <rect x="19.35" y="11.65" width="1.3" height="0.9" fill="#5fcde4">
        <animate attributeName="opacity" values="1;0.5;1" dur="1.6s" repeatCount="indefinite" />
      </rect>
      <rect x="19.85" y="11.05" width="0.3" height="0.5" fill="#5fcde4">
        <animate attributeName="height" values="0.5;0.9;0.5" dur="1.6s" repeatCount="indefinite" />
      </rect>
      {/* benches flanking the fountain (idle spots sit right behind them) */}
      <Bench x={17.0} y={12.1} />
      <Bench x={21.8} y={12.1} />
      <Bench x={18.4} y={13.7} />
      <Bench x={20.4} y={13.7} />
    </>
  );
}

/** Fenced crop field south of the farmhouse.
 *  Work spots (runner): (3,20.2) (5,20.8) (7,20.2) (9,20.8) (4,21.8) (8,21.8). */
function FarmField({ night }: { night: boolean }) {
  const soil = night ? '#4a3226' : '#8f563b';
  const soilDark = night ? '#3c2a20' : '#7a4633';
  const crop = night ? '#3f7a2b' : '#6abe30';
  const rows = [19.8, 20.7, 21.6];
  return (
    <>
      <rect x="1.6" y="19.4" width="10" height="3.1" fill={soil} />
      {rows.map((y, i) => (
        <g key={i}>
          <rect x="1.8" y={y} width="9.6" height="0.5" fill={soilDark} />
          {Array.from({ length: 8 }, (_, k) => (
            <rect key={k} x={2.2 + k * 1.2} y={y - 0.24} width="0.5" height="0.5" fill={crop} />
          ))}
        </g>
      ))}
      <Fence x1={1.4} y1={19.1} x2={11.8} y2={19.1} />
      <Fence x1={1.4} y1={22.7} x2={11.8} y2={22.7} />
      <Fence x1={1.4} y1={19.1} x2={1.4} y2={22.7} vertical />
      <Fence x1={11.8} y1={19.1} x2={11.8} y2={22.7} vertical />
      {/* scarecrow */}
      <g>
        <rect x="10.4" y="20.2" width="0.24" height="1.4" fill="#663931" />
        <rect x="9.9" y="20.5" width="1.24" height="0.22" fill="#663931" />
        <rect x="10.28" y="19.7" width="0.5" height="0.5" fill="#ffcd75" />
      </g>
    </>
  );
}

/** Wooden pier reaching into the river.
 *  Work spots (runner): (37.2,21) (38.3,21.8) (36.4,21.9). */
function DockPier() {
  const plank = '#8f563b';
  const plankDark = '#663931';
  return (
    <>
      <polygon points="35.4,20.2 39.6,22.4 39.6,23.2 35.4,21.2" fill={plank} />
      <polygon points="35.4,20.9 39.6,23 39.6,23.2 35.4,21.2" fill={plankDark} />
      {/* mooring posts */}
      <rect x="36.2" y="20.9" width="0.3" height="0.8" fill={plankDark} />
      <rect x="38.6" y="22.1" width="0.3" height="0.8" fill={plankDark} />
      {/* barrels and crate */}
      <rect x="34.2" y="19.9" width="0.8" height="0.9" fill="#a5793f" />
      <rect x="34.2" y="20.2" width="0.8" height="0.16" fill="#663931" />
      <rect x="35.2" y="19.6" width="0.7" height="0.7" fill="#c8a06a" />
    </>
  );
}

/** Cafe terrace: two parasol tables.
 *  Eat spots (runner): (27.2,10.6) (28.8,10.6) (31.2,10.6) (32.8,10.6). */
function CafeTerrace() {
  return (
    <>
      <Table x={28} y={10.1} parasol="#b13e53" />
      <Table x={32} y={10.1} parasol="#38b764" />
    </>
  );
}

/** Tavern patio: two plain wooden tables with lanterns.
 *  Eat spots (runner): (25.2,19.2) (26.8,19.2) (29.2,19.2) (30.8,19.2). */
function TavernPatio() {
  return (
    <>
      <Table x={26} y={18.7} />
      <Table x={30} y={18.7} />
      {/* lantern post between the tables */}
      <rect x="27.9" y="18.2" width="0.2" height="1.2" fill="#663931" />
      <rect x="27.7" y="17.9" width="0.6" height="0.5" fill="#ffcd75">
        <animate attributeName="opacity" values="1;0.6;1" dur="1.8s" repeatCount="indefinite" />
      </rect>
    </>
  );
}

/** Workbenches + anvil by the workshop.
 *  Work spots (runner): (7.6,7.2) (12.4,7.2) (10,7.8). */
function WorkshopYard() {
  return (
    <>
      <rect x="6.9" y="6.6" width="1.5" height="0.6" fill="#a5793f" />
      <rect x="6.9" y="7.2" width="0.22" height="0.5" fill="#663931" />
      <rect x="8.2" y="7.2" width="0.22" height="0.5" fill="#663931" />
      <rect x="11.7" y="6.6" width="1.5" height="0.6" fill="#a5793f" />
      <rect x="11.7" y="7.2" width="0.22" height="0.5" fill="#663931" />
      <rect x="13" y="7.2" width="0.22" height="0.5" fill="#663931" />
      {/* anvil */}
      <rect x="9.7" y="7.15" width="0.7" height="0.3" fill="#696a6a" />
      <rect x="9.85" y="7.45" width="0.4" height="0.35" fill="#595652" />
    </>
  );
}

/** Paved forecourt + noticeboard in front of the town hall.
 *  Idle spots (runner): (18.6,6.6) (21.4,6.6) (20,7.4) (19,7.9) (21,7.9). */
function TownHallForecourt() {
  return (
    <>
      <rect x="17.8" y="6.2" width="4.4" height="2" fill="#a77b5b" opacity="0.9" />
      <rect x="17.8" y="7.1" width="4.4" height="0.14" fill="#96684a" />
      {/* noticeboard */}
      <rect x="22.5" y="6.1" width="0.22" height="1.1" fill="#663931" />
      <rect x="23" y="6.1" width="0.22" height="1.1" fill="#663931" />
      <rect x="22.3" y="5.5" width="1.14" height="0.8" fill="#c8a06a" />
      <rect x="22.45" y="5.65" width="0.4" height="0.28" fill="#f4f4f4" />
      <rect x="22.95" y="5.7" width="0.3" height="0.35" fill="#f4f4f4" />
    </>
  );
}

/** Flowers, bushes, rocks and lampposts scattered around town. */
function Decorations({ night }: { night: boolean }) {
  const bush = night ? '#1e5240' : '#257953';
  return (
    <>
      {FLOWERS.map(([x, y, c], i) => (
        <g key={`f${i}`}>
          <rect x={x} y={y} width="0.3" height="0.3" fill={c as string} />
          <rect x={(x as number) + 0.05} y={(y as number) + 0.3} width="0.2" height="0.25" fill={bush} />
        </g>
      ))}
      {BUSHES.map(([x, y], i) => (
        <g key={`b${i}`}>
          <rect x={x} y={y} width="1.1" height="0.7" fill={bush} />
          <rect x={(x as number) + 0.2} y={(y as number) - 0.25} width="0.7" height="0.35" fill={bush} />
        </g>
      ))}
      {ROCKS.map(([x, y], i) => (
        <g key={`r${i}`}>
          <rect x={x} y={y} width="0.8" height="0.5" fill="#847e87" />
          <rect x={(x as number) + 0.15} y={(y as number) - 0.2} width="0.5" height="0.25" fill="#94919a" />
        </g>
      ))}
      {LAMPS.map(([x, y], i) => (
        <g key={`l${i}`}>
          <rect x={x} y={y} width="0.22" height="1.5" fill="#3f3f74" />
          <rect x={(x as number) - 0.2} y={(y as number) - 0.5} width="0.62" height="0.55" fill={night ? '#ffcd75' : '#94b0c2'}>
            {night && (
              <animate attributeName="opacity" values="1;0.75;1" dur="2.4s" repeatCount="indefinite" />
            )}
          </rect>
        </g>
      ))}
    </>
  );
}

// ─── Furniture primitives ────────────────────────────────────────────────────

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="1.4" height="0.3" fill="#a5793f" />
      <rect x={x + 0.12} y={y + 0.3} width="0.2" height="0.4" fill="#663931" />
      <rect x={x + 1.08} y={y + 0.3} width="0.2" height="0.4" fill="#663931" />
    </g>
  );
}

/** Round-ish table with two stools, optionally shaded by a parasol. */
function Table({ x, y, parasol }: { x: number; y: number; parasol?: string }) {
  return (
    <g>
      {parasol && (
        <>
          <polygon
            points={`${x - 1.1},${y - 0.7} ${x},${y - 1.5} ${x + 1.1},${y - 0.7}`}
            fill={parasol}
          />
          <rect x={x - 0.09} y={y - 0.8} width="0.18" height="1" fill="#663931" />
        </>
      )}
      <rect x={x - 0.7} y={y} width="1.4" height="0.55" fill="#c8a06a" />
      <rect x={x - 0.7} y={y + 0.4} width="1.4" height="0.15" fill="#a5793f" />
      {/* stools left / right (eat spots stand just outside them) */}
      <rect x={x - 1.25} y={y + 0.25} width="0.45" height="0.4" fill="#a5793f" />
      <rect x={x + 0.8} y={y + 0.25} width="0.45" height="0.4" fill="#a5793f" />
    </g>
  );
}

function Fence({
  x1,
  y1,
  x2,
  y2,
  vertical
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  vertical?: boolean;
}) {
  const posts = [];
  if (vertical) {
    for (let y = y1; y <= y2; y += 0.9) posts.push({ x: x1 - 0.12, y });
  } else {
    for (let x = x1; x <= x2; x += 0.9) posts.push({ x, y: y1 - 0.3 });
  }
  return (
    <g>
      {vertical ? (
        <rect x={x1 - 0.06} y={y1} width="0.12" height={y2 - y1} fill="#a5793f" />
      ) : (
        <rect x={x1} y={y1 - 0.12} width={x2 - x1} height="0.12" fill="#a5793f" />
      )}
      {posts.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width="0.24" height={vertical ? 0.24 : 0.5} fill="#663931" />
      ))}
    </g>
  );
}

// ─── Event props ─────────────────────────────────────────────────────────────

/** Covered wagon parked next to the town square while the Merchant visits. */
function MerchantCaravan() {
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${((SQUARE.x + 3.2) / MAP_W) * 100}%`,
        top: `${((SQUARE.y - 3.2) / MAP_H) * 100}%`,
        width: `${(4 / MAP_W) * 100}%`
      }}
    >
      <svg viewBox="0 0 16 12" shapeRendering="crispEdges" className="w-full">
        <rect x="2" y="1" width="12" height="5" fill="#f4f4f4" />
        <rect x="2" y="1" width="12" height="1" fill="#b13e53" />
        <rect x="2" y="3" width="12" height="1" fill="#b13e53" />
        <rect x="1" y="6" width="14" height="3" fill="#8f563b" />
        <circle cx="4.5" cy="10" r="1.7" fill="#45283c" />
        <circle cx="11.5" cy="10" r="1.7" fill="#45283c" />
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-full w-max -translate-x-1/2 bg-night/70 px-1 py-0.5 text-[7px] leading-none text-gold">
        MERCHANT
      </div>
    </div>
  );
}

/** A pair of striped stalls that pop up on the square on market day. */
function MarketStalls() {
  const stall = (x: number, y: number, c: string, key: number) => (
    <div
      key={key}
      className="absolute z-10"
      style={{
        left: `${(x / MAP_W) * 100}%`,
        top: `${(y / MAP_H) * 100}%`,
        width: `${(2.6 / MAP_W) * 100}%`
      }}
    >
      <svg viewBox="0 0 10 8" shapeRendering="crispEdges" className="w-full">
        <rect x="0" y="0" width="10" height="3" fill="#f4f4f4" />
        <rect x="0" y="0" width="2" height="3" fill={c} />
        <rect x="4" y="0" width="2" height="3" fill={c} />
        <rect x="8" y="0" width="2" height="3" fill={c} />
        <rect x="1" y="3" width="1" height="4" fill="#8f563b" />
        <rect x="8" y="3" width="1" height="4" fill="#8f563b" />
        <rect x="1" y="4" width="8" height="2" fill="#d9a066" />
      </svg>
    </div>
  );
  return (
    <>
      {stall(SQUARE.x - 5.2, SQUARE.y - 2.6, '#b13e53', 0)}
      {stall(SQUARE.x + 3.0, SQUARE.y + 1.6, '#38b764', 1)}
    </>
  );
}

function Tree({ x, y, big, night }: { x: number; y: number; big?: boolean; night: boolean }) {
  const w = big ? 3 : 2;
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${(x / MAP_W) * 100}%`,
        top: `${((y - w) / MAP_H) * 100}%`,
        width: `${(w / MAP_W) * 100}%`
      }}
    >
      <svg viewBox="0 0 8 12" shapeRendering="crispEdges" className="w-full">
        <rect x="1" y="0" width="6" height="3" fill={night ? '#1e5240' : '#257953'} />
        <rect x="0" y="2" width="8" height="4" fill={night ? '#1e5240' : '#257953'} />
        <rect x="1" y="3" width="2" height="1" fill={night ? '#2b6b52' : '#38b764'} />
        <rect x="5" y="1" width="2" height="1" fill={night ? '#2b6b52' : '#38b764'} />
        <rect x="3" y="6" width="2" height="4" fill="#663931" />
        <rect x="2" y="10" width="4" height="1" fill="#1a1c2c" opacity="0.3" />
      </svg>
    </div>
  );
}

/**
 * Fallback when an agent has no live position row: infer a plausible
 * activity from location + energy so the map still reads well.
 */
function inferActivity(a: AgentRow): number {
  if (a.location === 0) return a.energy < 25 ? 1 : 5; // outdoors: nap or wander
  return 2; // inside a building: treat as busy
}

// ─── Layout data (tile coordinates) ──────────────────────────────────────────

/** Path polylines: plaza → building doors; tavern → dock. */
const PATHS: Array<[string]> = [
  ['20,10.4 20,6.5'], // plaza → town hall
  ['16.2,11.6 12,9 10,7.5'], // plaza → workshop
  ['23.8,11.4 27,10.2 30,9.5'], // plaza → cafe
  ['16.6,14.4 10,17 6,19'], // plaza → farm
  ['23.4,14.4 26,16.5 28,18.5'], // plaza → tavern
  ['29.2,18.8 33,20 35.6,20.9'] // tavern → dock pier
];

/** Mowed checkering rectangles: [x, y, w, h]. */
const GRASS_PATCHES: Array<[number, number, number, number]> = [
  [0, 0, 5, 3],
  [9, 1, 6, 2],
  [24, 0, 5, 2.4],
  [33, 6.5, 5, 2.4],
  [1, 9, 4, 3],
  [12, 12, 3.4, 2.4],
  [25, 12.6, 4, 2.4],
  [13, 18, 5, 2.6],
  [20, 20.5, 6, 2.6],
  [31, 14, 4, 2.2],
  [6, 11, 3, 2],
  [17, 16.5, 4, 2]
];

/** [x, y, color] flower pixels. */
const FLOWERS: Array<[number, number, string]> = [
  [15.2, 10.2, '#d95763'],
  [24.6, 10.6, '#ffcd75'],
  [15.4, 14.8, '#f4b41b'],
  [24.8, 14.6, '#d95763'],
  [13.2, 3.4, '#ffcd75'],
  [22.5, 2.2, '#d95763'],
  [31.8, 4.2, '#f4b41b'],
  [2.4, 6.8, '#d95763'],
  [16.8, 20.4, '#ffcd75'],
  [26.2, 21.6, '#d95763'],
  [32.4, 12.4, '#ffcd75'],
  [5.4, 13.6, '#f4b41b'],
  [36.6, 9.8, '#d95763'],
  [28.4, 13.8, '#ffcd75']
];

const BUSHES: Array<[number, number]> = [
  [14.6, 6.6],
  [25.6, 6.2],
  [12.6, 15.2],
  [30.6, 12.2],
  [2.2, 16.4],
  [21.4, 17.6],
  [33.4, 15.6],
  [17.4, 3.2]
];

const ROCKS: Array<[number, number]> = [
  [0.8, 11.8],
  [38.2, 12.6],
  [24.2, 20.8],
  [31.6, 2.6],
  [12.4, 20.2]
];

/** Lampposts: plaza corners + one at the tavern path fork. */
const LAMPS: Array<[number, number]> = [
  [15.6, 9.9],
  [24.2, 9.9],
  [15.6, 13.8],
  [24.2, 13.8],
  [25.4, 15.9]
];
