/**
 * Proxy integration tests: full lifecycle on localnet.
 *
 * Covers end-to-end proxy feature verification across:
 *   1.  Deployment validation — frameworkPackageId saved in deployment JSON
 *   2.  SDK utilities — address derivation, buildProxyMessage format
 *   3.  Pre-creation state — hasProxy/getProxyBinding/isProxyActive all false/null
 *   4.  createProxy error cases — past expiry, too-far expiry, tampered/wrong-owner signature
 *   5.  createProxy happy path — binding created, state queryable after indexing
 *   6.  Proxy transactions — proxy-signed counter::inc increments global counter,
 *       ensure_origin<DappKey> resolves to owner address
 *   7.  Re-binding rules — different owner rejected; same owner re-bind succeeds
 *   8.  extendProxy — extend succeeds; past/too-far/non-owner/missing all rejected
 *   9.  removeProxy — non-owner rejected; owner succeeds; post-removal state clean
 *   10. Re-registration after removal — freed proxy can be claimed by a new owner;
 *       ensure_origin falls back to proxy's own address without a binding
 *
 * Implementation notes:
 *   - After every write tx that other tests depend on, `waitForTx(digest)` is called
 *     so that subsequent devInspect calls see the committed state.
 *   - Expected-failure tests wrap the SDK call in a helper that accepts *either*
 *     a thrown exception (from dry-run abort) *or* a returned failure result.
 *   - The 101-template counter has a SINGLE GLOBAL counter (no per-address storage).
 *     Proxy resolution is verified by calling `address_system::ensure_origin` via
 *     devInspect with the proxy as the simulated sender.
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
import { Transaction, type TransactionResult } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
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

/** 7 days in milliseconds — mirrors MAX_PROXY_DURATION_MS in proxy_system.move */
const MAX_PROXY_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Prerequisites ────────────────────────────────────────────────────────────

const suiCliAvailable = isSuiCliInstalled();
const localnetRunning = isNetworkReachable(NETWORK);
const canRunTests = suiCliAvailable && localnetRunning;

if (!suiCliAvailable) console.warn('\n⚠  Proxy tests skipped: sui CLI not found.');
if (!localnetRunning)
  console.warn('\n⚠  Proxy tests skipped: localnet not reachable at http://127.0.0.1:9000');

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
 * Wait until a transaction is fully indexed so subsequent devInspect calls
 * read the committed state.
 */
async function waitForTx(dubhe: Dubhe, digest: string): Promise<void> {
  await dubhe.waitForTransaction(digest);
}

/**
 * Assert that a transaction call is rejected by the chain.
 *
 * The Sui SDK throws during `Transaction.build()` when the dry-run reveals a
 * Move abort.  In other cases the response is returned with a failure status.
 * Both outcomes count as "rejected".
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

// ─── Main test suite ──────────────────────────────────────────────────────────

describe.skipIf(!canRunTests)('Integration: proxy full lifecycle', () => {
  let env: IntegrationEnv;
  let frameworkPackageId: string;
  let counterPackageId: string;
  let dappHubId: string;

  let ownerDubhe: Dubhe;
  let proxyDubhe: Dubhe;
  let nonOwnerDubhe: Dubhe;

  let ownerAddress: string;
  let proxyAddress: string;

  let initialExpiresAt: number;

  // ── Query helpers ─────────────────────────────────────────────────────────

  /**
   * Read the per-address counter value for the given Sui address.
   *
   * The 101-template counter stores a u32 per address (keyed by the
   * address hex string without 0x prefix, as returned by ensure_origin).
   * Returns null if no entry exists yet.
   */
  async function queryCounterValue(address: string): Promise<number | null> {
    // The resource_account key is the hex address WITHOUT '0x'
    const addrHex = address.startsWith('0x') ? address.slice(2) : address;

    const hasTx = new Transaction();
    hasTx.moveCall({
      target: `${counterPackageId}::value::has`,
      arguments: [hasTx.object(dappHubId), hasTx.pure(bcs.string().serialize(addrHex))]
    });
    const hasResult = await ownerDubhe.inspectTxn(hasTx);
    const hasRv = hasResult.results?.[0]?.returnValues;
    if (!hasRv || hasRv.length === 0) return null;
    let exists: boolean;
    try {
      exists = bcs.bool().parse(Uint8Array.from(hasRv[0][0]));
    } catch {
      return null;
    }
    if (!exists) return null;

    const getTx = new Transaction();
    getTx.moveCall({
      target: `${counterPackageId}::value::get`,
      arguments: [getTx.object(dappHubId), getTx.pure(bcs.string().serialize(addrHex))]
    });
    const getResult = await ownerDubhe.inspectTxn(getTx);
    const getRv = getResult.results?.[0]?.returnValues;
    if (!getRv || getRv.length === 0) return null;
    try {
      return Number(bcs.u32().parse(Uint8Array.from(getRv[0][0])));
    } catch {
      return null;
    }
  }

  /**
   * Simulate `address_system::ensure_origin<DappKey>(dapp_hub, ctx)` for an
   * arbitrary sender via devInspect.
   *
   * The Transaction is passed directly (without `tx.build()`) so that
   * `devInspectTransactionBlock` uses the provided `sender` for ctx.sender().
   *
   * Returns the resolved address hex (without 0x), or null on error.
   *   - Active proxy binding   → owner's address
   *   - No binding / expired   → sender's own address
   */
  async function queryEnsureOrigin(sender: string): Promise<string | null> {
    const counterPkgHex = counterPackageId.replace(/^0x/, '').padStart(64, '0');
    const dappKeyType = `${counterPkgHex}::dapp_key::DappKey`;
    const tx = new Transaction();
    tx.moveCall({
      target: `${frameworkPackageId}::address_system::ensure_origin`,
      typeArguments: [dappKeyType],
      arguments: [tx.object(dappHubId)]
    });
    try {
      // Pass the Transaction object directly — do NOT call tx.build() here,
      // as that would dry-run with a different sender and may throw or resolve
      // gas incorrectly.  devInspectTransactionBlock accepts a Transaction directly.
      const result = await ownerDubhe.suiInteractor.currentClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender
      });
      const rv = result.results?.[0]?.returnValues;
      if (!rv || rv.length === 0) return null;
      return bcs.string().parse(Uint8Array.from(rv[0][0]));
    } catch {
      return null;
    }
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    console.log('\n📋 [Proxy] Setting up integration environment...');
    env = await setupIntegrationEnv(NETWORK);

    const srcDir = path.join(FRAMEWORK_DIR, 'sources');
    const destDir = path.join(env.tempDir, 'src', 'dubhe', 'sources');
    fs.rmSync(destDir, { recursive: true, force: true });
    fs.cpSync(srcDir, destDir, { recursive: true });

    await schemaGen(env.tempDir, template101Config);

    console.log('  Publishing dubhe framework + counter...');
    await publishHandler(template101Config, NETWORK, false);

    const dubheLatest = readLatestJson(env.tempDir, 'dubhe');
    const counterLatest = readLatestJson(env.tempDir, 'counter');

    frameworkPackageId = dubheLatest.packageId as string;
    dappHubId = dubheLatest.dappHub as string;
    counterPackageId = counterLatest.packageId as string;

    initialExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const clientBase = {
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      packageId: counterPackageId,
      frameworkPackageId
    };

    ownerDubhe = new Dubhe({ ...clientBase, secretKey: LOCALNET_TEST_KEYS[0] });
    proxyDubhe = new Dubhe({ ...clientBase, secretKey: LOCALNET_TEST_KEYS[1] });
    nonOwnerDubhe = new Dubhe({ ...clientBase, secretKey: LOCALNET_TEST_KEYS[2] });

    ownerAddress = ownerDubhe.getAddress();
    proxyAddress = proxyDubhe.getAddress();

    await fundAddress(ownerAddress);
    await fundAddress(proxyAddress);
    await fundAddress(nonOwnerDubhe.getAddress());

    console.log(`  Framework pkg:  ${frameworkPackageId}`);
    console.log(`  Counter pkg:    ${counterPackageId}`);
    console.log(`  DappHub:        ${dappHubId}`);
    console.log(`  Owner:          ${ownerAddress}`);
    console.log(`  Proxy:          ${proxyAddress}`);
    console.log('  Setup complete.\n');
  }, 300_000);

  afterAll(async () => {
    if (env) await teardownIntegrationEnv(env);
    console.log('\n🧹 [Proxy] Cleaned up integration environment.');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Group 1 — Deployment validation
  // ══════════════════════════════════════════════════════════════════════════

  it('dubhe latest.json has frameworkPackageId equal to its own packageId', () => {
    const data = readLatestJson(env.tempDir, 'dubhe');
    expect(data.frameworkPackageId).toBeDefined();
    expect(data.frameworkPackageId).toBe(data.packageId);
    console.log(`  ✅ dubhe frameworkPackageId: ${data.frameworkPackageId}`);
  });

  it('counter latest.json has frameworkPackageId matching dubhe packageId', () => {
    const data = readLatestJson(env.tempDir, 'counter');
    expect(data.frameworkPackageId).toBeDefined();
    expect(data.frameworkPackageId).toBe(frameworkPackageId);
    console.log(`  ✅ counter frameworkPackageId: ${data.frameworkPackageId}`);
  });

  it('Dubhe constructor resolves frameworkPackageId from explicit parameter', () => {
    expect(ownerDubhe.frameworkPackageId).toBe(frameworkPackageId);
    console.log(`  ✅ ownerDubhe.frameworkPackageId: ${ownerDubhe.frameworkPackageId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Group 2 — SDK utility methods
  // ══════════════════════════════════════════════════════════════════════════

  it('deriveSuiAddressFromEd25519PublicKey matches proxy wallet Sui address', async () => {
    const { publicKey } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: Date.now() + 3_600_000
    });
    const derived = ownerDubhe.deriveSuiAddressFromEd25519PublicKey(publicKey);
    const expected = proxyAddress.replace(/^0x/, '');
    expect(derived).toBe(expected);
    console.log(`  ✅ derived: 0x${derived}`);
  });

  it('buildProxyMessage produces the canonical "dubhe proxy:…" format', async () => {
    const expiresAt = Date.now() + 3_600_000;
    const { publicKey } = await proxyDubhe.signProxyMessage({ ownerAddress, expiresAt });
    const msgBytes = ownerDubhe.buildProxyMessage({
      ownerAddress,
      proxyPublicKey: publicKey,
      expiresAt
    });

    const msg = new TextDecoder().decode(msgBytes);
    const ownerHex = ownerAddress.replace(/^0x/, '');
    const proxyHex = ownerDubhe.deriveSuiAddressFromEd25519PublicKey(publicKey);
    const counterPkgHex = counterPackageId.replace(/^0x/, '').padStart(64, '0');
    const dappKeyType = `${counterPkgHex}::dapp_key::DappKey`;

    expect(msg).toBe(`dubhe proxy:${ownerHex}:${proxyHex}:${dappKeyType}:${expiresAt}`);
    console.log(`  ✅ message prefix: ${msg.slice(0, 60)}…`);
  });

  it('signProxyMessage produces a 64-byte signature and 32-byte public key', async () => {
    const { publicKey, signature, message } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: Date.now() + 3_600_000
    });
    expect(publicKey).toHaveLength(32);
    expect(signature).toHaveLength(64);
    expect(message.length).toBeGreaterThan(0);
    console.log(`  ✅ sig=${signature.length}B  pubkey=${publicKey.length}B`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Group 3 — Pre-creation state
  // ══════════════════════════════════════════════════════════════════════════

  it('hasProxy returns false before any binding is created', async () => {
    expect(await ownerDubhe.hasProxy({ dappHubId, proxyAddress })).toBe(false);
    console.log('  ✅ hasProxy = false (no binding yet)');
  }, 30_000);

  it('getProxyBinding returns null before any binding is created', async () => {
    expect(await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress })).toBeNull();
    console.log('  ✅ getProxyBinding = null (no binding yet)');
  }, 30_000);

  it('isProxyActive returns false before any binding is created', async () => {
    expect(await ownerDubhe.isProxyActive({ dappHubId, proxyAddress })).toBe(false);
    console.log('  ✅ isProxyActive = false (no binding yet)');
  }, 30_000);

  it('ensure_origin returns proxy own address when no binding exists', async () => {
    const resolved = await queryEnsureOrigin(proxyAddress);
    const proxyHex = proxyAddress.replace(/^0x/, '');
    expect(resolved).toBe(proxyHex);
    console.log(`  ✅ ensure_origin without binding = ${resolved}`);
  }, 30_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 4 — createProxy error cases
  // ══════════════════════════════════════════════════════════════════════════

  it('createProxy with expiresAt in the past is rejected (E_EXPIRES_AT_IN_PAST)', async () => {
    const pastExpiry = 1000;
    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: pastExpiry
    });
    await expectTxFail(
      ownerDubhe.createProxy({ dappHubId, publicKey, signature, expiresAt: pastExpiry }),
      'past expiresAt'
    );
    console.log('  ✅ past expiresAt rejected (E_EXPIRES_AT_IN_PAST)');
  }, 30_000);

  it('createProxy with expiresAt > 7 days is rejected (E_EXPIRES_AT_TOO_FAR)', async () => {
    const tooFar = Date.now() + MAX_PROXY_DURATION_MS + 24 * 60 * 60 * 1000;
    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: tooFar
    });
    await expectTxFail(
      ownerDubhe.createProxy({ dappHubId, publicKey, signature, expiresAt: tooFar }),
      'expiresAt > 7 days'
    );
    console.log('  ✅ expiresAt > 7 days rejected (E_EXPIRES_AT_TOO_FAR)');
  }, 30_000);

  it('createProxy with tampered signature is rejected (E_INVALID_SIGNATURE)', async () => {
    const { publicKey } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: initialExpiresAt
    });
    const fakeSignature = new Uint8Array(64).fill(0xde);
    await expectTxFail(
      ownerDubhe.createProxy({
        dappHubId,
        publicKey,
        signature: fakeSignature,
        expiresAt: initialExpiresAt
      }),
      'tampered signature'
    );
    console.log('  ✅ tampered signature rejected (E_INVALID_SIGNATURE)');
  }, 30_000);

  it('createProxy with invalid public key length is rejected (E_INVALID_PUBLIC_KEY_LEN)', async () => {
    const shortKey = new Uint8Array(31).fill(0xaa); // 31 bytes instead of 32
    const fakeSignature = new Uint8Array(64).fill(0xbb);
    await expectTxFail(
      ownerDubhe.createProxy({
        dappHubId,
        publicKey: shortKey,
        signature: fakeSignature,
        expiresAt: initialExpiresAt
      }),
      'invalid public key length'
    );
    console.log('  ✅ invalid public key length rejected (E_INVALID_PUBLIC_KEY_LEN)');
  }, 30_000);

  it('createProxy with invalid signature length is rejected (E_INVALID_SIGNATURE_LEN)', async () => {
    const { publicKey } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: initialExpiresAt
    });
    const shortSig = new Uint8Array(63).fill(0xcc); // 63 bytes instead of 64
    await expectTxFail(
      ownerDubhe.createProxy({
        dappHubId,
        publicKey,
        signature: shortSig,
        expiresAt: initialExpiresAt
      }),
      'invalid signature length'
    );
    console.log('  ✅ invalid signature length rejected (E_INVALID_SIGNATURE_LEN)');
  }, 30_000);

  it('createProxy with mismatched owner in signed message is rejected', async () => {
    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress: nonOwnerDubhe.getAddress(),
      expiresAt: initialExpiresAt
    });
    await expectTxFail(
      ownerDubhe.createProxy({ dappHubId, publicKey, signature, expiresAt: initialExpiresAt }),
      'owner mismatch'
    );
    console.log('  ✅ mismatched owner in message rejected');
  }, 30_000);

  it('createProxy with expiresAt = epoch_timestamp_ms + 7 days (max boundary) succeeds', async () => {
    // The on-chain check is: expires_at <= epoch_timestamp_ms + MAX (<=, not <).
    // We query the current epoch start timestamp from the chain so our expiresAt lands
    // exactly at the allowed ceiling.
    const systemState = await ownerDubhe.suiInteractor.currentClient.getLatestSuiSystemState();
    const epochMs = Number(systemState.epochStartTimestampMs);
    const maxBoundary = epochMs + MAX_PROXY_DURATION_MS;

    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: maxBoundary
    });
    const result = (await ownerDubhe.createProxy({
      dappHubId,
      publicKey,
      signature,
      expiresAt: maxBoundary
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);
    // Clean up: remove the binding so subsequent tests start with a clean state
    const cleanup = (await ownerDubhe.removeProxy({
      dappHubId,
      proxyAddress
    })) as SuiTransactionBlockResponse;
    await waitForTx(ownerDubhe, cleanup.digest);
    console.log(
      `  ✅ max boundary createProxy succeeded (expiresAt = epochMs + 7d = ${new Date(
        maxBoundary
      ).toISOString()})`
    );
  }, 60_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 5 — createProxy happy path
  // ══════════════════════════════════════════════════════════════════════════

  it('createProxy succeeds with valid signature and future expiresAt', async () => {
    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: initialExpiresAt
    });
    const result = (await ownerDubhe.createProxy({
      dappHubId,
      publicKey,
      signature,
      expiresAt: initialExpiresAt
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);
    console.log(`  ✅ createProxy succeeded (digest: ${result.digest})`);
  }, 60_000);

  it('hasProxy returns true after createProxy', async () => {
    expect(await ownerDubhe.hasProxy({ dappHubId, proxyAddress })).toBe(true);
    console.log('  ✅ hasProxy = true');
  }, 30_000);

  it('getProxyBinding returns correct owner and expiresAt after createProxy', async () => {
    const binding = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress });
    expect(binding).not.toBeNull();
    // SDK returns owner with 0x prefix
    expect(binding!.owner.toLowerCase()).toBe(ownerAddress.toLowerCase());
    expect(binding!.expiresAt).toBe(initialExpiresAt);
    console.log(
      `  ✅ owner: ${binding!.owner}  expiresAt: ${new Date(binding!.expiresAt).toISOString()}`
    );
  }, 30_000);

  it('isProxyActive returns true for an active binding', async () => {
    expect(await ownerDubhe.isProxyActive({ dappHubId, proxyAddress })).toBe(true);
    console.log('  ✅ isProxyActive = true');
  }, 30_000);

  it('ensure_origin resolves to owner address when binding is active', async () => {
    const resolved = await queryEnsureOrigin(proxyAddress);
    const ownerHex = ownerAddress.replace(/^0x/, '');
    expect(resolved).toBe(ownerHex);
    console.log(`  ✅ ensure_origin with active binding → ${resolved} (owner)`);
  }, 30_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 6 — Proxy transactions (counter::inc)
  // ══════════════════════════════════════════════════════════════════════════

  it('counter::inc via proxy wallet succeeds and stores value under owner address', async () => {
    // proxy calls inc — ensure_origin resolves to owner, so value is stored under owner
    const tx = new Transaction();
    tx.moveCall({
      target: `${counterPackageId}::counter_system::inc`,
      arguments: [tx.object(dappHubId), tx.pure.u32(7)]
    });
    const result = await proxyDubhe.signAndSendTxn({ tx });
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    const ownerValue = await queryCounterValue(ownerAddress);
    const proxyValue = await queryCounterValue(proxyAddress);
    expect(ownerValue).toBe(7); // stored under owner (ensure_origin resolved)
    expect(proxyValue).toBeNull(); // NOT stored under proxy address
    console.log(`  ✅ proxy inc: owner value = ${ownerValue}, proxy value = ${proxyValue} (null)`);
  }, 60_000);

  it('counter::inc called directly by owner accumulates under owner address', async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${counterPackageId}::counter_system::inc`,
      arguments: [tx.object(dappHubId), tx.pure.u32(3)]
    });
    const result = await ownerDubhe.signAndSendTxn({ tx });
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    const ownerValue = await queryCounterValue(ownerAddress);
    expect(ownerValue).toBe(10); // 7 + 3 = 10
    console.log(`  ✅ owner-direct inc: owner value = ${ownerValue}`);
  }, 60_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 7 — Re-binding rules
  // ══════════════════════════════════════════════════════════════════════════

  it('createProxy by different owner for an active proxy is rejected (E_PROXY_ALREADY_CLAIMED)', async () => {
    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress: nonOwnerDubhe.getAddress(),
      expiresAt: initialExpiresAt
    });
    await expectTxFail(
      nonOwnerDubhe.createProxy({
        dappHubId,
        publicKey,
        signature,
        expiresAt: initialExpiresAt
      }),
      'different owner re-bind'
    );
    console.log('  ✅ different-owner re-bind rejected (E_PROXY_ALREADY_CLAIMED)');
  }, 30_000);

  it('createProxy by the same owner succeeds and updates expiresAt', async () => {
    const newExpiresAt = Date.now() + 48 * 60 * 60 * 1000;
    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: newExpiresAt
    });
    const result = (await ownerDubhe.createProxy({
      dappHubId,
      publicKey,
      signature,
      expiresAt: newExpiresAt
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    const binding = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress });
    expect(binding).not.toBeNull();
    expect(binding!.expiresAt).toBe(newExpiresAt);
    console.log(
      `  ✅ same-owner re-bind succeeded, expiresAt → ${new Date(newExpiresAt).toISOString()}`
    );
  }, 60_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 8 — extendProxy
  // ══════════════════════════════════════════════════════════════════════════

  it('extendProxy by owner to a valid future time succeeds', async () => {
    const newExpiresAt = Date.now() + 72 * 60 * 60 * 1000;
    const result = (await ownerDubhe.extendProxy({
      dappHubId,
      proxyAddress,
      newExpiresAt
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    const binding = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress });
    expect(binding!.expiresAt).toBe(newExpiresAt);
    console.log(`  ✅ extendProxy to ${new Date(newExpiresAt).toISOString()}`);
  }, 60_000);

  it('extendProxy can also shorten an active binding expiry', async () => {
    // The contract allows the owner to SHORTEN (not just extend) the binding lifetime.
    // This lets the owner revoke access sooner than originally planned — without
    // requiring a full removeProxy + createProxy cycle.
    const shorterExpiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 h (was 72 h)
    const result = (await ownerDubhe.extendProxy({
      dappHubId,
      proxyAddress,
      newExpiresAt: shorterExpiresAt
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    const binding = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress });
    expect(binding!.expiresAt).toBe(shorterExpiresAt);
    console.log(`  ✅ extendProxy shortened expiry → ${new Date(shorterExpiresAt).toISOString()}`);
  }, 60_000);

  it('extendProxy with past expiresAt is rejected (E_EXPIRES_AT_IN_PAST)', async () => {
    await expectTxFail(
      ownerDubhe.extendProxy({ dappHubId, proxyAddress, newExpiresAt: 1000 }),
      'past newExpiresAt'
    );
    console.log('  ✅ extendProxy past newExpiresAt rejected');
  }, 30_000);

  it('extendProxy with expiresAt > 7 days is rejected (E_EXPIRES_AT_TOO_FAR)', async () => {
    const tooFar = Date.now() + MAX_PROXY_DURATION_MS + 24 * 60 * 60 * 1000;
    await expectTxFail(
      ownerDubhe.extendProxy({ dappHubId, proxyAddress, newExpiresAt: tooFar }),
      'newExpiresAt > 7 days'
    );
    console.log('  ✅ extendProxy > 7 days rejected');
  }, 30_000);

  it('extendProxy by non-owner is rejected', async () => {
    await expectTxFail(
      nonOwnerDubhe.extendProxy({
        dappHubId,
        proxyAddress,
        newExpiresAt: Date.now() + 24 * 60 * 60 * 1000
      }),
      'non-owner extend'
    );
    console.log('  ✅ non-owner extendProxy rejected');
  }, 30_000);

  it('extendProxy for a non-existent proxy is rejected', async () => {
    const ghostAddress = '0x' + 'ab'.repeat(32);
    await expectTxFail(
      ownerDubhe.extendProxy({
        dappHubId,
        proxyAddress: ghostAddress,
        newExpiresAt: Date.now() + 24 * 60 * 60 * 1000
      }),
      'non-existent extend'
    );
    console.log('  ✅ extendProxy for non-existent proxy rejected');
  }, 30_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 9 — removeProxy
  // ══════════════════════════════════════════════════════════════════════════

  it('removeProxy by non-owner is rejected', async () => {
    await expectTxFail(nonOwnerDubhe.removeProxy({ dappHubId, proxyAddress }), 'non-owner remove');
    console.log('  ✅ non-owner removeProxy rejected');
  }, 30_000);

  it('removeProxy by owner succeeds', async () => {
    const result = (await ownerDubhe.removeProxy({
      dappHubId,
      proxyAddress
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);
    console.log(`  ✅ removeProxy succeeded (digest: ${result.digest})`);
  }, 60_000);

  it('hasProxy returns false after removeProxy', async () => {
    expect(await ownerDubhe.hasProxy({ dappHubId, proxyAddress })).toBe(false);
    console.log('  ✅ hasProxy = false after removal');
  }, 30_000);

  it('isProxyActive returns false after removeProxy', async () => {
    expect(await ownerDubhe.isProxyActive({ dappHubId, proxyAddress })).toBe(false);
    console.log('  ✅ isProxyActive = false after removal');
  }, 30_000);

  it('getProxyBinding returns null after removeProxy', async () => {
    expect(await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress })).toBeNull();
    console.log('  ✅ getProxyBinding = null after removal');
  }, 30_000);

  it('extendProxy after removal is rejected (E_PROXY_NOT_FOUND)', async () => {
    await expectTxFail(
      ownerDubhe.extendProxy({
        dappHubId,
        proxyAddress,
        newExpiresAt: Date.now() + 24 * 60 * 60 * 1000
      }),
      'extend after remove'
    );
    console.log('  ✅ extendProxy after removal rejected');
  }, 30_000);

  it('removeProxy again (double-remove) is rejected (E_PROXY_NOT_FOUND)', async () => {
    await expectTxFail(ownerDubhe.removeProxy({ dappHubId, proxyAddress }), 'double remove');
    console.log('  ✅ double-remove rejected');
  }, 30_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 10 — Re-registration after removal
  // ══════════════════════════════════════════════════════════════════════════

  it('ensure_origin returns proxy own address after binding is removed', async () => {
    const resolved = await queryEnsureOrigin(proxyAddress);
    const proxyHex = proxyAddress.replace(/^0x/, '');
    expect(resolved).toBe(proxyHex);
    console.log(`  ✅ ensure_origin after removal → ${resolved} (proxy's own address)`);
  }, 30_000);

  it('freed proxy can be re-claimed by a new owner', async () => {
    const nonOwnerAddress = nonOwnerDubhe.getAddress();
    const newExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const { publicKey, signature } = await proxyDubhe.signProxyMessage({
      ownerAddress: nonOwnerAddress,
      expiresAt: newExpiresAt
    });
    const result = (await nonOwnerDubhe.createProxy({
      dappHubId,
      publicKey,
      signature,
      expiresAt: newExpiresAt
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    const binding = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress });
    expect(binding).not.toBeNull();
    // SDK returns owner with 0x prefix
    expect(binding!.owner.toLowerCase()).toBe(nonOwnerAddress.toLowerCase());
    console.log(`  ✅ proxy re-claimed by new owner: ${nonOwnerAddress}`);
  }, 60_000);

  it('ensure_origin resolves to new owner after re-registration', async () => {
    const resolved = await queryEnsureOrigin(proxyAddress);
    const newOwnerHex = nonOwnerDubhe.getAddress().replace(/^0x/, '');
    expect(resolved).toBe(newOwnerHex);
    console.log(`  ✅ ensure_origin after re-register → ${resolved} (new owner)`);
  }, 30_000);

  it('new owner can also remove the re-claimed proxy', async () => {
    const result = (await nonOwnerDubhe.removeProxy({
      dappHubId,
      proxyAddress
    })) as SuiTransactionBlockResponse;
    expect(result.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, result.digest);

    expect(await nonOwnerDubhe.hasProxy({ dappHubId, proxyAddress })).toBe(false);
    console.log('  ✅ new owner removed the re-claimed proxy');
  }, 60_000);

  // ══════════════════════════════════════════════════════════════════════════
  // Group 11 — Multiple proxy wallets per owner
  // ══════════════════════════════════════════════════════════════════════════

  it('one owner can bind multiple proxy wallets simultaneously', async () => {
    // proxy1 = LOCALNET_TEST_KEYS[1] (proxyDubhe) — already removed above, re-register
    // proxy2 = LOCALNET_TEST_KEYS[3] — a fresh proxy wallet
    const proxy2Dubhe = new Dubhe({
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      packageId: counterPackageId,
      frameworkPackageId,
      secretKey: LOCALNET_TEST_KEYS[3]
    });
    const proxy2Address = proxy2Dubhe.getAddress();
    await fundAddress(proxy2Address);

    const exp = Date.now() + 24 * 60 * 60 * 1000;

    // Register proxy1
    const { publicKey: pk1, signature: sig1 } = await proxyDubhe.signProxyMessage({
      ownerAddress,
      expiresAt: exp
    });
    const r1 = (await ownerDubhe.createProxy({
      dappHubId,
      publicKey: pk1,
      signature: sig1,
      expiresAt: exp
    })) as SuiTransactionBlockResponse;
    expect(r1.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, r1.digest);

    // Register proxy2
    const { publicKey: pk2, signature: sig2 } = await proxy2Dubhe.signProxyMessage({
      ownerAddress,
      expiresAt: exp
    });
    const r2 = (await ownerDubhe.createProxy({
      dappHubId,
      publicKey: pk2,
      signature: sig2,
      expiresAt: exp
    })) as SuiTransactionBlockResponse;
    expect(r2.effects?.status.status).toBe('success');
    await waitForTx(ownerDubhe, r2.digest);

    // Both bindings exist and point to the same owner
    expect(await ownerDubhe.hasProxy({ dappHubId, proxyAddress })).toBe(true);
    expect(await ownerDubhe.hasProxy({ dappHubId, proxyAddress: proxy2Address })).toBe(true);
    const b1 = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress });
    const b2 = await ownerDubhe.getProxyBinding({ dappHubId, proxyAddress: proxy2Address });
    expect(b1!.owner.toLowerCase()).toBe(ownerAddress.toLowerCase());
    expect(b2!.owner.toLowerCase()).toBe(ownerAddress.toLowerCase());

    // ensure_origin resolves both proxy wallets to the same owner
    const origin1 = await queryEnsureOrigin(proxyAddress);
    const origin2 = await queryEnsureOrigin(proxy2Address);
    const ownerHex = ownerAddress.replace(/^0x/, '');
    expect(origin1).toBe(ownerHex);
    expect(origin2).toBe(ownerHex);

    // Cleanup
    const c1 = (await ownerDubhe.removeProxy({
      dappHubId,
      proxyAddress
    })) as SuiTransactionBlockResponse;
    await waitForTx(ownerDubhe, c1.digest);
    const c2 = (await ownerDubhe.removeProxy({
      dappHubId,
      proxyAddress: proxy2Address
    })) as SuiTransactionBlockResponse;
    await waitForTx(ownerDubhe, c2.digest);

    console.log(
      `  ✅ proxy1 (${proxyAddress.slice(0, 10)}…) and proxy2 (${proxy2Address.slice(
        0,
        10
      )}…) both resolve to owner`
    );
  }, 120_000);
});
