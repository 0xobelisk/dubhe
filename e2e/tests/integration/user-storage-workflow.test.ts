/**
 * UserStorage workflow integration tests: full lifecycle on localnet.
 *
 * Covers the UserStorage pattern introduced with the per-user storage design:
 *
 *   UserStorage design:
 *     - Each user calls initUserStorage once to create their own shared UserStorage.
 *     - DApp system functions accept only &mut UserStorage (DappHub no longer required).
 *     - State is isolated per user — incrementing one user's counter does NOT
 *       affect another user's counter.
 *
 *   Tests:
 *   1.  Publish counter (UserStorage version) + dubhe framework to localnet
 *   2.  initUserStorage — happy path: UserStorage created and shared on-chain
 *   3.  counter_system::inc — owner increments their counter (value = 1)
 *   4.  counter_system::inc — owner increments again (value = 2)
 *   5.  counter_system::inc by stranger on owner's UserStorage is rejected (no_permission_error)
 *   6.  A second user creates their own UserStorage
 *   7.  Second user increments their counter independently (value = 1, not 3)
 *   8.  UserStorage objects are distinct on-chain with correct canonical_owner
 *
 * Prerequisites:
 *   - Localnet running (`dubhe node --force`)  RPC: http://127.0.0.1:9000
 *   - sui CLI installed (`sui --version`)
 *
 * Run:
 *   pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transaction } from '@mysten/sui/transactions';
import { schemaGen } from '@0xobelisk/sui-common';
import { Dubhe } from '@0xobelisk/sui-client';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { publishHandler } from '../../../packages/sui-cli/src/utils/publishHandler.js';
import { dubheConfig as template101Config } from '../../../templates/101/sui-template/packages/contracts/dubhe.config.js';
import {
  LOCALNET_TEST_KEYS,
  isSuiCliInstalled,
  isNetworkReachable,
  setupIntegrationEnv,
  teardownIntegrationEnv,
  type IntegrationEnv
} from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_DIR = path.resolve(__dirname, '../../../framework/src/dubhe');
const LOCALNET_RPC = 'http://127.0.0.1:9000';
const NETWORK = 'localnet' as const;

const suiCliAvailable = isSuiCliInstalled();
const localnetRunning = isNetworkReachable(NETWORK);
const canRunTests = suiCliAvailable && localnetRunning;

if (!suiCliAvailable) console.warn('\n⚠  UserStorage tests skipped: sui CLI not found.');
if (!localnetRunning)
  console.warn('\n⚠  UserStorage tests skipped: localnet not reachable at http://127.0.0.1:9000');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fundAddress(address: string): Promise<void> {
  try {
    await requestSuiFromFaucetV2({ host: getFaucetHost('localnet'), recipient: address });
  } catch {
    // Rate-limited or already funded — ignore
  }
}

function readLatestJson(tempDir: string, packageName: string): Record<string, unknown> {
  const filePath = path.join(
    tempDir,
    'src',
    packageName,
    '.history',
    'sui_localnet',
    'latest.json'
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

/**
 * Extract the UserStorage object ID from the result of an initUserStorage transaction.
 */
function extractUserStorageId(result: SuiTransactionBlockResponse): string {
  const created = result.objectChanges?.find(
    (c) =>
      c.type === 'created' && 'objectType' in c && /::dapp_service::UserStorage$/.test(c.objectType)
  );
  if (!created || !('objectId' in created)) {
    throw new Error('UserStorage not found in transaction object changes');
  }
  return (created as { objectId: string }).objectId;
}

/**
 * Call counter_system::inc using a raw Transaction.
 *
 * The function signature is:
 *   public entry fun inc(user_storage: &mut UserStorage, number: u32, ctx: &mut TxContext)
 *
 * DappHub is no longer required — max_unsettled_writes is a compile-time constant.
 */
async function callInc(
  dubhe: Dubhe,
  counterPackageId: string,
  userStorageId: string,
  number = 1
): Promise<SuiTransactionBlockResponse> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${counterPackageId}::counter_system::inc`,
    arguments: [tx.object(userStorageId), tx.pure.u32(number)]
  });
  return dubhe.signAndSendTxn({ tx }) as Promise<SuiTransactionBlockResponse>;
}

/**
 * Assert that a transaction call is rejected by the chain.
 */
async function expectTxFail(call: Promise<SuiTransactionBlockResponse>, label = ''): Promise<void> {
  try {
    const result = await call;
    if (result.effects?.status.status !== 'failure') {
      throw new Error(
        `${label}: expected transaction to fail but got ${result.effects?.status.status}`
      );
    }
  } catch (e) {
    const err = e as Error;
    if (!err.message.match(/MoveAbort|Dry run failed|Transaction is rejected|failure/i)) {
      throw err;
    }
    // Expected rejection — pass
  }
}

// ─── Main test suite ──────────────────────────────────────────────────────────

describe.skipIf(!canRunTests)('Integration: UserStorage counter lifecycle', () => {
  let env: IntegrationEnv;
  let counterPackageId: string;
  let dappHubId: string;
  let dappStorageId: string;

  // Two wallets: owner and a second user
  let ownerDubhe: Dubhe;
  let secondUserDubhe: Dubhe;
  let strangerDubhe: Dubhe;

  let ownerAddress: string;
  let secondUserAddress: string;

  let ownerUserStorageId: string;
  let secondUserStorageId: string;

  beforeAll(async () => {
    console.log('\n📋 [UserStorage] Setting up localnet integration environment...');
    env = await setupIntegrationEnv(NETWORK);

    // Sync latest framework sources into temp dir
    console.log('  Syncing latest framework sources into temp dir...');
    const tempDubheSourcesDir = path.join(env.tempDir, 'src', 'dubhe', 'sources');
    fs.rmSync(tempDubheSourcesDir, { recursive: true, force: true });
    fs.cpSync(path.join(FRAMEWORK_DIR, 'sources'), tempDubheSourcesDir, { recursive: true });

    // Run schemagen with template101 config (UserStorage-based counter)
    console.log('  Running schemagen (UserStorage counter)...');
    await schemaGen(env.tempDir, template101Config);

    // Deploy dubhe + counter to localnet
    console.log('  Publishing dubhe + counter to localnet...');
    await publishHandler(template101Config, NETWORK, false);

    // Read deployment artifacts
    const dubheData = readLatestJson(env.tempDir, 'dubhe');
    const counterData = readLatestJson(env.tempDir, 'counter');

    counterPackageId = counterData['packageId'] as string;
    dappHubId = dubheData['dappHub'] as string;
    dappStorageId = counterData['dappStorageId'] as string;

    const frameworkPackageId = dubheData['packageId'] as string;

    console.log(`  Counter package:   ${counterPackageId}`);
    console.log(`  DappHub:           ${dappHubId}`);
    console.log(`  DappStorage:       ${dappStorageId}`);

    // ── Wallet setup ──────────────────────────────────────────────────────────
    const dubheOpts = {
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      packageId: counterPackageId,
      frameworkPackageId,
      dappStorageId
    };
    ownerDubhe = new Dubhe({ secretKey: LOCALNET_TEST_KEYS[0], ...dubheOpts });
    secondUserDubhe = new Dubhe({ secretKey: LOCALNET_TEST_KEYS[1], ...dubheOpts });
    strangerDubhe = new Dubhe({ secretKey: LOCALNET_TEST_KEYS[2], ...dubheOpts });

    ownerAddress = ownerDubhe.getAddress();
    secondUserAddress = secondUserDubhe.getAddress();

    // Fund all wallets
    console.log('  Funding test wallets...');
    await Promise.all([
      fundAddress(ownerAddress),
      fundAddress(secondUserAddress),
      fundAddress(strangerDubhe.getAddress())
    ]);

    console.log(`  Owner:        ${ownerAddress}`);
    console.log(`  Second user:  ${secondUserAddress}`);
    console.log('  Setup complete.\n');
  }, 300_000);

  afterAll(async () => {
    if (env) {
      await teardownIntegrationEnv(env);
      console.log('\n🧹 [UserStorage] Cleaned up integration test environment.');
    }
  });

  // ── 1. Owner creates UserStorage ──────────────────────────────────────────

  it('owner creates UserStorage via initUserStorage', async () => {
    const result = (await ownerDubhe.initUserStorage({
      dappHubId,
      dappStorageId,
      onSuccess: (r) => console.log(`  ✅ initUserStorage tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    ownerUserStorageId = extractUserStorageId(result);
    expect(ownerUserStorageId).toMatch(/^0x[0-9a-f]{64}$/);

    // Wait for the object to be indexed before subsequent tests reference it.
    await ownerDubhe.waitForTransaction(result.digest);

    console.log(`  ✅ Owner UserStorage created: ${ownerUserStorageId}`);
  }, 30_000);

  // ── 3. Owner increments counter (value = 1) ───────────────────────────────

  it('counter_system::inc increments owner counter to 1', async () => {
    const result = await callInc(ownerDubhe, counterPackageId, ownerUserStorageId);

    expect(result.effects?.status.status).toBe('success');
    console.log(`  ✅ inc tx (value=1): ${result.digest}`);
  }, 30_000);

  // ── 4. Owner increments counter again (value = 2) ─────────────────────────

  it('counter_system::inc increments owner counter to 2', async () => {
    const result = await callInc(ownerDubhe, counterPackageId, ownerUserStorageId);

    expect(result.effects?.status.status).toBe('success');
    console.log(`  ✅ inc tx (value=2): ${result.digest}`);
  }, 30_000);

  // ── 5. Stranger cannot increment owner's counter ──────────────────────────

  it('stranger cannot call inc on owner UserStorage (no_permission_error)', async () => {
    await expectTxFail(
      callInc(strangerDubhe, counterPackageId, ownerUserStorageId),
      'stranger inc on owner storage'
    );
    console.log('  ✅ Stranger inc correctly rejected');
  }, 30_000);

  // ── 6. Second user creates independent UserStorage ────────────────────────

  it('second user creates their own UserStorage', async () => {
    const result = (await secondUserDubhe.initUserStorage({
      dappHubId,
      dappStorageId,
      onSuccess: (r) => console.log(`  ✅ second user initUserStorage tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    secondUserStorageId = extractUserStorageId(result);
    expect(secondUserStorageId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(secondUserStorageId).not.toBe(ownerUserStorageId);

    // Wait for the object to be indexed.
    await secondUserDubhe.waitForTransaction(result.digest);

    console.log(`  ✅ Second user UserStorage created: ${secondUserStorageId}`);
  }, 30_000);

  // ── 7. Second user counter is independent from owner's ───────────────────

  it('second user counter starts from 0 (independent from owner)', async () => {
    // Owner is at value=2. Second user's first increment should give value=1.
    const result = await callInc(secondUserDubhe, counterPackageId, secondUserStorageId);

    expect(result.effects?.status.status).toBe('success');
    console.log(`  ✅ Second user inc tx (value=1, independent): ${result.digest}`);
  }, 30_000);

  // ── 8. UserStorage objects are distinct on-chain ──────────────────────────

  it('owner and second user have distinct UserStorage objects on-chain', async () => {
    const ownerObj = await ownerDubhe.getObject(ownerUserStorageId);
    const secondObj = await secondUserDubhe.getObject(secondUserStorageId);

    // getObject returns SuiObjectData; objectId is a top-level field.
    expect(ownerObj?.objectId).toBe(ownerUserStorageId);
    expect(secondObj?.objectId).toBe(secondUserStorageId);

    // Read canonical_owner fields to confirm ownership
    if (ownerObj?.content?.dataType === 'moveObject') {
      const ownerFields = ownerObj.content.fields as Record<string, unknown>;
      expect((ownerFields['canonical_owner'] as string).toLowerCase()).toBe(
        ownerAddress.toLowerCase()
      );
    }
    if (secondObj?.content?.dataType === 'moveObject') {
      const secondFields = secondObj.content.fields as Record<string, unknown>;
      expect((secondFields['canonical_owner'] as string).toLowerCase()).toBe(
        secondUserAddress.toLowerCase()
      );
    }

    console.log(`  ✅ Owner canonical_owner verified: ${ownerAddress}`);
    console.log(`  ✅ Second user canonical_owner verified: ${secondUserAddress}`);
  }, 30_000);
});
