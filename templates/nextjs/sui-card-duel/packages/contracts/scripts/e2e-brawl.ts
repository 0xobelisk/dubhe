/**
 * e2e-brawl.ts — End-to-end brawl flow on localnet (open-invite room).
 *
 * Usage:
 *   cd templates/nextjs/sui-card-duel/packages/contracts
 *   pnpm tsx scripts/e2e-brawl.ts
 *
 * Flow: onboarding x2 -> create_brawl -> join_brawl -> start_brawl
 *       -> brawl_attack until elimination -> finish_brawl -> cleanup_brawl
 *       -> open_pack (Random) -> verify balances via indexer.
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
const RANDOM = '0x8';
const ENTRY_FEE = 30n;

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

  const A = newDubhe(metadata, new Ed25519Keypair().getSecretKey());
  const B = newDubhe(metadata, new Ed25519Keypair().getSecretKey());
  const addrA = A.getAddress();
  const addrB = B.getAddress();
  console.log(`Host A:   ${addrA}`);
  console.log(`Joiner B: ${addrB}`);

  // ── 1. Onboarding ─────────────────────────────────────────────────────────
  console.log('\n[1] Onboarding');
  await A.requestFaucet(addrA, NETWORK);
  await B.requestFaucet(addrB, NETWORK);
  await new Promise((r) => setTimeout(r, 2000));

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
    if (!usId) throw new Error(`UserStorage not found for ${who}`);
    userStorageIds[who] = usId;
    await send(dubhe, `register (${who})`, (tx) => {
      tx.moveCall({
        target: `${PackageId}::player_system::register`,
        arguments: [tx.object(DappStorageId), tx.object(usId)]
      });
    });
  }
  const usA = userStorageIds['A'];
  const usB = userStorageIds['B'];

  const readDeck = async (addr: string): Promise<string[]> => {
    for (let i = 0; i < 30; i++) {
      const data = await gql(`{ decks { nodes { entityId cardIds } } }`);
      const row = data.decks.nodes.find((n: any) => n.entityId === addr);
      let ids = row?.cardIds;
      if (typeof ids === 'string') ids = JSON.parse(ids);
      if (Array.isArray(ids) && ids.length === 5) return ids.map(String);
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`deck for ${addr} not indexed in time`);
  };
  const deckA = await readDeck(addrA);
  const deckB = await readDeck(addrB);
  // Deck order: Strike, Strike, Strike, Fireball(18), Shield
  const fireballA = deckA[3];
  const fireballB = deckB[3];

  // ── 2. Open the room (open-invite permit) ────────────────────────────────
  console.log('\n[2] create_brawl');
  const createResult = await send(A, 'create_brawl (fee 30, max 4)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::create_brawl`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usA),
        tx.pure.u64(ENTRY_FEE),
        tx.pure.u64(4n),
        tx.object(CLOCK)
      ]
    });
  });
  const created = (createResult.objectChanges ?? []).filter((c: any) => c.type === 'created');
  const sceneId = created.find((c: any) => c.objectType?.includes('SceneStorage<'))?.objectId;
  const permitId = created.find((c: any) => c.objectType?.includes('ScenePermit<'))?.objectId;
  if (!sceneId || !permitId) throw new Error('scene/permit not found');
  console.log(`  Scene:  ${sceneId}`);
  console.log(`  Permit: ${permitId}`);

  // ── 3. B joins through the open permit, host starts ──────────────────────
  console.log('\n[3] join + start');
  await send(B, 'join_brawl (B pays 30)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::join_brawl`,
      arguments: [tx.object(DappStorageId), tx.object(usB), tx.object(permitId), tx.object(sceneId)]
    });
  });
  await send(A, 'start_brawl', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::start_brawl`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usA),
        tx.object(permitId),
        tx.object(sceneId),
        tx.object(CLOCK)
      ]
    });
  });

  // ── 4. Combat (cards are reusable in brawls) ─────────────────────────────
  console.log('\n[4] Combat');
  const attack = (dubhe: Dubhe, mine: string, theirs: string, cardId: string, label: string) =>
    send(dubhe, label, (tx) => {
      tx.moveCall({
        target: `${PackageId}::brawl_system::brawl_attack`,
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
  await attack(A, usA, usB, fireballA, 'A fireballs B (30→12)');
  await attack(B, usB, usA, fireballB, 'B fireballs A (30→12)');
  await attack(A, usA, usB, fireballA, 'A fireballs B (12→0, eliminated — A wins)');

  // ── 5. Settlement ─────────────────────────────────────────────────────────
  console.log('\n[5] Settlement');
  const arenaData = await gql(`{ dubheObjectStorages { nodes { objectId objectType } } }`);
  const arenaId = arenaData.dubheObjectStorages.nodes.find((n: any) =>
    n.objectType?.toLowerCase().includes('arena')
  )?.objectId;
  if (!arenaId) throw new Error('arena not found');

  await send(A, 'finish_brawl (A collects pot 60 - rake 1)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::finish_brawl`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usA),
        tx.object(permitId),
        tx.object(sceneId),
        tx.object(arenaId)
      ]
    });
  });
  await send(B, 'leave_finished_brawl (B)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::leave_finished_brawl`,
      arguments: [tx.object(permitId), tx.object(sceneId), tx.object(usB)]
    });
  });
  await send(A, 'cleanup_brawl (destroy scene + permit)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::brawl_system::cleanup_brawl`,
      arguments: [tx.object(sceneId), tx.object(permitId)]
    });
  });

  // ── 6. open_pack exercises sui::random on localnet ───────────────────────
  console.log('\n[6] open_pack (Random)');
  await send(A, 'open_pack (A pays 100 gold)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::card_system::open_pack`,
      arguments: [tx.object(DappStorageId), tx.object(usA), tx.object(RANDOM)]
    });
  });

  // ── 7. Verify via indexer ─────────────────────────────────────────────────
  // A: 500 - 30(fee) + 59(pot-rake) - 100(pack) = 429, 1 win, 6 cards
  // B: 500 - 30(fee) = 470, 1 loss, 5 cards
  console.log('\n[7] Verify');
  let ok = false;
  for (let i = 0; i < 30; i++) {
    const data = await gql(
      `{ golds { nodes { entityId amount } }
         profiles { nodes { entityId wins losses rating } }
         cards { nodes { entityId isDeleted } } }`
    );
    const goldA = BigInt(data.golds.nodes.find((n: any) => n.entityId === addrA)?.amount ?? 0);
    const goldB = BigInt(data.golds.nodes.find((n: any) => n.entityId === addrB)?.amount ?? 0);
    const profA = data.profiles.nodes.find((n: any) => n.entityId === addrA) ?? {};
    const profB = data.profiles.nodes.find((n: any) => n.entityId === addrB) ?? {};
    const cardsA = data.cards.nodes.filter((n: any) => n.entityId === addrA && !n.isDeleted).length;
    if (goldA === 429n && goldB === 470n && Number(profA.wins) === 1 && cardsA === 6) {
      console.log(`  A gold=${goldA} cards=${cardsA} profile=${JSON.stringify(profA)}`);
      console.log(`  B gold=${goldB} profile=${JSON.stringify(profB)}`);
      ok = true;
      break;
    }
    if (i === 29) {
      console.log(`  LAST STATE: A gold=${goldA} cards=${cardsA} B gold=${goldB}`);
      console.log(`  A profile=${JSON.stringify(profA)} B profile=${JSON.stringify(profB)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!ok) throw new Error('indexer state did not converge to expected values');

  const idx = await gql(`{ dubheSceneStorages { nodes { sceneId isDestroyed } } }`);
  const sceneRow = idx.dubheSceneStorages.nodes.find((n: any) => n.sceneId === sceneId);
  if (!sceneRow?.isDestroyed) throw new Error('brawl scene should be destroyed');
  console.log(`  Scene row: ${JSON.stringify(sceneRow)}`);

  console.log('\n✅ E2E brawl flow passed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
