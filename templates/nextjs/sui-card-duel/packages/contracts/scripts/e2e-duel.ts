/**
 * e2e-duel.ts — End-to-end duel flow on localnet (two simulated players).
 *
 * Usage:
 *   cd templates/nextjs/sui-card-duel/packages/contracts
 *   pnpm tsx scripts/e2e-duel.ts
 *
 * Flow: faucet -> init_user_storage -> register -> create_duel -> accept_duel
 *       -> attack x3 (knockout) -> finish_duel (rake to arena) -> leave_duel
 *       -> cleanup_duel -> verify profiles / gold / indexer rows.
 */

import {
  Dubhe,
  Transaction,
  getFullnodeUrl,
  Ed25519Keypair,
  loadMetadata
} from '@0xobelisk/sui-client';
import { PackageId, DappHubId, DappStorageId, FrameworkPackageId } from './config.ts';

const NETWORK = 'localnet' as const;
const GRAPHQL = 'http://127.0.0.1:4000/graphql';
const CLOCK = '0x6';
const STAKE = 50n;

function newDubhe(metadata: any, secretKey: string) {
  return new Dubhe({
    networkType: NETWORK,
    packageId: PackageId,
    metadata,
    secretKey,
    suiRpcUrl: getFullnodeUrl(NETWORK),
    dappHubId: DappHubId,
    dappStorageId: DappStorageId,
    frameworkPackageId: FrameworkPackageId
  });
}

async function gql(query: string): Promise<any> {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function send(dubhe: Dubhe, label: string, build: (tx: Transaction) => void) {
  const tx = new Transaction();
  build(tx);
  const result = await dubhe.signAndSendTxn({ tx });
  const status = (result as any).effects?.status?.status;
  if (status !== 'success') {
    throw new Error(`${label} failed: ${JSON.stringify((result as any).effects?.status)}`);
  }
  await dubhe.waitForTransaction(result.digest);
  console.log(`  ✓ ${label}  (${result.digest})`);
  return result as any;
}

async function main() {
  const metadata = await loadMetadata(NETWORK, PackageId);

  const keyA = new Ed25519Keypair();
  const keyB = new Ed25519Keypair();
  const A = newDubhe(metadata, keyA.getSecretKey());
  const B = newDubhe(metadata, keyB.getSecretKey());
  const addrA = A.getAddress();
  const addrB = B.getAddress();
  console.log(`Player A: ${addrA}`);
  console.log(`Player B: ${addrB}`);

  // ── 1. Fund both players ──────────────────────────────────────────────────
  console.log('\n[1] Faucet');
  await A.requestFaucet(addrA, NETWORK);
  await B.requestFaucet(addrB, NETWORK);
  await new Promise((r) => setTimeout(r, 2000));

  // ── 2. UserStorage + register ─────────────────────────────────────────────
  console.log('\n[2] Onboarding');
  const userStorageIds: Record<string, string> = {};
  for (const [who, dubhe] of [
    ['A', A],
    ['B', B]
  ] as const) {
    const result = await send(dubhe, `init_user_storage (${who})`, (tx) => {
      tx.moveCall({
        target: `${PackageId}::user_storage_init::init_user_storage`,
        arguments: [tx.object(DappHubId), tx.object(DappStorageId)]
      });
    });
    const usId = (result.objectChanges ?? []).find(
      (c: any) => c.type === 'created' && c.objectType?.endsWith('::dapp_service::UserStorage')
    )?.objectId;
    if (!usId) throw new Error(`UserStorage not found in init tx for ${who}`);
    userStorageIds[who] = usId;
  }
  const usA = userStorageIds['A'];
  const usB = userStorageIds['B'];
  console.log(`  UserStorage A: ${usA}`);
  console.log(`  UserStorage B: ${usB}`);

  for (const [who, dubhe, us] of [
    ['A', A, usA],
    ['B', B, usB]
  ] as const) {
    await send(dubhe, `register (${who})`, (tx) => {
      tx.moveCall({
        target: `${PackageId}::player_system::register`,
        arguments: [tx.object(DappStorageId), tx.object(us)]
      });
    });
  }

  // ── 3. Read starter decks via the indexer (order: 3x Strike, Fireball, Shield)
  console.log('\n[3] Starter decks (via indexer)');
  const readDeck = async (addr: string): Promise<string[]> => {
    for (let i = 0; i < 30; i++) {
      const data = await gql(`{ decks { nodes { entityId cardIds } } }`);
      const row = data.decks.nodes.find((n: any) => n.entityId === addr);
      const ids = row?.cardIds;
      if (Array.isArray(ids) && ids.length === 5) return ids.map(String);
      if (typeof ids === 'string') {
        const parsed = JSON.parse(ids);
        if (Array.isArray(parsed) && parsed.length === 5) return parsed.map(String);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`deck for ${addr} not indexed in time`);
  };
  const deckA = await readDeck(addrA);
  const deckB = await readDeck(addrB);
  console.log(`  Deck A: ${deckA.length} cards`);
  console.log(`  Deck B: ${deckB.length} cards`);

  // ── 4. A challenges B ─────────────────────────────────────────────────────
  console.log('\n[4] create_duel');
  const createResult = await send(A, 'create_duel (A → B, stake 50)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::create_duel`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usA),
        tx.pure.address(addrB),
        tx.pure.u64(STAKE),
        tx.object(CLOCK)
      ]
    });
  });
  const created = (createResult.objectChanges ?? []).filter((c: any) => c.type === 'created');
  const sceneId = created.find((c: any) => c.objectType?.includes('SceneStorage<'))?.objectId;
  const permitId = created.find((c: any) => c.objectType?.includes('ScenePermit<'))?.objectId;
  if (!sceneId || !permitId) throw new Error('scene/permit not found in object changes');
  console.log(`  Scene:  ${sceneId}`);
  console.log(`  Permit: ${permitId}`);

  // ── 5. B accepts ──────────────────────────────────────────────────────────
  console.log('\n[5] accept_duel');
  await send(B, 'accept_duel (B)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::accept_duel`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usB),
        tx.object(permitId),
        tx.object(sceneId),
        tx.object(CLOCK)
      ]
    });
  });

  // ── 6. Combat: A strike(12) → B strike(12) → A fireball(18) = KO ─────────
  console.log('\n[6] Combat');
  const attack = (dubhe: Dubhe, mine: string, theirs: string, cardId: string, label: string) =>
    send(dubhe, label, (tx) => {
      tx.moveCall({
        target: `${PackageId}::duel_system::attack`,
        arguments: [
          tx.object(DappStorageId),
          tx.object(mine),
          tx.object(theirs),
          tx.object(permitId),
          tx.object(sceneId),
          tx.pure.address(cardId),
          tx.object(CLOCK)
        ]
      });
    });
  await attack(A, usA, usB, deckA[0], 'A strikes (12 dmg, B: 30→18)');
  await attack(B, usB, usA, deckB[0], 'B strikes (12 dmg, A: 30→18)');
  await attack(A, usA, usB, deckA[3], 'A fireballs (18 dmg, B: 18→0 KO)');

  // ── 7. Settlement ─────────────────────────────────────────────────────────
  console.log('\n[7] Settlement');
  const arenaData = await gql(`{ dubheObjectStorages { nodes { objectId objectType } } }`);
  const arenaId = arenaData.dubheObjectStorages.nodes.find((n: any) =>
    n.objectType?.toLowerCase().includes('arena')
  )?.objectId;
  if (!arenaId) throw new Error('arena object not found via GraphQL');
  console.log(`  Arena: ${arenaId}`);

  await send(A, 'finish_duel (A collects pot, 3% rake)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::finish_duel`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usA),
        tx.object(permitId),
        tx.object(sceneId),
        tx.object(arenaId)
      ]
    });
  });
  await send(B, 'leave_duel (B)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::leave_duel`,
      arguments: [tx.object(permitId), tx.object(sceneId), tx.object(usB)]
    });
  });
  await send(A, 'cleanup_duel (destroy scene + permit)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::cleanup_duel`,
      arguments: [tx.object(sceneId), tx.object(permitId)]
    });
  });

  // ── 8. Verify results via the indexer ─────────────────────────────────────
  console.log('\n[8] Verify (waiting for indexer)');
  let goldA = 0n;
  let goldB = 0n;
  let profA: any = {};
  let profB: any = {};
  for (let i = 0; i < 30; i++) {
    const data = await gql(
      `{ golds { nodes { entityId amount } } profiles { nodes { entityId wins losses rating } } }`
    );
    goldA = BigInt(data.golds.nodes.find((n: any) => n.entityId === addrA)?.amount ?? 0);
    goldB = BigInt(data.golds.nodes.find((n: any) => n.entityId === addrB)?.amount ?? 0);
    profA = data.profiles.nodes.find((n: any) => n.entityId === addrA) ?? {};
    profB = data.profiles.nodes.find((n: any) => n.entityId === addrB) ?? {};
    if (goldA === 547n && Number(profA.wins) === 1) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`  A gold=${goldA} profile=${JSON.stringify(profA)}`);
  console.log(`  B gold=${goldB} profile=${JSON.stringify(profB)}`);

  // pot=100, rake=3, winner nets +47, loser -50
  if (goldA !== 547n) throw new Error(`A gold expected 547, got ${goldA}`);
  if (goldB !== 450n) throw new Error(`B gold expected 450, got ${goldB}`);
  if (Number(profA.wins) !== 1 || Number(profA.rating) !== 1225)
    throw new Error(`A profile wrong: ${JSON.stringify(profA)}`);
  if (Number(profB.losses) !== 1 || Number(profB.rating) !== 1175)
    throw new Error(`B profile wrong: ${JSON.stringify(profB)}`);

  // ── 9. Verify scene lifecycle in the indexer ──────────────────────────────
  console.log('\n[9] Scene row');
  const idx = await gql(`{ dubheSceneStorages { nodes { sceneId sceneType isDestroyed } } }`);
  const sceneRow = idx.dubheSceneStorages.nodes.find((n: any) => n.sceneId === sceneId);
  console.log(`  Scene row: ${JSON.stringify(sceneRow)}`);
  if (!sceneRow) throw new Error('scene not indexed');
  if (!sceneRow.isDestroyed) throw new Error('scene should be marked destroyed after cleanup');

  console.log('\n✅ E2E duel flow passed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
