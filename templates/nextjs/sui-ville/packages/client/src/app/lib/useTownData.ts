'use client';

/**
 * Polls the Dubhe indexer for the whole town state. The chain (mirrored by
 * the indexer) is the single source of truth; this hook only accumulates the
 * dialogue feed client-side because offchain resources are upserted per
 * player (only the latest row per wallet survives in the indexer).
 */
import { useEffect, useRef, useState } from 'react';
import { createDubheGraphqlClient, DubheGraphqlClient } from '@0xobelisk/graphql-client';
import dubheMetadata from 'contracts/dubhe.config.json';
import { GRAPHQL_ENDPOINT, POLL_MS } from './constants';
import type {
  AgentRow,
  DialogueRow,
  ElectionRow,
  MemoryRow,
  PositionRow,
  RelationshipRow,
  TownEventRow,
  TownRow,
  WorldState
} from './types';

let client: DubheGraphqlClient | null = null;

function getClient(): DubheGraphqlClient {
  if (!client) {
    client = createDubheGraphqlClient({
      endpoint: GRAPHQL_ENDPOINT,
      dubheMetadata: dubheMetadata as any
    });
  }
  return client;
}

const EMPTY: WorldState = {
  agents: [],
  town: null,
  election: null,
  event: null,
  positions: {},
  dialogues: [],
  relationships: [],
  memories: [],
  gold: {},
  lastSyncMs: 0,
  error: null
};

export function useTownData(): WorldState {
  const [state, setState] = useState<WorldState>(EMPTY);
  // Feed accumulator survives across polls; keyed by tx digest.
  const feedRef = useRef<Map<string, DialogueRow>>(new Map());

  useEffect(() => {
    // Design-review mode: `/?mock=1` renders from static mock data (with
    // `&night=1` / `&event=1|2|3` toggles) without touching the indexer.
    const params = new URLSearchParams(window.location.search);
    if (params.get('mock')) {
      const opts = {
        event: Number(params.get('event') ?? 0),
        night: params.get('night') === '1'
      };
      const tick = async () => {
        const { mockWorld } = await import('./mockWorld');
        setState(mockWorld(Date.now(), opts));
      };
      tick();
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer);
    }

    let cancelled = false;

    async function poll() {
      try {
        const c = getClient();
        const [agentsRes, townRes, electionRes, eventRes, posRes, dialogueRes, relRes, memRes, goldRes] =
          await Promise.all([
            c.getAllTables<any>('agent', { first: 200 }),
            c.getAllTables<any>('townConfig', { first: 1 }),
            c.getAllTables<any>('electionState', { first: 1 }),
            // Tolerate indexers that predate the town_event table.
            c.getAllTables<any>('townEvent', { first: 1 }).catch(() => null),
            c.getAllTables<any>('agentPosition', { first: 200 }).catch(() => null),
            c.getAllTables<any>('dialogue', { first: 100 }),
            c.getAllTables<any>('relationship', { first: 500 }),
            c.getAllTables<any>('memoryDigest', { first: 200 }),
            c.getAllTables<any>('gold', { first: 100 })
          ]);
        if (cancelled) return;

        const agents: AgentRow[] = nodes(agentsRes).map((n) => ({
          owner: n.entityId,
          agentId: n.agentId,
          name: n.name ?? '',
          personality: n.personality ?? '',
          occupation: num(n.occupation),
          energy: num(n.energy),
          mood: num(n.mood),
          location: num(n.location),
          lastActionMs: num(n.lastActionMs)
        }));

        const townNode = nodes(townRes)[0];
        const town: TownRow | null = townNode
          ? {
              day: num(townNode.day),
              dayStartMs: num(townNode.dayStartMs),
              dayLengthMs: num(townNode.dayLengthMs),
              festivalUntil: num(townNode.festivalUntil),
              mayorAgent: townNode.mayorAgent ?? '0x0',
              mayorOwner: townNode.mayorOwner ?? '0x0',
              population: num(townNode.population)
            }
          : null;

        const elNode = nodes(electionRes)[0];
        const election: ElectionRow | null = elNode
          ? {
              round: num(elNode.round),
              endsAt: num(elNode.endsAt),
              candidateA: elNode.candidateA ?? '0x0',
              candidateB: elNode.candidateB ?? '0x0',
              votesA: num(elNode.votesA),
              votesB: num(elNode.votesB)
            }
          : null;

        const evNode = nodes(eventRes)[0];
        const event: TownEventRow | null = evNode
          ? {
              kind: num(evNode.kind),
              until: num(evNode.until),
              magnitude: num(evNode.magnitude),
              startedDay: num(evNode.startedDay)
            }
          : null;

        // One live position row per agent (agent_position is keyed by agent).
        const positions: Record<string, PositionRow> = {};
        for (const n of nodes(posRes)) {
          if (!n.agentId) continue;
          positions[n.agentId] = {
            agentId: n.agentId,
            x: num(n.x),
            y: num(n.y),
            activity: num(n.activity),
            updatedAtMs: num(n.updatedAtTimestampMs)
          };
        }

        // Merge the latest per-player dialogue rows into the running feed.
        for (const n of nodes(dialogueRes)) {
          const id = n.lastUpdateDigest ?? `${n.entityId}-${n.updatedAtTimestampMs}`;
          if (!feedRef.current.has(id)) {
            feedRef.current.set(id, {
              id,
              speaker: n.speaker,
              listener: n.listener,
              content: n.content ?? '',
              atMs: num(n.updatedAtTimestampMs)
            });
          }
        }
        const dialogues = [...feedRef.current.values()]
          .sort((a, b) => b.atMs - a.atMs)
          .slice(0, 80);

        const relationships: RelationshipRow[] = nodes(relRes).map((n) => ({
          owner: n.entityId,
          agentId: n.agentId,
          otherAgent: n.otherAgent,
          affinity: num(n.affinity),
          interactions: num(n.interactions)
        }));

        const memories: MemoryRow[] = nodes(memRes).map((n) => ({
          agentId: n.agentId,
          digest: n.digest ?? '',
          updatedAt: num(n.updatedAt)
        }));

        const gold: Record<string, number> = {};
        for (const n of nodes(goldRes)) gold[n.entityId] = num(n.amount);

        setState({
          agents,
          town,
          election,
          event,
          positions,
          dialogues,
          relationships,
          memories,
          gold,
          lastSyncMs: Date.now(),
          error: null
        });
      } catch (e: any) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, error: e?.message ?? String(e) }));
        }
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return state;
}

function nodes(res: any): any[] {
  return (res?.edges ?? []).map((e: any) => e.node).filter(Boolean);
}

function num(v: unknown): number {
  return v === undefined || v === null ? 0 : Number(v);
}
