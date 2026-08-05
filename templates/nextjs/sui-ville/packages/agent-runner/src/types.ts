import type { Dubhe } from '@0xobelisk/sui-client';

/** Normalized `agent` table row (graphql returns numbers as strings). */
export interface AgentRow {
  owner: string; // entityId — the citizen wallet that owns the agent
  agentId: string;
  name: string;
  personality: string;
  occupation: number;
  energy: number;
  mood: number;
  location: number;
  lastActionMs: number;
  lastWorkMs: number;
  lastSleepMs: number;
}

export interface ItemRow {
  itemId: string;
  kind: number;
  quality: number;
}

export interface TownConfigRow {
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

/** Daily random event rolled by town_system::tick. */
export interface TownEventRow {
  kind: number; // EventKind: 0 none, 1 market day, 2 storm, 3 merchant
  until: number;
  magnitude: number;
  startedDay: number;
}

/** One decision produced by a brain for one agent. */
export type Action =
  | { kind: 'sleep' }
  | { kind: 'eat'; locationKind: number }
  | { kind: 'move'; locationKind: number; activity: number; reason: string }
  | { kind: 'work'; locationKind: number }
  | { kind: 'talk'; listener: AgentRow; content: string }
  | { kind: 'gift'; receiver: AgentRow; itemId: string }
  | { kind: 'nominate' }
  | { kind: 'vote'; candidate: string }
  | { kind: 'idle'; reason: string };

/** A player wallet managed by the runner, with its authorized session key. */
export interface Citizen {
  index: number;
  address: string;
  /** Signs with the main wallet key (onboarding, session activation). */
  main: Dubhe;
  /** Signs with the ephemeral session key (all game actions). */
  session: Dubhe;
  /** Local expiry of the active session (ms epoch) — renewed by the runner. */
  sessionExpiresAt: number;
  userStorageId: string;
  agents: AgentRow[];
}
