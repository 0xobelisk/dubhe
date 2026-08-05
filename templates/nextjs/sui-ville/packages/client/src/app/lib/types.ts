export interface AgentRow {
  owner: string;
  agentId: string;
  name: string;
  personality: string;
  occupation: number;
  energy: number;
  mood: number;
  location: number;
  lastActionMs: number;
}

export interface TownRow {
  day: number;
  dayStartMs: number;
  dayLengthMs: number;
  festivalUntil: number;
  mayorAgent: string;
  mayorOwner: string;
  population: number;
}

export interface ElectionRow {
  round: number;
  endsAt: number;
  candidateA: string;
  candidateB: string;
  votesA: number;
  votesB: number;
}

/** Daily random event rolled on-chain by town_system::tick. */
export interface TownEventRow {
  kind: number; // 0 none, 1 market day, 2 storm, 3 merchant
  until: number;
  magnitude: number;
  startedDay: number;
}

/** Live per-agent map position from the offchain agent_position resource.
 *  x/y are tile coordinates scaled by POS_SCALE (278 = tile 27.8). */
export interface PositionRow {
  agentId: string;
  x: number;
  y: number;
  activity: number;
  updatedAtMs: number;
}

export interface DialogueRow {
  /** Transaction digest — unique per indexed dialogue write. */
  id: string;
  speaker: string;
  listener: string;
  content: string;
  atMs: number;
}

export interface RelationshipRow {
  owner: string;
  agentId: string;
  otherAgent: string;
  affinity: number;
  interactions: number;
}

export interface MemoryRow {
  agentId: string;
  digest: string;
  updatedAt: number;
}

export interface WorldState {
  agents: AgentRow[];
  town: TownRow | null;
  election: ElectionRow | null;
  event: TownEventRow | null;
  /** agentId → live map position (from the keyed agent_position table). */
  positions: Record<string, PositionRow>;
  /** Accumulated feed, newest first. */
  dialogues: DialogueRow[];
  relationships: RelationshipRow[];
  memories: MemoryRow[];
  /** owner address → gold amount */
  gold: Record<string, number>;
  /** ms timestamp of the last successful poll, 0 before the first one. */
  lastSyncMs: number;
  error: string | null;
}
