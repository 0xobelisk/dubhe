/**
 * Session key integration tests: full lifecycle on localnet.
 *
 * Covers the session key system that replaced the old proxy model:
 *
 *   Session key design (vs old proxy):
 *     - No signature verification or ownership transfer required.
 *     - UserStorage stays as a shared object; the canonical owner grants a
 *       short-lived write key to an ephemeral wallet (e.g. game session).
 *     - Owner can revoke at any time; the session key can sign out itself.
 *     - Min duration: 60 s, Max duration: 7 days.
 *
 *   Tests:
 *   1.  Create UserStorage for owner via initUserStorage
 *   2.  Duplicate UserStorage creation is rejected (user_storage_already_exists_error)
 *   3.  activateSession — happy path: session key + expiry recorded on-chain
 *   4.  activateSession — non-owner caller is rejected (not_canonical_owner_error)
 *   5.  activateSession — session wallet == owner rejected (invalid_session_key_error)
 *   6.  activateSession — session wallet == @0x0 rejected (invalid_session_key_error)
 *   7.  activateSession — duration below MIN (60 s) rejected (invalid_session_duration_error)
 *   8.  activateSession — duration above MAX (7 days) rejected (invalid_session_duration_error)
 *   9.  activateSession — overwrite an active session (no deactivate needed)
 *   10. deactivateSession — by canonical owner clears session key
 *   11. deactivateSession — when no active session rejected (no_active_session_error)
 *   12. activateSession — activate session again after deactivation
 *   13. deactivateSession — stranger cannot deactivate active session (no_permission_error)
 *   14. deactivateSession — session key deactivates itself
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
import { schemaGen } from '@0xobelisk/sui-common';
import { Dubhe } from '@0xobelisk/sui-client';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import type { TransactionResult } from '@mysten/sui/transactions';
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

const NETWORK = 'localnet' as const;
const LOCALNET_RPC = 'http://127.0.0.1:9000';

/** 1 minute in ms — MIN_SESSION_DURATION_MS in dapp_system.move */
const MIN_SESSION_DURATION_MS = 60_000;
/** 7 days in ms — MAX_SESSION_DURATION_MS in dapp_system.move */
const MAX_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

// ─── Prerequisites ────────────────────────────────────────────────────────────

const suiCliAvailable = isSuiCliInstalled();
const localnetRunning = isNetworkReachable(NETWORK);
const canRunTests = suiCliAvailable && localnetRunning;

if (!suiCliAvailable) console.warn('\n⚠  Session tests skipped: sui CLI not found.');
if (!localnetRunning)
  console.warn('\n⚠  Session tests skipped: localnet not reachable at http://127.0.0.1:9000');

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
 * Assert that a transaction call is rejected by the chain.
 *
 * The Sui SDK may throw during `Transaction.build()` on a dry-run abort,
 * or return a response with `effects.status.status == 'failure'`. Both
 * outcomes count as a rejection.
 */
async function expectTxFail(
  call: Promise<SuiTransactionBlockResponse | TransactionResult>,
  label = ''
): Promise<void> {
  try {
    const result = await call;
    const response = result as SuiTransactionBlockResponse;
    if (response.effects?.status.status !== 'failure') {
      throw new Error(
        `${label}: expected transaction to fail but got ${response.effects?.status.status}`
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

/**
 * Read the UserStorage on-chain object fields via the Dubhe SDK.
 *
 * `dubhe.getObject(id)` uses `suiInteractor.getObjects` internally (includes
 * `showContent: true` by default) and returns an unwrapped `SuiObjectData`,
 * so we access `.content` directly without an extra `.data` dereference.
 *
 * Returns `{ canonical_owner, session_key, session_expires_at }`.
 */
async function getUserStorageFields(
  dubhe: Dubhe,
  userStorageId: string
): Promise<{ canonical_owner: string; session_key: string; session_expires_at: string }> {
  const objData = await dubhe.getObject(userStorageId);
  if (!objData.content || objData.content.dataType !== 'moveObject') {
    throw new Error(`UserStorage ${userStorageId} not found or has no content`);
  }
  const fields = objData.content.fields as Record<string, unknown>;
  return {
    canonical_owner: fields['canonical_owner'] as string,
    session_key: fields['session_key'] as string,
    session_expires_at: fields['session_expires_at'] as string
  };
}

// ─── Main test suite ──────────────────────────────────────────────────────────

describe.skipIf(!canRunTests)('Integration: session key lifecycle', () => {
  let env: IntegrationEnv;
  let frameworkPackageId: string;
  let dappHubId: string;
  let dappStorageId: string;

  // Three distinct wallets used across the tests
  let ownerDubhe: Dubhe;
  let sessionDubhe: Dubhe;
  let strangerDubhe: Dubhe;

  let ownerAddress: string;
  let sessionAddress: string;

  let userStorageId: string;

  beforeAll(async () => {
    console.log('\n📋 [Session] Setting up localnet integration environment...');
    env = await setupIntegrationEnv(NETWORK);

    // Sync latest framework sources into temp dir
    console.log('  Syncing latest framework sources into temp dir...');
    const tempDubheSourcesDir = path.join(env.tempDir, 'src', 'dubhe', 'sources');
    fs.rmSync(tempDubheSourcesDir, { recursive: true, force: true });
    fs.cpSync(path.join(FRAMEWORK_DIR, 'sources'), tempDubheSourcesDir, { recursive: true });

    // Run schemagen
    console.log('  Running schemagen...');
    await schemaGen(env.tempDir, template101Config);

    // Deploy dubhe + counter
    console.log('  Publishing dubhe + counter to localnet...');
    await publishHandler(template101Config, NETWORK, false);

    // Read deployment artifacts
    const dubheData = readLatestJson(env.tempDir, 'dubhe');
    const counterData = readLatestJson(env.tempDir, 'counter');

    frameworkPackageId = dubheData['packageId'] as string;
    dappHubId = dubheData['dappHub'] as string;
    dappStorageId = counterData['dappStorageId'] as string;

    console.log(`  Framework: ${frameworkPackageId}`);
    console.log(`  DappHub:   ${dappHubId}`);
    console.log(`  DappStorage: ${dappStorageId}`);

    // ── Wallet setup ────────────────────────────────────────────────────────
    // Account #0 (owner), Account #1 (session), Account #2 (stranger)
    ownerDubhe = new Dubhe({
      secretKey: LOCALNET_TEST_KEYS[0],
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      packageId: counterData['packageId'] as string,
      frameworkPackageId,
      dappStorageId
    });
    sessionDubhe = new Dubhe({
      secretKey: LOCALNET_TEST_KEYS[1],
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      packageId: counterData['packageId'] as string,
      frameworkPackageId,
      dappStorageId
    });
    strangerDubhe = new Dubhe({
      secretKey: LOCALNET_TEST_KEYS[2],
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      packageId: counterData['packageId'] as string,
      frameworkPackageId,
      dappStorageId
    });

    ownerAddress = ownerDubhe.getAddress();
    sessionAddress = sessionDubhe.getAddress();

    // Fund all wallets
    console.log('  Funding test wallets...');
    await Promise.all([
      fundAddress(ownerAddress),
      fundAddress(sessionAddress),
      fundAddress(strangerDubhe.getAddress())
    ]);

    console.log(`  Owner:   ${ownerAddress}`);
    console.log(`  Session: ${sessionAddress}`);
    console.log('  Setup complete.\n');
  }, 300_000);

  afterAll(async () => {
    if (env) {
      await teardownIntegrationEnv(env);
      console.log('\n🧹 [Session] Cleaned up integration test environment.');
    }
  });

  // ── 1. Create UserStorage ──────────────────────────────────────────────────

  it('owner creates UserStorage via initUserStorage', async () => {
    const result = (await ownerDubhe.initUserStorage({
      dappHubId,
      dappStorageId,
      onSuccess: (r) => console.log(`  ✅ initUserStorage tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    // Find the created UserStorage object ID from the transaction output
    const created = result.objectChanges?.find(
      (c) =>
        c.type === 'created' &&
        'objectType' in c &&
        /::dapp_service::UserStorage$/.test(c.objectType)
    );
    expect(created).toBeDefined();
    userStorageId = (created as { objectId: string }).objectId;
    expect(userStorageId).toMatch(/^0x[0-9a-f]{64}$/);

    // Wait for the transaction to be indexed so that:
    //   a) DappStorage reflects the new registry key (needed for the duplicate-check test)
    //   b) UserStorage object is available for getObject / activateSession calls
    await ownerDubhe.waitForTransaction(result.digest);
    console.log(`  ✅ UserStorage created: ${userStorageId}`);
  }, 30_000);

  // ── 2. Duplicate UserStorage rejected ─────────────────────────────────────

  it('duplicate initUserStorage is rejected (user_storage_already_exists_error)', async () => {
    await expectTxFail(
      ownerDubhe.initUserStorage({ dappHubId, dappStorageId }),
      'duplicate UserStorage'
    );
    console.log('  ✅ Duplicate UserStorage correctly rejected');
  }, 30_000);

  // ── 3. activateSession — happy path ───────────────────────────────────────

  it('activateSession sets session_key and session_expires_at on-chain', async () => {
    const result = (await ownerDubhe.activateSession({
      userStorageId,
      sessionWallet: sessionAddress,
      durationMs: MIN_SESSION_DURATION_MS,
      onSuccess: (r) => console.log(`  ✅ activateSession tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    // Verify on-chain state
    await ownerDubhe.waitForTransaction(result.digest);
    const fields = await getUserStorageFields(ownerDubhe, userStorageId);

    expect(fields.canonical_owner.toLowerCase()).toBe(ownerAddress.toLowerCase());
    expect(fields.session_key.toLowerCase()).toBe(sessionAddress.toLowerCase());
    // session_expires_at must be > 0 (exact value is clock-dependent)
    expect(BigInt(fields.session_expires_at)).toBeGreaterThan(0n);

    console.log(`  ✅ session_key = ${fields.session_key}`);
    console.log(`  ✅ session_expires_at = ${fields.session_expires_at}`);
  }, 30_000);

  // ── 4. activateSession — non-owner rejected ────────────────────────────────

  it('activateSession by non-owner is rejected (not_canonical_owner_error)', async () => {
    await expectTxFail(
      strangerDubhe.activateSession({
        userStorageId,
        sessionWallet: sessionAddress,
        durationMs: MIN_SESSION_DURATION_MS
      }),
      'non-owner activateSession'
    );
    console.log('  ✅ Non-owner activateSession correctly rejected');
  }, 30_000);

  // ── 5. session wallet == owner rejected ───────────────────────────────────

  it('activateSession with sessionWallet == owner rejected (invalid_session_key_error)', async () => {
    await expectTxFail(
      ownerDubhe.activateSession({
        userStorageId,
        sessionWallet: ownerAddress,
        durationMs: MIN_SESSION_DURATION_MS
      }),
      'session wallet == owner'
    );
    console.log('  ✅ session wallet == owner correctly rejected');
  }, 30_000);

  // ── 6. session wallet == @0x0 rejected ────────────────────────────────────

  it('activateSession with sessionWallet == @0x0 rejected (invalid_session_key_error)', async () => {
    await expectTxFail(
      ownerDubhe.activateSession({
        userStorageId,
        sessionWallet: '0x0000000000000000000000000000000000000000000000000000000000000000',
        durationMs: MIN_SESSION_DURATION_MS
      }),
      'session wallet == @0x0'
    );
    console.log('  ✅ session wallet == @0x0 correctly rejected');
  }, 30_000);

  // ── 7. duration below MIN rejected ────────────────────────────────────────

  it('activateSession with duration < MIN rejected (invalid_session_duration_error)', async () => {
    await expectTxFail(
      ownerDubhe.activateSession({
        userStorageId,
        sessionWallet: sessionAddress,
        durationMs: MIN_SESSION_DURATION_MS - 1
      }),
      'duration < MIN'
    );
    console.log(`  ✅ duration below MIN (${MIN_SESSION_DURATION_MS - 1} ms) correctly rejected`);
  }, 30_000);

  // ── 8. duration above MAX rejected ────────────────────────────────────────

  it('activateSession with duration > MAX rejected (invalid_session_duration_error)', async () => {
    await expectTxFail(
      ownerDubhe.activateSession({
        userStorageId,
        sessionWallet: sessionAddress,
        durationMs: MAX_SESSION_DURATION_MS + 1
      }),
      'duration > MAX'
    );
    console.log(`  ✅ duration above MAX (${MAX_SESSION_DURATION_MS + 1} ms) correctly rejected`);
  }, 30_000);

  // ── 9. activateSession overwrites active session ──────────────────────────

  it('activateSession while session active: overwrites session key without error', async () => {
    // Use stranger's address as the new session key to distinguish from the existing one
    const strangerAddress = strangerDubhe.getAddress();
    const result = (await ownerDubhe.activateSession({
      userStorageId,
      sessionWallet: strangerAddress,
      durationMs: MIN_SESSION_DURATION_MS,
      onSuccess: (r) => console.log(`  ✅ overwrite session tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    await ownerDubhe.waitForTransaction(result.digest);
    const fields = await getUserStorageFields(ownerDubhe, userStorageId);
    expect(fields.session_key.toLowerCase()).toBe(strangerAddress.toLowerCase());

    // Restore to sessionAddress for subsequent tests
    const restoreResult = (await ownerDubhe.activateSession({
      userStorageId,
      sessionWallet: sessionAddress,
      durationMs: MIN_SESSION_DURATION_MS
    })) as SuiTransactionBlockResponse;
    // Wait for restore to be indexed before proceeding to deactivate tests
    await ownerDubhe.waitForTransaction(restoreResult.digest);
    console.log('  ✅ Session key overwritten and restored to sessionAddress');
  }, 60_000);

  // ── 10. deactivateSession by owner ────────────────────────────────────────

  it('deactivateSession by canonical owner clears session_key to @0x0', async () => {
    const result = (await ownerDubhe.deactivateSession({
      userStorageId,
      onSuccess: (r) => console.log(`  ✅ deactivateSession (owner) tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    await ownerDubhe.waitForTransaction(result.digest);
    const fields = await getUserStorageFields(ownerDubhe, userStorageId);
    const zeroAddr = '0x0000000000000000000000000000000000000000000000000000000000000000';
    expect(fields.session_key.toLowerCase()).toBe(zeroAddr);
    expect(fields.session_expires_at).toBe('0');

    console.log('  ✅ Session cleared: session_key = @0x0, session_expires_at = 0');
  }, 30_000);

  // ── 11. deactivateSession with no active session rejected ──────────────────

  it('deactivateSession when no active session is rejected (no_active_session_error)', async () => {
    await expectTxFail(
      ownerDubhe.deactivateSession({ userStorageId }),
      'deactivate with no session'
    );
    console.log('  ✅ Deactivate with no session correctly rejected');
  }, 30_000);

  // ── 12. re-activate after deactivation ────────────────────────────────────

  it('activateSession succeeds after session was deactivated', async () => {
    const result = (await ownerDubhe.activateSession({
      userStorageId,
      sessionWallet: sessionAddress,
      durationMs: MIN_SESSION_DURATION_MS,
      onSuccess: (r) => console.log(`  ✅ re-activate session tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    await ownerDubhe.waitForTransaction(result.digest);
    const fields = await getUserStorageFields(ownerDubhe, userStorageId);
    expect(fields.session_key.toLowerCase()).toBe(sessionAddress.toLowerCase());

    console.log(`  ✅ Session re-activated: session_key = ${fields.session_key}`);
  }, 30_000);

  // ── 13. stranger cannot deactivate active session ──────────────────────────

  it('stranger cannot deactivate an active session (no_permission_error)', async () => {
    await expectTxFail(strangerDubhe.deactivateSession({ userStorageId }), 'stranger deactivate');
    console.log('  ✅ Stranger deactivation correctly rejected');
  }, 30_000);

  // ── 14. session key deactivates itself ────────────────────────────────────

  it('session key can deactivate itself', async () => {
    const result = (await sessionDubhe.deactivateSession({
      userStorageId,
      onSuccess: (r) => console.log(`  ✅ deactivateSession (session key) tx: ${r.digest}`)
    })) as SuiTransactionBlockResponse;

    expect(result.effects?.status.status).toBe('success');

    await sessionDubhe.waitForTransaction(result.digest);
    const fields = await getUserStorageFields(sessionDubhe, userStorageId);
    const zeroAddr = '0x0000000000000000000000000000000000000000000000000000000000000000';
    expect(fields.session_key.toLowerCase()).toBe(zeroAddr);

    console.log('  ✅ Session key deactivated itself: session_key = @0x0');
  }, 30_000);
});
