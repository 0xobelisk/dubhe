'use client';

import type { AgentRow, ElectionRow, TownEventRow, TownRow } from '../lib/types';
import { EVENT_COLOR, EVENT_LABEL, isZeroAddr, shortAddr } from '../lib/constants';

interface Props {
  town: TownRow | null;
  election: ElectionRow | null;
  event: TownEventRow | null;
  agents: AgentRow[];
  lastSyncMs: number;
  error: string | null;
}

export function HUD({ town, election, event, agents, lastSyncMs, error }: Props) {
  const now = Date.now();
  const festival = town ? town.festivalUntil > now : false;
  const mayor = town && !isZeroAddr(town.mayorAgent)
    ? agents.find((a) => a.agentId === town.mayorAgent)?.name ?? shortAddr(town.mayorAgent)
    : null;
  const electionLive = election ? election.endsAt > now : false;
  const nameOf = (id: string) => agents.find((a) => a.agentId === id)?.name ?? shortAddr(id);

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b-4 border-panel bg-night px-4 py-3">
      <h1 className="text-sm tracking-wider text-gold">
        DUBHE <span className="text-accent">VILLE</span>
      </h1>

      <Badge label="DAY" value={town ? String(town.day) : '…'} />
      <Badge label="POP" value={town ? String(town.population) : '…'} />
      <Badge label="MAYOR" value={mayor ?? 'none yet'} />

      {festival && (
        <span className="animate-blink bg-accent px-2 py-1 text-[8px] text-night">
          ★ FESTIVAL IN TOWN ★
        </span>
      )}

      {event && event.kind !== 0 && event.until > now && (
        <span
          className="px-2 py-1 text-[8px] text-night"
          style={{ background: EVENT_COLOR[event.kind] ?? '#94b0c2' }}
        >
          {EVENT_LABEL[event.kind] ?? 'TOWN EVENT'}
        </span>
      )}

      {electionLive && election && (
        <span className="bg-panel px-2 py-1 text-[8px] text-cream">
          {isZeroAddr(election.candidateA) && isZeroAddr(election.candidateB) ? (
            <>ELECTION · NOMINATIONS OPEN</>
          ) : (
            <>
              VOTE&nbsp;
              <span className="text-gold">{nameOf(election.candidateA)}</span> {election.votesA} :{' '}
              {election.votesB} <span className="text-gold">{nameOf(election.candidateB)}</span>
            </>
          )}
        </span>
      )}

      <span className="ml-auto flex items-center gap-2 text-[8px] text-[#94b0c2]">
        <span
          className={`inline-block h-2 w-2 ${
            error ? 'bg-accent' : lastSyncMs ? 'bg-grass animate-blink' : 'bg-[#566c86]'
          }`}
        />
        {error ? 'INDEXER OFFLINE' : lastSyncMs ? 'LIVE ON-CHAIN' : 'CONNECTING…'}
      </span>
    </header>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[9px]">
      <span className="text-[#566c86]">{label}&nbsp;</span>
      <span className="text-cream">{value}</span>
    </span>
  );
}
