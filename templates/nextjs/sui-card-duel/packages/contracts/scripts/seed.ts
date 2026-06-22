/**
 * seed.ts — Populate initial on-chain state after deployment.
 *
 * Usage:
 *   cd templates/nextjs/sui-card-duel/packages/contracts
 *   pnpm tsx scripts/seed.ts localnet
 *   pnpm tsx scripts/seed.ts testnet
 *
 * The deploy_hook.move already initialises game_config and creates the arena
 * object during the publish transaction.  This script is for one-off admin
 * actions:
 *   1. Override the game config (pack price, rake, HP, turn timeout).
 *   2. Verify the DappStorage fields.
 */

import * as dotenv from 'dotenv';
import {
  Dubhe,
  Transaction,
  getFullnodeUrl,
  NetworkType,
  loadMetadata
} from '@0xobelisk/sui-client';
import { Network, PackageId, DappHubId, DappStorageId, FrameworkPackageId } from './config.ts';

dotenv.config();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const networkArg = (process.argv[2] ?? Network) as NetworkType;
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY env var not set. Run: pnpm account:gen and set in .env');
  }

  if (!PackageId || PackageId === '0x0') {
    throw new Error('PackageId is 0x0 — deploy the contract first with: pnpm deploy ' + networkArg);
  }

  const metadata = await loadMetadata(networkArg, PackageId);
  const dubhe = new Dubhe({
    networkType: networkArg,
    packageId: PackageId,
    metadata,
    secretKey: privateKey,
    suiRpcUrl: getFullnodeUrl(networkArg),
    dappHubId: DappHubId,
    dappStorageId: DappStorageId,
    frameworkPackageId: FrameworkPackageId
  });

  const adminAddress = dubhe.getAddress();
  console.log(`Admin address: ${adminAddress}`);
  console.log(`Network:       ${networkArg}`);
  console.log(`Package ID:    ${PackageId}`);
  console.log('');

  // ── 1. (Re)apply the game config ──────────────────────────────────────────
  console.log('Setting game config...');
  const tx1 = new Transaction();
  await dubhe.tx.arena_system.set_game_config({
    tx: tx1,
    params: [
      tx1.object(DappStorageId),
      tx1.pure.u64(100), // pack_price (gold)
      tx1.pure.u64(500), // starting_gold
      tx1.pure.u64(300), // rake_bps (3%)
      tx1.pure.u64(30), // max_hp
      tx1.pure.u64(5 * 60 * 1000) // turn_timeout_ms (5 minutes)
    ]
  });
  const result1 = await dubhe.signAndSendTxn({ tx: tx1 });
  console.log(`Game config set! Digest: ${result1.digest}`);

  // ── 2. Verify DApp storage fields ─────────────────────────────────────────
  if (DappStorageId) {
    console.log('\nDappStorage fields:');
    const storageFields = await dubhe.getDappStorageFields(DappStorageId);
    console.log(
      JSON.stringify(storageFields, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
    );
  }

  console.log('\nSeed complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
