/**
 * seed.ts — Populate initial on-chain state after deployment.
 *
 * Usage:
 *   cd templates/nextjs/sui-farm/packages/contracts
 *   pnpm tsx scripts/seed.ts localnet
 *   pnpm tsx scripts/seed.ts testnet
 *
 * The deploy_hook.move already initialises shop_config, season_config, and the
 * world permit during the publish transaction.  This script is for one-off
 * admin actions:
 *   1. Kick off the first season.
 *   2. Override shop prices for testing purposes.
 */

import * as dotenv from 'dotenv';
import { Dubhe, Transaction, getFullnodeUrl, NetworkType } from '@0xobelisk/sui-client';
import { loadMetadata } from '@0xobelisk/sui-common';
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

  // ── 1. Start Season 1 ─────────────────────────────────────────────────────
  const seasonDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const endMs = Date.now() + seasonDurationMs;

  console.log('Starting Season 1...');
  const tx1 = new Transaction();
  await dubhe.tx.season_system.start_season({
    tx: tx1,
    params: [
      tx1.pure.u8(1), // season_id = 1
      tx1.pure.u64(endMs), // end_ms
      tx1.pure.u8(1) // bonus_crop = Wheat (type 1)
    ]
  });
  const result1 = await dubhe.signAndSendTxn(tx1);
  console.log(`Season 1 started! Digest: ${result1.digest}`);

  // ── 2. Verify DApp storage fields ─────────────────────────────────────────
  if (DappStorageId) {
    console.log('\nDappStorage fields:');
    const storageFields = await dubhe.getDappStorageFields(DappStorageId);
    console.log(JSON.stringify(storageFields, null, 2));
  }

  console.log('\nSeed complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
