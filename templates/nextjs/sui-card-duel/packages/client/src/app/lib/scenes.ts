/**
 * Scene discovery via the Dubhe indexer system tables.
 *
 * The indexer mirrors every SceneStorage / ScenePermit into Postgres
 * (scene_storages / scene_storage_fields / scene_permits), exposed through
 * GraphQL as dubheSceneStorages / dubheSceneStorageFields. The raw queries
 * and BCS decoding helpers live in @0xobelisk/graphql-client; this module
 * only keeps the card_duel domain decoding (DuelScene / BrawlScene).
 */

import {
  type DubheGraphqlClient,
  decodeU8,
  decodeU32,
  decodeU64,
  decodeAddress,
  decodeVectorAddress,
  ZERO_ADDRESS
} from '@0xobelisk/graphql-client';
import { DappKey } from 'contracts/deployment';

// ── Decoded scene types ───────────────────────────────────────────────────────

export interface DuelScene {
  sceneId: string;
  permitId: string;
  challenger: string;
  opponent: string;
  stake: bigint;
  state: number;
  turnAddr: string;
  round: number;
  winner: string;
  usedCardsA: string[];
  usedCardsB: string[];
  lastActionMs: bigint;
  /** Escrowed pot (scene bag) */
  gold: bigint;
}

export interface BrawlScene {
  sceneId: string;
  permitId: string;
  host: string;
  entryFee: bigint;
  maxPlayers: number;
  state: number;
  round: number;
  turnIndex: number;
  players: string[];
  alive: string[];
  winner: string;
  lastActionMs: bigint;
  gold: bigint;
}

// ── Raw row fetching ──────────────────────────────────────────────────────────

interface SceneRow {
  sceneId: string;
  permitId: string;
}

type FieldMap = Record<string, string>; // fieldName -> raw hex

async function fetchSceneRows(
  graphqlClient: DubheGraphqlClient,
  sceneType: string
): Promise<SceneRow[]> {
  const result = await graphqlClient.getSceneStorages({
    dappKey: DappKey,
    sceneType,
    isDestroyed: false,
    first: 100
  });
  return (result?.edges ?? [])
    .map((e) => ({
      sceneId: e.node.sceneId,
      permitId: e.node.authorizedPermitId ?? ''
    }))
    .filter((r) => r.permitId);
}

async function fetchFieldMaps(
  graphqlClient: DubheGraphqlClient,
  sceneIds: string[]
): Promise<Record<string, FieldMap>> {
  if (sceneIds.length === 0) return {};
  const result = await graphqlClient.getSceneStorageFields({
    dappKey: DappKey,
    sceneIds,
    isDeleted: false,
    first: 1000
  });
  const maps: Record<string, FieldMap> = {};
  (result?.edges ?? []).forEach((e) => {
    const { sceneId, fieldName, fieldValueRaw } = e.node;
    if (!maps[sceneId]) maps[sceneId] = {};
    if (fieldValueRaw != null) maps[sceneId][fieldName] = fieldValueRaw;
  });
  return maps;
}

// ── Decoders ──────────────────────────────────────────────────────────────────

function decodeDuel(row: SceneRow, f: FieldMap): DuelScene | null {
  if (!f.challenger || !f.state) return null;
  return {
    sceneId: row.sceneId,
    permitId: row.permitId,
    challenger: decodeAddress(f.challenger),
    opponent: decodeAddress(f.opponent ?? ZERO_ADDRESS),
    stake: f.stake ? decodeU64(f.stake) : 0n,
    state: decodeU8(f.state),
    turnAddr: f.turn_addr ? decodeAddress(f.turn_addr) : ZERO_ADDRESS,
    round: f.round ? decodeU32(f.round) : 0,
    winner: f.winner ? decodeAddress(f.winner) : ZERO_ADDRESS,
    usedCardsA: f.used_cards_a ? decodeVectorAddress(f.used_cards_a) : [],
    usedCardsB: f.used_cards_b ? decodeVectorAddress(f.used_cards_b) : [],
    lastActionMs: f.last_action_ms ? decodeU64(f.last_action_ms) : 0n,
    gold: f.gold ? decodeU64(f.gold) : 0n
  };
}

function decodeBrawl(row: SceneRow, f: FieldMap): BrawlScene | null {
  if (!f.host || !f.state) return null;
  return {
    sceneId: row.sceneId,
    permitId: row.permitId,
    host: decodeAddress(f.host),
    entryFee: f.entry_fee ? decodeU64(f.entry_fee) : 0n,
    maxPlayers: f.max_players ? Number(decodeU64(f.max_players)) : 0,
    state: decodeU8(f.state),
    round: f.round ? decodeU32(f.round) : 0,
    turnIndex: f.turn_index ? Number(decodeU64(f.turn_index)) : 0,
    players: f.players ? decodeVectorAddress(f.players) : [],
    alive: f.alive ? decodeVectorAddress(f.alive) : [],
    winner: f.winner ? decodeAddress(f.winner) : ZERO_ADDRESS,
    lastActionMs: f.last_action_ms ? decodeU64(f.last_action_ms) : 0n,
    gold: f.gold ? decodeU64(f.gold) : 0n
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchDuels(graphqlClient: DubheGraphqlClient): Promise<DuelScene[]> {
  const rows = await fetchSceneRows(graphqlClient, 'duel');
  const fieldMaps = await fetchFieldMaps(
    graphqlClient,
    rows.map((r) => r.sceneId)
  );
  return rows
    .map((r) => decodeDuel(r, fieldMaps[r.sceneId] ?? {}))
    .filter((d): d is DuelScene => d !== null);
}

export async function fetchBrawls(graphqlClient: DubheGraphqlClient): Promise<BrawlScene[]> {
  const rows = await fetchSceneRows(graphqlClient, 'brawl');
  const fieldMaps = await fetchFieldMaps(
    graphqlClient,
    rows.map((r) => r.sceneId)
  );
  return rows
    .map((r) => decodeBrawl(r, fieldMaps[r.sceneId] ?? {}))
    .filter((b): b is BrawlScene => b !== null);
}

async function fetchSceneRowById(
  graphqlClient: DubheGraphqlClient,
  sceneId: string
): Promise<SceneRow | null> {
  const result = await graphqlClient.getSceneStorages({
    dappKey: DappKey,
    sceneId,
    first: 1
  });
  const node = result?.edges?.[0]?.node;
  if (!node || !node.authorizedPermitId) return null;
  return { sceneId, permitId: node.authorizedPermitId };
}

export async function fetchDuelById(
  graphqlClient: DubheGraphqlClient,
  sceneId: string
): Promise<DuelScene | null> {
  const row = await fetchSceneRowById(graphqlClient, sceneId);
  if (!row) return null;
  const fieldMaps = await fetchFieldMaps(graphqlClient, [sceneId]);
  return decodeDuel(row, fieldMaps[sceneId] ?? {});
}

export async function fetchBrawlById(
  graphqlClient: DubheGraphqlClient,
  sceneId: string
): Promise<BrawlScene | null> {
  const row = await fetchSceneRowById(graphqlClient, sceneId);
  if (!row) return null;
  const fieldMaps = await fetchFieldMaps(graphqlClient, [sceneId]);
  return decodeBrawl(row, fieldMaps[sceneId] ?? {});
}

/** Look up which scene type a scene id belongs to ('duel' | 'brawl' | null). */
export async function fetchSceneType(
  graphqlClient: DubheGraphqlClient,
  sceneId: string
): Promise<string | null> {
  const result = await graphqlClient.getSceneStorages({
    dappKey: DappKey,
    sceneId,
    first: 1
  });
  return result?.edges?.[0]?.node?.sceneType ?? null;
}

/** Find the shared Arena ObjectStorage id (entity "main", created by deploy_hook). */
export async function fetchArenaObjectId(
  graphqlClient: DubheGraphqlClient
): Promise<string | null> {
  const result = await graphqlClient.getObjectStorages({
    dappKey: DappKey,
    objectType: 'arena',
    isDestroyed: false,
    first: 1
  });
  return result?.edges?.[0]?.node?.objectId ?? null;
}
