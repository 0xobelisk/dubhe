/**
 * seed.ts — Populate initial on-chain state after deployment.
 *
 * Usage:
 *   cd templates/nextjs/sui-ville/packages/contracts
 *   pnpm tsx scripts/seed.ts localnet
 *   pnpm tsx scripts/seed.ts testnet
 *
 * deploy_hook.move already initialises town_config, election_state and the
 * world permit during the publish transaction. This script performs the
 * remaining one-off admin actions:
 *   1. Create the six town buildings (shared ObjectStorage<Building>).
 *   2. Configure each building's kind / name / wage / meal_price.
 *   3. Write the resulting ObjectIDs to buildings.json for clients & runners.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Dubhe, Transaction, getFullnodeUrl, NetworkType, loadMetadata } from '@0xobelisk/sui-client';
import { Network, PackageId, DappHubId, DappStorageId, FrameworkPackageId } from './config.ts';

dotenv.config();

// BuildingKind enum values (see dubhe.config.ts)
const BUILDINGS = [
  { entityId: 'town_hall', kind: 1, name: 'Town Hall', wage: 0, mealPrice: 0 },
  { entityId: 'farm', kind: 2, name: 'Sunny Farm', wage: 10, mealPrice: 0 },
  { entityId: 'cafe', kind: 3, name: 'Moon Cafe', wage: 12, mealPrice: 5 },
  { entityId: 'dock', kind: 4, name: 'Old Dock', wage: 14, mealPrice: 0 },
  { entityId: 'workshop', kind: 5, name: 'Tinker Workshop', wage: 16, mealPrice: 0 },
  { entityId: 'tavern', kind: 6, name: 'Salty Tavern', wage: 0, mealPrice: 8 }
] as const;

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

  console.log(`Admin address: ${dubhe.getAddress()}`);
  console.log(`Network:       ${networkArg}`);
  console.log(`Package ID:    ${PackageId}`);
  console.log('');

  if (!DappStorageId) {
    throw new Error('DappStorageId missing — run: pnpm config:store ' + networkArg);
  }

  const buildingIds: Record<string, string> = {};

  for (const b of BUILDINGS) {
    // 1. Create the shared building object.
    const createTx = new Transaction();
    await dubhe.tx.town_system.create_building({
      tx: createTx,
      params: [
        createTx.object(DappStorageId),
        createTx.pure.vector('u8', Array.from(Buffer.from(b.entityId)))
      ]
    });
    const createResult = await dubhe.signAndSendTxn({ tx: createTx });
    await dubhe.waitForTransaction(createResult.digest);

    const created = (createResult.objectChanges ?? []).find(
      (c: any) => c.type === 'created' && String(c.objectType ?? '').includes('::building::Building')
    ) as any;
    if (!created) {
      throw new Error(`Could not find created Building object for '${b.entityId}'`);
    }
    const buildingId = created.objectId as string;
    buildingIds[b.entityId] = buildingId;
    console.log(`Created ${b.entityId.padEnd(9)} → ${buildingId}`);

    // 2. Configure its metadata.
    const cfgTx = new Transaction();
    await dubhe.tx.town_system.configure_building({
      tx: cfgTx,
      params: [
        cfgTx.object(DappStorageId),
        cfgTx.object(buildingId),
        cfgTx.pure.u8(b.kind),
        cfgTx.pure.string(b.name),
        cfgTx.pure.u64(b.wage),
        cfgTx.pure.u64(b.mealPrice)
      ]
    });
    const cfgResult = await dubhe.signAndSendTxn({ tx: cfgTx });
    await dubhe.waitForTransaction(cfgResult.digest);
    console.log(`  configured: kind=${b.kind} wage=${b.wage} meal=${b.mealPrice} (${cfgResult.digest})`);
  }

  // 3. Persist the building registry for the frontend and agent runner.
  const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'buildings.json');
  fs.writeFileSync(outPath, JSON.stringify({ network: networkArg, buildings: buildingIds }, null, 2));
  console.log(`\nBuilding registry written to ${outPath}`);
  console.log('Seed complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
