'use client';

import { useMemo } from 'react';
import type { AgentRow, RelationshipRow } from '../lib/types';
import { paletteFor } from '../lib/constants';

interface Props {
  agents: AgentRow[];
  relationships: RelationshipRow[];
  selectedId: string | null;
  onSelect: (agentId: string | null) => void;
}

/**
 * Town-wide bond graph: residents on a circle, edges weighted by affinity.
 * Directed on-chain edges (a→b, b→a) are merged into one undirected edge
 * showing the average affinity.
 */
export function RelationGraph({ agents, relationships, selectedId, onSelect }: Props) {
  const { positions, edges } = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const n = Math.max(agents.length, 1);
    agents.forEach((a, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      positions.set(a.agentId, {
        x: 50 + 36 * Math.cos(angle),
        y: 50 + 36 * Math.sin(angle)
      });
    });

    const merged = new Map<string, { a: string; b: string; sum: number; count: number; interactions: number }>();
    for (const r of relationships) {
      if (!positions.has(r.agentId) || !positions.has(r.otherAgent)) continue;
      const key = [r.agentId, r.otherAgent].sort().join('|');
      const e = merged.get(key) ?? {
        a: r.agentId,
        b: r.otherAgent,
        sum: 0,
        count: 0,
        interactions: 0
      };
      e.sum += r.affinity;
      e.count += 1;
      e.interactions += r.interactions;
      merged.set(key, e);
    }
    const edges = [...merged.values()].map((e) => ({
      ...e,
      affinity: Math.round(e.sum / e.count)
    }));
    return { positions, edges };
  }, [agents, relationships]);

  return (
    <div className="flex h-full flex-col">
      <div className="pixel-border-dark shrink-0 bg-panel px-3 py-2 text-[9px] text-gold">
        TOWN BONDS
      </div>

      {agents.length === 0 ? (
        <p className="p-3 text-[8px] text-[#566c86]">No residents yet.</p>
      ) : (
        <svg viewBox="0 0 100 100" className="mt-2 w-full flex-1">
          {edges.map((e) => {
            const pa = positions.get(e.a)!;
            const pb = positions.get(e.b)!;
            const dim =
              selectedId !== null && e.a !== selectedId && e.b !== selectedId;
            return (
              <g key={`${e.a}|${e.b}`} opacity={dim ? 0.15 : 1}>
                <line
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={affinityColor(e.affinity)}
                  strokeWidth={0.4 + Math.min(2.4, e.affinity / 30)}
                />
                <text
                  x={(pa.x + pb.x) / 2}
                  y={(pa.y + pb.y) / 2 - 1}
                  textAnchor="middle"
                  fontSize="3.4"
                  fill="#f4f4f4"
                  style={{ fontFamily: 'inherit' }}
                >
                  {e.affinity}
                </text>
              </g>
            );
          })}

          {agents.map((a) => {
            const p = positions.get(a.agentId)!;
            const pal = paletteFor(a.agentId);
            const selected = a.agentId === selectedId;
            return (
              <g
                key={a.agentId}
                className="cursor-pointer"
                onClick={() => onSelect(selected ? null : a.agentId)}
              >
                {selected && (
                  <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill="none" stroke="#ffcd75" strokeWidth={0.8} />
                )}
                <rect x={p.x - 3.5} y={p.y - 3.5} width={7} height={3} fill={pal.hair} />
                <rect x={p.x - 3.5} y={p.y - 0.5} width={7} height={4} fill={pal.shirt} />
                <text
                  x={p.x}
                  y={p.y + 8.5}
                  textAnchor="middle"
                  fontSize="3.8"
                  fill={selected ? '#ffcd75' : '#f4f4f4'}
                  style={{ fontFamily: 'inherit' }}
                >
                  {a.name}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <div className="shrink-0 space-y-1 p-2 text-[7px] text-[#94b0c2]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1 w-6" style={{ background: '#566c86' }} /> acquaintance
          <span className="ml-2 inline-block h-1 w-6" style={{ background: '#5b6ee1' }} /> friend
          <span className="ml-2 inline-block h-1 w-6" style={{ background: '#ffcd75' }} /> close
        </div>
        <p>Edge label = average mutual affinity. Click a resident to focus their bonds.</p>
      </div>
    </div>
  );
}

function affinityColor(affinity: number): string {
  if (affinity >= 70) return '#ffcd75';
  if (affinity >= 55) return '#5b6ee1';
  return '#566c86';
}
