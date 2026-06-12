/**
 * e2e-session.ts — Session-key delegated duel flow on localnet.
 *
 * Usage:
 *   cd templates/nextjs/sui-card-duel/packages/contracts
 *   pnpm tsx scripts/e2e-session.ts
 *
 * Player B never signs game actions with the main wallet: a session key is
 * activated once, then accept_duel / attack / finish_duel / cleanup are all
 * signed by the session key while every on-chain identity (permit
 * participant, scene fields, profile, gold) resolves to B's canonical owner
 * (the main wallet). Finally the session is deactivated and a further
 * session-signed action is expected to fail.
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
const SESSION_DURATION_MS = 60n * 60n * 1000n; // 1 hour

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

/** Expect the transaction to fail (abort or rejection). */
async function mustFail(dubhe: Dubhe, label: string, build: (tx: Transaction) => void) {
  try {
    const tx = new Transaction();
    build(tx);
    const result = await dubhe.signAndSendTxn({ tx });
    const status = (result as any).effects?.status?.status;
    if (status === 'success') {
      throw new Error(`${label}: expected failure but transaction succeeded`);
    }
    console.log(`  ✓ ${label} rejected on-chain as expected`);
  } catch (err: any) {
    if (String(err.message ?? err).includes('expected failure')) throw err;
    console.log(`  ✓ ${label} rejected as expected (${String(err.message ?? err).slice(0, 80)}…)`);
  }
}

async function main() {
  const metadata = await loadMetadata(NETWORK, PackageId);

  const keyA = new Ed25519Keypair();
  const keyB = new Ed25519Keypair();
  const keyS = new Ed25519Keypair(); // B's session key
  const A = newDubhe(metadata, keyA.getSecretKey());
  const B = newDubhe(metadata, keyB.getSecretKey());
  const S = newDubhe(metadata, keyS.getSecretKey());
  const addrA = A.getAddress();
  const addrB = B.getAddress();
  const addrS = S.getAddress();
  console.log(`Player A (main): ${addrA}`);
  console.log(`Player B (main): ${addrB}`);
  console.log(`B session key:   ${addrS}`);

  // ── 1. Fund all three wallets (session key needs gas of its own) ──────────
  console.log('\n[1] Faucet');
  await A.requestFaucet(addrA, NETWORK);
  await B.requestFaucet(addrB, NETWORK);
  await S.requestFaucet(addrS, NETWORK);
  await new Promise((r) => setTimeout(r, 2000));

  // ── 2. Onboarding with the main wallets ──────────────────────────────────
  console.log('\n[2] Onboarding (main wallets)');
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
    await send(dubhe, `register (${who})`, (tx) => {
      tx.moveCall({
        target: `${PackageId}::player_system::register`,
        arguments: [tx.object(DappStorageId), tx.object(usId)]
      });
    });
  }
  const usA = userStorageIds['A'];
  const usB = userStorageIds['B'];

  // ── 3. B activates a session key (the only main-wallet signature left) ───
  console.log('\n[3] activate_session (B main wallet delegates to session key)');
  await send(B, 'activate_session (B → S)', (tx) => {
    tx.moveCall({
      target: `${FrameworkPackageId}::dapp_system::activate_session`,
      typeArguments: [`${PackageId}::dapp_key::DappKey`],
      arguments: [
        tx.object(DappHubId),
        tx.object(usB),
        tx.pure.address(addrS),
        tx.pure.u64(SESSION_DURATION_MS),
        tx.object(CLOCK)
      ]
    });
  });

  // ── 4. Starter decks via the indexer ─────────────────────────────────────
  console.log('\n[4] Starter decks (via indexer)');
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

  // ── 5. A challenges B (main wallet) ──────────────────────────────────────
  console.log('\n[5] create_duel (A main wallet)');
  const createResult = await send(A, `create_duel (A → B, stake ${STAKE})`, (tx) => {
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

  // ── 6. B's session key plays the whole match ─────────────────────────────
  // accept_duel must register B's canonical owner (main wallet), not the
  // session address, so the duel below sees addrB as the opponent.
  console.log('\n[6] Session-signed match (B never touches the main wallet)');
  await send(S, 'accept_duel (B via session key)', (tx) => {
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

  // Challenger (A) moves first; B's turns are all session-signed reactive
  // writes against A's UserStorage.
  await attack(A, usA, usB, deckA[0], 'A strikes (12 dmg, B: 30→18)');
  await attack(S, usB, usA, deckB[0], 'B strikes via session (12 dmg, A: 30→18)');
  await attack(A, usA, usB, deckA[1], 'A strikes (12 dmg, B: 18→6)');
  await attack(S, usB, usA, deckB[3], 'B fireballs via session (18 dmg, A: 18→0 KO)');

  // ── 7. Session-signed settlement: pot must go to B's canonical owner ─────
  console.log('\n[7] Settlement (session-signed)');
  const arenaData = await gql(`{ dubheObjectStorages { nodes { objectId objectType } } }`);
  const arenaId = arenaData.dubheObjectStorages.nodes.find((n: any) =>
    n.objectType?.toLowerCase().includes('arena')
  )?.objectId;
  if (!arenaId) throw new Error('arena object not found via GraphQL');

  await send(S, 'finish_duel (B via session, pot → canonical owner)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::finish_duel`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usB),
        tx.object(permitId),
        tx.object(sceneId),
        tx.object(arenaId)
      ]
    });
  });
  await send(A, 'leave_duel (A main wallet)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::leave_duel`,
      arguments: [tx.object(permitId), tx.object(sceneId), tx.object(usA)]
    });
  });
  await send(S, 'cleanup_duel (session-signed)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::cleanup_duel`,
      arguments: [tx.object(sceneId), tx.object(permitId)]
    });
  });

  // ── 8. Verify all identity resolves to the main wallets ──────────────────
  console.log('\n[8] Verify identities via the indexer');
  let goldA = 0n;
  let goldB = 0n;
  let profA: any = {};
  let profB: any = {};
  let sessionRows = 0;
  for (let i = 0; i < 30; i++) {
    const data = await gql(
      `{ golds { nodes { entityId amount } } profiles { nodes { entityId wins losses rating } } }`
    );
    goldA = BigInt(data.golds.nodes.find((n: any) => n.entityId === addrA)?.amount ?? 0);
    goldB = BigInt(data.golds.nodes.find((n: any) => n.entityId === addrB)?.amount ?? 0);
    profA = data.profiles.nodes.find((n: any) => n.entityId === addrA) ?? {};
    profB = data.profiles.nodes.find((n: any) => n.entityId === addrB) ?? {};
    sessionRows =
      data.golds.nodes.filter((n: any) => n.entityId === addrS).length +
      data.profiles.nodes.filter((n: any) => n.entityId === addrS).length;
    if (goldB === 547n && Number(profB.wins) === 1) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`  A gold=${goldA} profile=${JSON.stringify(profA)}`);
  console.log(`  B gold=${goldB} profile=${JSON.stringify(profB)}`);

  // pot=100, rake=3, winner nets +47, loser -50
  if (goldB !== 547n) throw new Error(`B gold expected 547, got ${goldB}`);
  if (goldA !== 450n) throw new Error(`A gold expected 450, got ${goldA}`);
  if (Number(profB.wins) !== 1 || Number(profB.rating) !== 1225)
    throw new Error(`B profile wrong: ${JSON.stringify(profB)}`);
  if (Number(profA.losses) !== 1 || Number(profA.rating) !== 1175)
    throw new Error(`A profile wrong: ${JSON.stringify(profA)}`);
  if (sessionRows !== 0)
    throw new Error(`session address ${addrS} must own no game state, found ${sessionRows} rows`);

  // Permit participants must have been registered as main wallets only.
  const parts = await gql(
    `{ dubheScenePermitParticipants { nodes { permitId participant active } } }`
  );
  const duelParts = parts.dubheScenePermitParticipants.nodes.filter(
    (n: any) => n.permitId === permitId
  );
  console.log(`  Permit participants: ${JSON.stringify(duelParts)}`);
  if (duelParts.some((n: any) => n.participant === addrS))
    throw new Error('session address leaked into permit participants');
  if (!duelParts.some((n: any) => n.participant === addrB))
    throw new Error("B's canonical owner missing from permit participants");

  // ── 9. Deactivated sessions must lose write access ────────────────────────
  console.log('\n[9] deactivate_session + negative check');
  await send(B, 'deactivate_session (B main wallet)', (tx) => {
    tx.moveCall({
      target: `${FrameworkPackageId}::dapp_system::deactivate_session`,
      typeArguments: [`${PackageId}::dapp_key::DappKey`],
      arguments: [tx.object(DappHubId), tx.object(usB)]
    });
  });
  await mustFail(S, 'create_duel signed by revoked session', (tx) => {
    tx.moveCall({
      target: `${PackageId}::duel_system::create_duel`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(usB),
        tx.pure.address(addrA),
        tx.pure.u64(STAKE),
        tx.object(CLOCK)
      ]
    });
  });

  console.log('\n✅ E2E session flow passed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
