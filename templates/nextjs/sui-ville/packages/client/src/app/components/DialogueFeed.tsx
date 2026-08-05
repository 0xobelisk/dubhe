'use client';

import type { AgentRow, DialogueRow } from '../lib/types';
import { shortAddr } from '../lib/constants';

interface Props {
  dialogues: DialogueRow[];
  agents: AgentRow[];
}

export function DialogueFeed({ dialogues, agents }: Props) {
  const nameOf = (id: string) => agents.find((a) => a.agentId === id)?.name ?? shortAddr(id);

  return (
    <div className="flex h-full flex-col">
      <div className="pixel-border-dark shrink-0 bg-panel px-3 py-2 text-[9px] text-gold">
        TOWN GOSSIP
      </div>
      <div className="pixel-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pt-2">
        {dialogues.length === 0 && (
          <p className="p-2 text-[8px] text-[#566c86]">All quiet… nobody has spoken yet.</p>
        )}
        {dialogues.map((d) => (
          <div key={d.id} className="border-l-4 border-panel bg-panel/40 px-2 py-1.5">
            <div className="mb-1 flex items-baseline gap-2 text-[7px]">
              <span className="text-gold">{nameOf(d.speaker)}</span>
              <span className="text-[#566c86]">→ {nameOf(d.listener)}</span>
              <span className="ml-auto text-[#566c86]">{timeAgo(d.atMs)}</span>
            </div>
            <p className="text-[7px] leading-relaxed text-cream">{d.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
