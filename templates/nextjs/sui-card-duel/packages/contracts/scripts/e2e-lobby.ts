/**
 * e2e-lobby.ts — Verify the client-side scene discovery code paths against a
 * live indexer, using the same DubheGraphqlClient + lib/scenes.ts the Next.js
 * lobby uses. Creates one pending duel invite and one open brawl room first,
 * and leaves them on-chain so the lobby UI has data to render.
 *
 * Usage:
 *   cd templates/nextjs/sui-card-duel/packages/contracts
 *   pnpm tsx scripts/e2e-lobby.ts
 */

import {
  Dubhe,
  Transaction,
  getFullnodeUrl,
  Ed25519Keypair,
  loadMetadata
} from '@0xobelisk/sui-client';
// Resolved from the client package, which owns the graphql-client dependency.
import { createDubheGraphqlClient } from '../../client/node_modules/@0xobelisk/graphql-client';
import {
  fetchDuels,
  fetchBrawls,
  fetchDuelById,
  fetchBrawlById,
  fetchSceneType,
  fetchArenaObjectId
} from '../../client/src/app/lib/scenes';
import { PackageId, DappHubId, DappStorageId, FrameworkPackageId } from './config.ts';

const NETWORK = 'localnet' as const;
const CLOCK = '0x6';

async function send(dubhe: Dubhe, label: string, build: (tx: Transaction) => void) {
  const tx = new Transaction();
  build(tx);
  const result = await dubhe.signAndSendTxn({ tx });
  if ((result as any).effects?.status?.status !== 'success') {
    throw new Error(`${label} failed: ${JSON.stringify((result as any).effects?.status)}`);
  }
  await dubhe.waitForTransaction(result.digest);
  console.log(`  ✓ ${label}`);
  return result as any;
}

async function onboard(metadata: any): Promise<{ dubhe: Dubhe; us: string }> {
  const dubhe = new Dubhe({
    networkType: NETWORK,
    packageId: PackageId,
    metadata,
    secretKey: new Ed25519Keypair().getSecretKey(),
    suiRpcUrl: getFullnodeUrl(NETWORK),
    dappHubId: DappHubId,
    dappStorageId: DappStorageId,
    frameworkPackageId: FrameworkPackageId
  });
  await dubhe.requestFaucet(dubhe.getAddress(), NETWORK);
  await new Promise((r) => setTimeout(r, 2000));
  const result = await send(
    dubhe,
    `init_user_storage (${dubhe.getAddress().slice(0, 8)})`,
    (tx) => {
      tx.moveCall({
        target: `${PackageId}::user_storage_init::init_user_storage`,
        arguments: [tx.object(DappHubId), tx.object(DappStorageId)]
      });
    }
  );
  const us = (result.objectChanges ?? []).find(
    (c: any) => c.type === 'created' && c.objectType?.endsWith('::dapp_service::UserStorage')
  )?.objectId;
  await send(dubhe, 'register', (tx) => {
    tx.moveCall({
      target: `${PackageId}::player_system::register`,
      arguments: [tx.object(DappStorageId), tx.object(us)]
    });
  });
  return { dubhe, us };
}

async function main() {
  const metadata = await loadMetadata(NETWORK, PackageId);

  // ── 1. Seed lobby data: a pending duel invite + an open brawl room ───────
  console.log('[1] Seeding lobby data');
  const host = await onboard(metadata);
  const rival = await onboard(metadata);

  await send(host.dubhe, 'create_duel (pending invite, stake 25)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::create_duel`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(host.us),
        tx.pure.address(rival.dubhe.getAddress()),
        tx.pure.u64(25n),
        tx.object(CLOCK)
      ]
    });
  });
  await send(rival.dubhe, 'create_brawl (open room, fee 10, max 4)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::create_brawl`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(rival.us),
        tx.pure.u64(10n),
        tx.pure.u64(4n),
        tx.object(CLOCK)
      ]
    });
  });

  console.log('  waiting 8s for the indexer...');
  await new Promise((r) => setTimeout(r, 8000));

  // ── 2. Exercise the exact client lib against the live endpoint ───────────
  console.log('\n[2] Client lib (lib/scenes.ts) against live GraphQL');
  const graphqlClient = createDubheGraphqlClient({
    endpoint: 'http://127.0.0.1:4000/graphql',
    subscriptionEndpoint: 'ws://127.0.0.1:4000/graphql'
  });

  const duels = await fetchDuels(graphqlClient);
  console.log(`  fetchDuels: ${duels.length} active duel(s)`);
  const myDuel = duels.find((d) => d.challenger === host.dubhe.getAddress());
  if (!myDuel) throw new Error('pending duel not returned by fetchDuels');
  console.log(
    `    challenger=${myDuel.challenger.slice(0, 8)} opponent=${myDuel.opponent.slice(
      0,
      8
    )} stake=${myDuel.stake} state=${myDuel.state} gold=${myDuel.gold}`
  );
  if (myDuel.stake !== 25n || myDuel.state !== 0 || myDuel.gold !== 25n) {
    throw new Error(`duel decoded incorrectly: ${JSON.stringify(myDuel, (_, v) => String(v))}`);
  }

  const brawls = await fetchBrawls(graphqlClient);
  console.log(`  fetchBrawls: ${brawls.length} open room(s)`);
  const myBrawl = brawls.find((b) => b.host === rival.dubhe.getAddress());
  if (!myBrawl) throw new Error('open brawl not returned by fetchBrawls');
  console.log(
    `    host=${myBrawl.host.slice(0, 8)} fee=${myBrawl.entryFee} max=${
      myBrawl.maxPlayers
    } players=${myBrawl.players.length} state=${myBrawl.state}`
  );
  if (myBrawl.entryFee !== 10n || myBrawl.maxPlayers !== 4 || myBrawl.players.length !== 1) {
    throw new Error(`brawl decoded incorrectly`);
  }

  const duelById = await fetchDuelById(graphqlClient, myDuel.sceneId);
  if (!duelById || duelById.permitId !== myDuel.permitId) throw new Error('fetchDuelById failed');
  console.log(`  fetchDuelById: ok (permit ${duelById.permitId.slice(0, 10)}…)`);

  const brawlById = await fetchBrawlById(graphqlClient, myBrawl.sceneId);
  if (!brawlById || brawlById.permitId !== myBrawl.permitId)
    throw new Error('fetchBrawlById failed');
  console.log(`  fetchBrawlById: ok (permit ${brawlById.permitId.slice(0, 10)}…)`);

  const kind = await fetchSceneType(graphqlClient, myDuel.sceneId);
  if (kind !== 'duel') throw new Error(`fetchSceneType expected 'duel', got ${kind}`);
  console.log(`  fetchSceneType: ok ('duel')`);

  const arenaId = await fetchArenaObjectId(graphqlClient);
  if (!arenaId) throw new Error('fetchArenaObjectId failed');
  console.log(`  fetchArenaObjectId: ok (${arenaId.slice(0, 10)}…)`);

  console.log(
    '\n✅ Lobby data paths verified! (duel invite + brawl room left on-chain for the UI)'
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
