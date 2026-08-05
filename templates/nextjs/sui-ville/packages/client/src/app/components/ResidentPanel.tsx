'use client';

import type { AgentRow, MemoryRow, RelationshipRow } from '../lib/types';
import {
  LOCATION_LABEL,
  OCCUPATION_LABEL,
  paletteFor,
  shortAddr
} from '../lib/constants';

interface Props {
  agents: AgentRow[];
  relationships: RelationshipRow[];
  memories: MemoryRow[];
  gold: Record<string, number>;
  mayorAgent: string | null;
  selectedId: string | null;
  onSelect: (agentId: string | null) => void;
}

export function ResidentPanel({
  agents,
  relationships,
  memories,
  gold,
  mayorAgent,
  selectedId,
  onSelect
}: Props) {
  const selected = agents.find((a) => a.agentId === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="pixel-border-dark shrink-0 bg-panel px-3 py-2 text-[9px] text-gold">
        RESIDENTS ({agents.length})
      </div>

      <div className="pixel-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {agents.length === 0 && (
          <p className="p-2 text-[8px] leading-relaxed text-[#94b0c2]">
            No residents yet — the agent runner will mint them once it connects.
          </p>
        )}
        {agents.map((a) => (
          <ResidentCard
            key={a.agentId}
            agent={a}
            isMayor={a.agentId === mayorAgent}
            selected={a.agentId === selectedId}
            onClick={() => onSelect(a.agentId === selectedId ? null : a.agentId)}
          />
        ))}
      </div>

      {selected && (
        <ResidentDetail
          agent={selected}
          agents={agents}
          relationships={relationships}
          memories={memories}
          gold={gold[selected.owner] ?? 0}
        />
      )}
    </div>
  );
}

function ResidentCard({
  agent,
  isMayor,
  selected,
  onClick
}: {
  agent: AgentRow;
  isMayor: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const p = paletteFor(agent.agentId);
  return (
    <button
      onClick={onClick}
      className={`block w-full border-2 px-2 py-2 text-left transition-colors ${
        selected ? 'border-gold bg-panel' : 'border-[#3b4a8c] bg-panel/50 hover:bg-panel'
      }`}
    >
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 12 16" shapeRendering="crispEdges" className="h-7 w-5 shrink-0">
          <rect x="2" y="0" width="8" height="3" fill={p.hair} />
          <rect x="3" y="3" width="6" height="4" fill={p.skin} />
          <rect x="2" y="7" width="8" height="5" fill={p.shirt} />
          <rect x="3" y="12" width="2" height="4" fill={p.pants} />
          <rect x="7" y="12" width="2" height="4" fill={p.pants} />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[9px] text-cream">
            {agent.name}
            {isMayor && <span className="text-gold">♦MAYOR</span>}
          </div>
          <div className="mt-1 text-[7px] text-[#94b0c2]">
            {OCCUPATION_LABEL[agent.occupation] ?? '?'} · at {LOCATION_LABEL[agent.location] ?? '?'}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Meter label="ENE" value={agent.energy} color="#38b764" />
        <Meter label="MOOD" value={agent.mood} color="#ffcd75" />
      </div>
    </button>
  );
}

function ResidentDetail({
  agent,
  agents,
  relationships,
  memories,
  gold
}: {
  agent: AgentRow;
  agents: AgentRow[];
  relationships: RelationshipRow[];
  memories: MemoryRow[];
  gold: number;
}) {
  const rels = relationships
    .filter((r) => r.agentId === agent.agentId)
    .sort((a, b) => b.affinity - a.affinity);
  const memory = memories.find((m) => m.agentId === agent.agentId);
  const nameOf = (id: string) => agents.find((a) => a.agentId === id)?.name ?? shortAddr(id);

  return (
    <div className="pixel-border-dark pixel-scroll max-h-[45%] shrink-0 space-y-2 overflow-y-auto bg-panel p-3">
      <div className="text-[9px] text-gold">{agent.name.toUpperCase()}</div>
      <p className="text-[7px] leading-relaxed text-cream">“{agent.personality}”</p>

      <div className="grid grid-cols-2 gap-1 text-[7px] text-[#94b0c2]">
        <span>
          job <span className="text-cream">{OCCUPATION_LABEL[agent.occupation]}</span>
        </span>
        <span>
          gold <span className="text-gold">{gold}g</span>
        </span>
        <span>
          owner <span className="text-cream">{shortAddr(agent.owner)}</span>
        </span>
        <span>
          id <span className="text-cream">{shortAddr(agent.agentId)}</span>
        </span>
      </div>

      {memory && memory.digest && (
        <div>
          <div className="mb-1 text-[7px] text-[#566c86]">MEMORY</div>
          <p className="bg-night/60 p-1.5 text-[7px] leading-relaxed text-[#94b0c2]">
            {memory.digest}
          </p>
        </div>
      )}

      <div>
        <div className="mb-1 text-[7px] text-[#566c86]">BONDS</div>
        {rels.length === 0 && <p className="text-[7px] text-[#566c86]">has not met anyone yet</p>}
        {rels.map((r) => (
          <div key={r.otherAgent} className="mb-1 flex items-center gap-2 text-[7px]">
            <span className="w-14 shrink-0 truncate text-cream">{nameOf(r.otherAgent)}</span>
            <div className="h-2 flex-1 bg-night/60">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(2, r.affinity))}%` }}
              />
            </div>
            <span className="w-8 text-right text-[#94b0c2]">{r.affinity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-1 items-center gap-1">
      <span className="text-[6px] text-[#566c86]">{label}</span>
      <div className="h-2 flex-1 bg-night/70">
        <div
          className="h-full"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}
