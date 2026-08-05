'use client';

import type { AgentRow, ElectionRow, TownRow } from '../lib/types';
import { isZeroAddr, paletteFor, shortAddr } from '../lib/constants';

interface Props {
  election: ElectionRow | null;
  town: TownRow | null;
  agents: AgentRow[];
}

export function ElectionPanel({ election, town, agents }: Props) {
  const now = Date.now();
  const nameOf = (id: string) => agents.find((a) => a.agentId === id)?.name ?? shortAddr(id);
  const live = election !== null && election.round > 0 && election.endsAt > now;
  const mayor = town && !isZeroAddr(town.mayorAgent) ? town.mayorAgent : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="pixel-border-dark shrink-0 bg-panel px-3 py-2 text-[9px] text-gold">
        TOWN HALL
      </div>

      {/* incumbent */}
      <div className="border-2 border-[#3b4a8c] bg-panel/50 p-3">
        <div className="mb-2 text-[7px] text-[#566c86]">CURRENT MAYOR</div>
        {mayor ? (
          <div className="flex items-center gap-2">
            <MiniSprite agentId={mayor} />
            <div>
              <div className="text-[10px] text-gold">{nameOf(mayor)}</div>
              <div className="mt-1 text-[7px] text-[#94b0c2]">
                office of {shortAddr(town!.mayorOwner)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[8px] text-[#94b0c2]">The mayor&apos;s chair is empty.</p>
        )}
      </div>

      {/* current round */}
      <div className="border-2 border-[#3b4a8c] bg-panel/50 p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[7px] text-[#566c86]">
            {election && election.round > 0 ? `ELECTION ROUND ${election.round}` : 'ELECTION'}
          </span>
          {live && (
            <span className="animate-blink text-[7px] text-accent">
              ends in {formatLeft(election!.endsAt - now)}
            </span>
          )}
        </div>

        {!election || election.round === 0 ? (
          <p className="text-[8px] leading-relaxed text-[#94b0c2]">
            No election has been held yet. The town opens one every 3 days.
          </p>
        ) : !live ? (
          <p className="text-[8px] leading-relaxed text-[#94b0c2]">
            Round {election.round} is settled. The next one opens on schedule — every 3rd town day.
          </p>
        ) : isZeroAddr(election.candidateA) && isZeroAddr(election.candidateB) ? (
          <p className="text-[8px] leading-relaxed text-gold">
            Nominations are open! Any resident can run for {20}g.
          </p>
        ) : (
          <div className="space-y-2">
            <Candidate
              agentId={election.candidateA}
              name={nameOf(election.candidateA)}
              votes={election.votesA}
              total={election.votesA + election.votesB}
              empty={isZeroAddr(election.candidateA)}
            />
            <Candidate
              agentId={election.candidateB}
              name={nameOf(election.candidateB)}
              votes={election.votesB}
              total={election.votesA + election.votesB}
              empty={isZeroAddr(election.candidateB)}
            />
          </div>
        )}
      </div>

      <p className="px-1 text-[7px] leading-relaxed text-[#566c86]">
        Every ballot is an on-chain transaction: one vote per resident per round, enforced by a
        keyed vote_record. The winner&apos;s owner can throw town festivals from the treasury.
      </p>
    </div>
  );
}

function Candidate({
  agentId,
  name,
  votes,
  total,
  empty
}: {
  agentId: string;
  name: string;
  votes: number;
  total: number;
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="border border-dashed border-[#566c86] p-2 text-[7px] text-[#566c86]">
        open candidate slot
      </div>
    );
  }
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <MiniSprite agentId={agentId} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-[8px]">
          <span className="text-cream">{name}</span>
          <span className="text-gold">
            {votes} vote{votes === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-1 h-2 bg-night/70">
          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function MiniSprite({ agentId }: { agentId: string }) {
  const p = paletteFor(agentId);
  return (
    <svg viewBox="0 0 12 16" shapeRendering="crispEdges" className="h-8 w-6 shrink-0">
      <rect x="2" y="0" width="8" height="3" fill={p.hair} />
      <rect x="3" y="3" width="6" height="4" fill={p.skin} />
      <rect x="2" y="7" width="8" height="5" fill={p.shirt} />
      <rect x="3" y="12" width="2" height="4" fill={p.pants} />
      <rect x="7" y="12" width="2" height="4" fill={p.pants} />
    </svg>
  );
}

function formatLeft(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
