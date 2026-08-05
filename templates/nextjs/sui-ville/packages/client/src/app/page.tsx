'use client';

import { useMemo, useState } from 'react';
import { useTownData } from './lib/useTownData';
import { BUBBLE_TTL_MS } from './lib/constants';
import { HUD } from './components/HUD';
import { TownMap } from './components/TownMap';
import { ResidentPanel } from './components/ResidentPanel';
import { DialogueFeed } from './components/DialogueFeed';
import { RelationGraph } from './components/RelationGraph';
import { ElectionPanel } from './components/ElectionPanel';

type Tab = 'residents' | 'bonds' | 'election';

export default function Home() {
  const world = useTownData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('residents');

  // Latest fresh dialogue per speaker becomes a speech bubble on the map.
  const bubbles = useMemo(() => {
    const now = Date.now();
    const out: Record<string, string> = {};
    for (const d of world.dialogues) {
      if (now - d.atMs > BUBBLE_TTL_MS) continue;
      if (!out[d.speaker]) {
        out[d.speaker] = d.content.length > 90 ? `${d.content.slice(0, 90)}…` : d.content;
      }
    }
    return out;
  }, [world.dialogues, world.lastSyncMs]);

  // Cosmetic day/night: dusk falls over the last quarter of each on-chain day.
  const night = useMemo(() => {
    if (!world.town || !world.town.dayLengthMs) return false;
    const frac = (Date.now() - world.town.dayStartMs) / world.town.dayLengthMs;
    return frac > 0.75;
  }, [world.town, world.lastSyncMs]);

  const booting = world.lastSyncMs === 0;

  return (
    <div className="flex h-screen flex-col">
      <HUD
        town={world.town}
        election={world.election}
        event={world.event}
        agents={world.agents}
        lastSyncMs={world.lastSyncMs}
        error={world.error}
      />

      {booting ? (
        <Splash error={world.error} />
      ) : (
        <main className="flex min-h-0 flex-1 gap-4 p-4">
          <section className="flex min-w-0 flex-1 flex-col gap-4">
            <TownMap
              agents={world.agents}
              positions={world.positions}
              bubbles={bubbles}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
              night={night}
              eventKind={
                world.event && world.event.until > Date.now() ? world.event.kind : 0
              }
            />
            <div className="pixel-border min-h-0 flex-1 bg-night/60 p-2">
              <DialogueFeed dialogues={world.dialogues} agents={world.agents} />
            </div>
          </section>

          <aside className="pixel-border flex w-[300px] shrink-0 flex-col bg-night/60 p-3 xl:w-[340px]">
            <nav className="mb-3 flex shrink-0 gap-1">
              <TabButton label="TOWNSFOLK" active={tab === 'residents'} onClick={() => setTab('residents')} />
              <TabButton label="BONDS" active={tab === 'bonds'} onClick={() => setTab('bonds')} />
              <TabButton label="ELECTION" active={tab === 'election'} onClick={() => setTab('election')} />
            </nav>
            <div className="min-h-0 flex-1">
              {tab === 'residents' && (
                <ResidentPanel
                  agents={world.agents}
                  relationships={world.relationships}
                  memories={world.memories}
                  gold={world.gold}
                  mayorAgent={world.town?.mayorAgent ?? null}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
              {tab === 'bonds' && (
                <RelationGraph
                  agents={world.agents}
                  relationships={world.relationships}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
              {tab === 'election' && (
                <ElectionPanel election={world.election} town={world.town} agents={world.agents} />
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-1 py-1.5 text-[7px] transition-colors ${
        active ? 'bg-gold text-night' : 'bg-panel text-[#94b0c2] hover:text-cream'
      }`}
    >
      {label}
    </button>
  );
}

function Splash({ error }: { error: string | null }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="animate-blink text-lg text-gold">DUBHE VILLE</div>
      <p className="max-w-md text-[9px] leading-relaxed text-[#94b0c2]">
        {error
          ? `Cannot reach the indexer: ${error}`
          : 'Syncing the town from chain… make sure the localnet node, indexer and agent runner are up.'}
      </p>
    </main>
  );
}
