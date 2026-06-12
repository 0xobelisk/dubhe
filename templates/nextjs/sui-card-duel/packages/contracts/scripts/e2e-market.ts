/**
 * e2e-market.ts — End-to-end marketplace flow on localnet (listable codegen).
 *
 * Usage:
 *   cd templates/nextjs/sui-card-duel/packages/contracts
 *   pnpm tsx scripts/e2e-market.ts
 *
 * Flow: onboarding x2 -> list_card (auto deck removal) -> buy_card with SUI
 *       -> list_gold -> buy_gold -> verify via getMarketplaceListings.
 */

import {
  Dubhe,
  Transaction,
  getFullnodeUrl,
  Ed25519Keypair,
  loadMetadata
} from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '../../client/node_modules/@0xobelisk/graphql-client';
import { PackageId, DappHubId, DappStorageId, FrameworkPackageId } from './config.ts';

const NETWORK = 'localnet' as const;
const GRAPHQL = 'http://127.0.0.1:4000/graphql';
const CARD_PRICE = 1_000_000n; // 0.001 SUI in MIST
const GOLD_AMOUNT = 100n;
const GOLD_PRICE = 2_000_000n;

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
  if ((result as any).effects?.status?.status !== 'success') {
    throw new Error(`${label} failed: ${JSON.stringify((result as any).effects?.status)}`);
  }
  await dubhe.waitForTransaction(result.digest);
  console.log(`  ✓ ${label}`);
  return result as any;
}

async function onboard(metadata: any): Promise<{ dubhe: Dubhe; us: string; addr: string }> {
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
  const addr = dubhe.getAddress();
  await dubhe.requestFaucet(addr, NETWORK);
  await new Promise((r) => setTimeout(r, 2000));
  const result = await send(dubhe, `init_user_storage (${addr.slice(0, 8)})`, (tx) => {
    tx.moveCall({
      target: `${PackageId}::user_storage_init::init_user_storage`,
      arguments: [tx.object(DappHubId), tx.object(DappStorageId)]
    });
  });
  const us = (result.objectChanges ?? []).find(
    (c: any) => c.type === 'created' && c.objectType?.endsWith('::dapp_service::UserStorage')
  )?.objectId;
  await send(dubhe, 'register', (tx) => {
    tx.moveCall({
      target: `${PackageId}::player_system::register`,
      arguments: [tx.object(DappStorageId), tx.object(us)]
    });
  });
  return { dubhe, us, addr };
}

async function main() {
  const metadata = await loadMetadata(NETWORK, PackageId);
  console.log('[1] Onboarding seller + buyer');
  const seller = await onboard(metadata);
  const buyer = await onboard(metadata);

  // Card to sell: read the seller's deck from the indexer (5 starter cards).
  let cardId = '';
  for (let i = 0; i < 30 && !cardId; i++) {
    const data = await gql(`{ decks { nodes { entityId cardIds } } }`);
    const row = data.decks.nodes.find((n: any) => n.entityId === seller.addr);
    let ids = row?.cardIds;
    if (typeof ids === 'string') ids = JSON.parse(ids);
    if (Array.isArray(ids) && ids.length === 5) cardId = String(ids[0]);
    else await new Promise((r) => setTimeout(r, 2000));
  }
  if (!cardId) throw new Error('seller deck not indexed');

  // ── 2. List a card + some gold ────────────────────────────────────────────
  console.log('\n[2] Listing');
  await send(seller.dubhe, 'list_card (price 0.001 SUI)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::market_system::list_card`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(seller.us),
        tx.pure.address(cardId),
        tx.pure.u64(CARD_PRICE)
      ]
    });
  });
  await send(seller.dubhe, 'list_gold (100 gold, 0.002 SUI)', (tx) => {
    tx.moveCall({
      target: `${PackageId}::market_system::list_gold`,
      arguments: [
        tx.object(DappStorageId),
        tx.object(seller.us),
        tx.pure.u64(GOLD_AMOUNT),
        tx.pure.u64(GOLD_PRICE)
      ]
    });
  });

  // ── 3. Discover listings the same way the market page does ───────────────
  console.log('\n[3] getMarketplaceListings (client data path)');
  const graphqlClient = createDubheGraphqlClient({ endpoint: GRAPHQL });
  let cardListing: any = null;
  let goldListing: any = null;
  for (let i = 0; i < 30; i++) {
    const result = await graphqlClient.getMarketplaceListings({ status: 'listed' });
    const nodes = (result?.edges ?? []).map((e: any) => e.node);
    cardListing = nodes.find((n: any) => n.recordType === 'card' && n.seller === seller.addr);
    goldListing = nodes.find((n: any) => n.recordType === 'gold' && n.seller === seller.addr);
    if (cardListing && goldListing) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!cardListing || !goldListing) throw new Error('listings not indexed');
  console.log(
    `  card listing: id=${cardListing.listingId.slice(0, 10)}… price=${cardListing.price} dataRaw=${
      cardListing.recordDataRaw
    }`
  );
  console.log(
    `  gold listing: id=${goldListing.listingId.slice(0, 10)}… price=${goldListing.price} dataRaw=${
      goldListing.recordDataRaw
    }`
  );

  // ── 4. Buyer purchases both ───────────────────────────────────────────────
  console.log('\n[4] Buying');
  await send(buyer.dubhe, 'buy_card', (tx) => {
    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(cardListing.price))]);
    tx.moveCall({
      target: `${PackageId}::market_system::buy_card`,
      arguments: [
        tx.object(DappHubId),
        tx.object(DappStorageId),
        tx.object(cardListing.listingId),
        tx.object(buyer.us),
        payment
      ]
    });
  });
  await send(buyer.dubhe, 'buy_gold', (tx) => {
    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(goldListing.price))]);
    tx.moveCall({
      target: `${PackageId}::market_system::buy_gold`,
      arguments: [
        tx.object(DappHubId),
        tx.object(DappStorageId),
        tx.object(goldListing.listingId),
        tx.object(buyer.us),
        payment
      ]
    });
  });

  // ── 5. Verify: buyer owns 6 cards and 600 gold; listings closed ──────────
  console.log('\n[5] Verify');
  let ok = false;
  for (let i = 0; i < 30; i++) {
    const data = await gql(
      `{ cards { nodes { entityId cardId isDeleted } } golds { nodes { entityId amount } } }`
    );
    const buyerCards = data.cards.nodes.filter(
      (n: any) => n.entityId === buyer.addr && !n.isDeleted
    );
    const buyerGold = BigInt(
      data.golds.nodes.find((n: any) => n.entityId === buyer.addr)?.amount ?? 0
    );
    const ownsBought = buyerCards.some((n: any) => n.cardId === cardId);
    if (buyerCards.length === 6 && ownsBought && buyerGold === 600n) {
      console.log(`  buyer cards=${buyerCards.length} gold=${buyerGold} (bought card present)`);
      ok = true;
      break;
    }
    if (i === 29)
      console.log(`  LAST: cards=${buyerCards.length} gold=${buyerGold} owns=${ownsBought}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!ok) throw new Error('buyer state did not converge');

  const after = await graphqlClient.getMarketplaceListings({ status: 'listed' });
  const still = (after?.edges ?? [])
    .map((e: any) => e.node)
    .filter((n: any) => n.seller === seller.addr);
  if (still.length !== 0) throw new Error('listings should be closed after purchase');
  console.log('  listings closed: ok');

  console.log('\n✅ E2E market flow passed!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
