/**
 * Perception layer: everything a brain knows about the world comes from the
 * indexer (GraphQL), which mirrors on-chain state. Chain remains the single
 * source of truth — the runner never keeps authoritative state locally.
 */
import { createDubheGraphqlClient, DubheGraphqlClient } from '@0xobelisk/graphql-client';
import { GRAPHQL_ENDPOINT, loadDubheMetadata } from './config.ts';
import type { AgentRow, ItemRow, TownConfigRow, ElectionRow, TownEventRow } from './types.ts';

export interface WorldSnapshot {
  town: TownConfigRow;
  election: ElectionRow;
  event: TownEventRow;
  /** Every agent in town, across all players. */
  agents: AgentRow[];
}

export class Perception {
  readonly client: DubheGraphqlClient;

  constructor() {
    this.client = createDubheGraphqlClient({
      endpoint: GRAPHQL_ENDPOINT,
      dubheMetadata: loadDubheMetadata()
    });
  }

  /** ObjectID of the shared world ScenePermit (written by the deploy hook). */
  async worldPermitId(): Promise<string> {
    const res = await this.client.getAllTables<any>('worldPermitId', { first: 1 });
    const row = res.edges?.[0]?.node;
    if (!row?.objectId) {
      throw new Error('world_permit_id not found in the indexer — is the DApp deployed and indexed?');
    }
    return row.objectId;
  }

  async snapshot(): Promise<WorldSnapshot> {
    const [townRes, electionRes, eventRes, agentsRes] = await Promise.all([
      this.client.getAllTables<any>('townConfig', { first: 1 }),
      this.client.getAllTables<any>('electionState', { first: 1 }),
      this.client.getAllTables<any>('townEvent', { first: 1 }),
      this.client.getAllTables<any>('agent', { first: 200 })
    ]);
    const town = townRes.edges?.[0]?.node ?? {};
    const election = electionRes.edges?.[0]?.node ?? {};
    const event = eventRes.edges?.[0]?.node ?? {};
    return {
      town: {
        day: num(town.day),
        dayStartMs: num(town.dayStartMs),
        dayLengthMs: num(town.dayLengthMs),
        festivalUntil: num(town.festivalUntil),
        mayorAgent: town.mayorAgent ?? '0x0',
        mayorOwner: town.mayorOwner ?? '0x0',
        population: num(town.population)
      },
      election: {
        round: num(election.round),
        endsAt: num(election.endsAt),
        candidateA: election.candidateA ?? '0x0',
        candidateB: election.candidateB ?? '0x0',
        votesA: num(election.votesA),
        votesB: num(election.votesB)
      },
      event: {
        kind: num(event.kind),
        until: num(event.until),
        magnitude: num(event.magnitude),
        startedDay: num(event.startedDay)
      },
      agents: (agentsRes.edges ?? []).map((e: any) => parseAgent(e.node))
    };
  }

  async agentsOf(owner: string): Promise<AgentRow[]> {
    const res = await this.client.getAllTables<any>('agent', {
      filter: { entityId: { equalTo: owner } },
      first: 10
    });
    return (res.edges ?? []).map((e: any) => parseAgent(e.node));
  }

  async goldOf(owner: string): Promise<number> {
    const res = await this.client.getAllTables<any>('gold', {
      filter: { entityId: { equalTo: owner } },
      first: 1
    });
    return num(res.edges?.[0]?.node?.amount);
  }

  async itemsOf(owner: string): Promise<ItemRow[]> {
    const res = await this.client.getAllTables<any>('item', {
      filter: { entityId: { equalTo: owner } },
      first: 50
    });
    return (res.edges ?? []).map((e: any) => ({
      itemId: e.node.itemId,
      kind: num(e.node.kind),
      quality: num(e.node.quality)
    }));
  }

  async hasRegistered(owner: string): Promise<boolean> {
    const res = await this.client.getAllTables<any>('profile', {
      filter: { entityId: { equalTo: owner } },
      first: 1
    });
    return (res.edges ?? []).length > 0;
  }

  async hasVoted(owner: string, round: number, agentId: string): Promise<boolean> {
    const res = await this.client.getAllTables<any>('voteRecord', {
      filter: {
        entityId: { equalTo: owner },
        round: { equalTo: String(round) },
        agentId: { equalTo: agentId }
      },
      first: 1
    });
    return (res.edges ?? []).length > 0;
  }

  /** Affinity from one agent towards another (0 when they never met). */
  async affinity(owner: string, agentId: string, otherAgent: string): Promise<number> {
    const res = await this.client.getAllTables<any>('relationship', {
      filter: {
        entityId: { equalTo: owner },
        agentId: { equalTo: agentId },
        otherAgent: { equalTo: otherAgent }
      },
      first: 1
    });
    return num(res.edges?.[0]?.node?.affinity);
  }
}

function parseAgent(node: any): AgentRow {
  return {
    owner: node.entityId,
    agentId: node.agentId,
    name: node.name ?? '',
    personality: node.personality ?? '',
    occupation: num(node.occupation),
    energy: num(node.energy),
    mood: num(node.mood),
    location: num(node.location),
    lastActionMs: num(node.lastActionMs),
    lastWorkMs: num(node.lastWorkMs),
    lastSleepMs: num(node.lastSleepMs)
  };
}

function num(v: unknown): number {
  return v === undefined || v === null ? 0 : Number(v);
}
