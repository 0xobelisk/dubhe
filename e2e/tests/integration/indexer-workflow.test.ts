import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execFileSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transaction } from '@mysten/sui/transactions';
import { schemaGen } from '@0xobelisk/sui-common';
import type { DubheConfig } from '@0xobelisk/sui-common';
import { Dubhe } from '@0xobelisk/sui-client';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { publishHandler } from '../../../packages/sui-cli/src/utils/publishHandler.js';
import { generateConfigJson } from '../../../packages/sui-cli/src/utils/utils.js';
import { dubheConfig as template101Config } from '../../../templates/101/sui-template/packages/contracts/dubhe.config.js';
import {
  LOCALNET_TEST_KEYS,
  setupIntegrationEnv,
  teardownIntegrationEnv,
  type IntegrationEnv
} from './setup.js';
import { setupManagedE2EServices, type ManagedE2EServices } from './services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');
const FRAMEWORK_DIR = path.resolve(REPO_ROOT, 'framework/src/dubhe');
const INDEXER_BIN = path.resolve(REPO_ROOT, 'target/debug/dubhe-indexer');
const LOCALNET_RPC = 'http://127.0.0.1:9000';
const NETWORK = 'localnet' as const;
const MIN_SESSION_DURATION_MS = 60_000;

function sqlValue(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function fundAddress(address: string): Promise<void> {
  try {
    await requestSuiFromFaucetV2({ host: getFaucetHost('localnet'), recipient: address });
  } catch {
    // Local faucet can be rate-limited or the address may already be funded.
  }
}

function createIndexerCoverageConfig(base: DubheConfig): DubheConfig {
  return {
    ...base,
    resources: {
      ...(base.resources ?? {}),
      profile: {
        fields: {
          level: 'u64',
          score: 'u64'
        }
      },
      market_item: {
        fields: {
          item_id: 'u64',
          power: 'u64'
        },
        keys: ['item_id'],
        unique: true,
        listable: true
      }
    },
    objects: {
      ...(base.objects ?? {}),
      indexer_object: {
        fields: {
          hp: 'u64'
        }
      }
    },
    permits: {
      ...(base.permits ?? {}),
      indexer_permit: {}
    },
    scenes: {
      ...(base.scenes ?? {}),
      indexer_scene: {
        fields: {
          score: 'u64'
        },
        authorization: {
          kind: 'permit',
          permit: 'indexer_permit'
        }
      }
    }
  };
}

function writeIndexerFixture(tempDir: string): void {
  const systemsDir = path.join(tempDir, 'src', 'counter', 'sources', 'systems');
  fs.mkdirSync(systemsDir, { recursive: true });
  fs.writeFileSync(
    path.join(systemsDir, 'indexer_fixture.move'),
    `module counter::indexer_fixture {
    use counter::dapp_key;
    use counter::dapp_key::DappKey;
    use counter::indexer_object;
    use counter::indexer_permit;
    use counter::indexer_scene;
    use counter::market_item;
    use counter::profile;
    use dubhe::dapp_service::{DappHub, DappStorage, Listing, ObjectStorage, ScenePermit, SceneStorage, UserStorage};
    use dubhe::dapp_system;
    use std::option;
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::transfer;

    public fun set_profile(user_storage: &mut UserStorage, level: u64, score: u64, ctx: &mut TxContext) {
        profile::set(user_storage, level, score, ctx);
    }

    public fun set_profile_level(user_storage: &mut UserStorage, level: u64, ctx: &mut TxContext) {
        profile::set_level(user_storage, level, ctx);
    }

    public fun delete_profile_score(user_storage: &mut UserStorage, ctx: &TxContext) {
        let mut key = vector::empty();
        key.push_back(b"profile");
        dapp_system::delete_field<DappKey>(dapp_key::new(), user_storage, key, b"score", ctx);
    }

    public fun set_market_item(user_storage: &mut UserStorage, item_id: u64, power: u64, ctx: &mut TxContext) {
        market_item::set(user_storage, item_id, power, ctx);
    }

    public fun list_market_item(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        item_id: u64,
        price: u64,
        ctx: &mut TxContext,
    ) {
        market_item::list<SUI>(dapp_storage, user_storage, item_id, price, option::none<u64>(), ctx);
    }

    public fun list_expired_market_item(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        item_id: u64,
        price: u64,
        ctx: &mut TxContext,
    ) {
        market_item::list<SUI>(dapp_storage, user_storage, item_id, price, option::some(0), ctx);
    }

    public fun cancel_market_item(
        listing: Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx: &TxContext,
    ) {
        market_item::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    public fun expire_market_item(
        listing: Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx: &TxContext,
    ) {
        market_item::expire_listing<SUI>(listing, user_storage, ctx);
    }

    public fun buy_market_item(
        dh: &DappHub,
        dapp_storage: &mut DappStorage,
        listing: Listing<SUI>,
        buyer_storage: &mut UserStorage,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let change = market_item::buy<SUI>(dh, dapp_storage, listing, buyer_storage, payment, ctx);
        transfer::public_transfer(change, ctx.sender());
    }

    public fun create_indexer_object(
        dapp_storage: &mut DappStorage,
        entity_id: vector<u8>,
        ctx: &mut TxContext,
    ) {
        indexer_object::create_indexer_object(dapp_storage, entity_id, ctx);
    }

    public fun set_object_hp(storage: &mut ObjectStorage<indexer_object::IndexerObject>, hp: u64) {
        indexer_object::set_hp(storage, hp);
    }

    public fun delete_object_hp(storage: &mut ObjectStorage<indexer_object::IndexerObject>) {
        let _hp = dapp_system::remove_object_field<DappKey, indexer_object::IndexerObject, u64>(
            dapp_key::new(), storage, b"hp"
        );
    }

    public fun destroy_indexer_object(
        dapp_storage: &mut DappStorage,
        storage: ObjectStorage<indexer_object::IndexerObject>,
        ctx: &TxContext,
    ) {
        indexer_object::destroy_indexer_object(dapp_storage, storage, ctx);
    }

    public fun create_active_permit(dapp_storage: &DappStorage, ctx: &mut TxContext) {
        let participants = vector[ctx.sender()];
        indexer_permit::create_indexer_permit(
            dapp_storage, participants, option::none<u64>(), option::none<u64>(), ctx
        );
    }

    public fun create_joinable_permit(dapp_storage: &DappStorage, ctx: &mut TxContext) {
        indexer_permit::create_indexer_permit(
            dapp_storage, vector::empty(), option::none<u64>(), option::none<u64>(), ctx
        );
    }

    public fun create_invite_permit(dapp_storage: &DappStorage, ctx: &mut TxContext) {
        indexer_permit::create_indexer_permit_with_invitations(
            dapp_storage,
            vector[ctx.sender()],
            option::none<u64>(),
            option::none<u64>(),
            option::none<u64>(),
            ctx,
        );
    }

    public fun create_expired_permit(dapp_storage: &DappStorage, ctx: &mut TxContext) {
        indexer_permit::create_indexer_permit(
            dapp_storage, vector::empty(), option::some(0), option::none<u64>(), ctx
        );
    }

    public fun accept_permit(permit: &mut ScenePermit<indexer_permit::IndexerPermit>, ctx: &TxContext) {
        indexer_permit::accept_indexer_permit(permit, ctx);
    }

    public fun join_permit(permit: &mut ScenePermit<indexer_permit::IndexerPermit>, ctx: &TxContext) {
        indexer_permit::join_indexer_permit(permit, ctx);
    }

    public fun leave_permit(permit: &mut ScenePermit<indexer_permit::IndexerPermit>, ctx: &TxContext) {
        indexer_permit::leave_indexer_permit(permit, ctx);
    }

    public fun expire_permit(permit: ScenePermit<indexer_permit::IndexerPermit>, ctx: &TxContext) {
        indexer_permit::expire_indexer_permit(permit, ctx);
    }

    public fun create_indexer_scene(
        dapp_storage: &DappStorage,
        permit: &ScenePermit<indexer_permit::IndexerPermit>,
        ctx: &mut TxContext,
    ) {
        indexer_scene::create_indexer_scene_with_permit(dapp_storage, permit, ctx);
    }

    public fun set_scene_score(
        permit: &ScenePermit<indexer_permit::IndexerPermit>,
        scene: &mut SceneStorage<indexer_scene::IndexerScene>,
        score: u64,
        ctx: &TxContext,
    ) {
        indexer_scene::set_score(permit, scene, score, ctx);
    }

    public fun delete_scene_score(scene: &mut SceneStorage<indexer_scene::IndexerScene>) {
        let _score = indexer_scene::remove_score_system_maintenance(scene);
    }

    public fun destroy_indexer_scene(scene: SceneStorage<indexer_scene::IndexerScene>) {
        indexer_scene::destroy_indexer_scene(scene);
    }
}
`,
    'utf-8'
  );
}

function queryPostgres(services: ManagedE2EServices, sql: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      services.postgresContainerName,
      'psql',
      '-U',
      'postgres',
      '-d',
      services.postgresDatabase,
      '-tAc',
      sql
    ],
    { encoding: 'utf-8' }
  ).trim();
}

async function waitFor(
  label: string,
  check: () => Promise<boolean>,
  timeoutMs = 90_000,
  intervalMs = 1_000
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForIndexerHealth(port: number): Promise<void> {
  await waitFor(
    'indexer health',
    async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },
    90_000
  );
}

function extractUserStorageId(result: SuiTransactionBlockResponse): string {
  const created = result.objectChanges?.find(
    (change) =>
      change.type === 'created' &&
      'objectType' in change &&
      /::dapp_service::UserStorage$/.test(change.objectType)
  );
  if (!created || !('objectId' in created)) {
    throw new Error('UserStorage not found in transaction object changes');
  }
  return created.objectId;
}

function extractCreatedObjectId(
  result: SuiTransactionBlockResponse,
  objectTypePattern: RegExp
): string {
  const created = result.objectChanges?.find(
    (change) =>
      change.type === 'created' &&
      'objectType' in change &&
      objectTypePattern.test(change.objectType)
  );
  if (!created || !('objectId' in created)) {
    throw new Error(`Object not found in transaction changes: ${objectTypePattern}`);
  }
  return created.objectId;
}

function bytesArg(tx: Transaction, value: string) {
  return tx.pure.vector('u8', Array.from(new TextEncoder().encode(value)));
}

async function callInc(
  dubhe: Dubhe,
  counterPackageId: string,
  userStorageId: string
): Promise<SuiTransactionBlockResponse> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${counterPackageId}::counter_system::inc`,
    arguments: [tx.object(userStorageId)]
  });
  return dubhe.signAndSendTxn({ tx }) as Promise<SuiTransactionBlockResponse>;
}

async function callFixture(
  dubhe: Dubhe,
  counterPackageId: string,
  functionName: string,
  buildArgs: (tx: Transaction) => any[] = () => []
): Promise<SuiTransactionBlockResponse> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${counterPackageId}::indexer_fixture::${functionName}`,
    arguments: buildArgs(tx)
  });
  return dubhe.signAndSendTxn({ tx }) as Promise<SuiTransactionBlockResponse>;
}

function stopProcess(child: ChildProcess | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && !child.killed) child.kill('SIGKILL');
      resolve();
    }, 5_000).unref();
  });
}

const autoServices = process.env.DUBHE_E2E_AUTO_SERVICES === '1';
const canRun = autoServices && fs.existsSync(INDEXER_BIN);

describe.skipIf(!canRun)('Integration: indexer localnet smoke', () => {
  let services: ManagedE2EServices;
  let env: IntegrationEnv;
  let indexer: ChildProcess | undefined;
  let counterPackageId: string;
  let frameworkPackageId: string;
  let dappHubId: string;
  let dappStorageId: string;
  let adminDubhe: Dubhe;
  let ownerDubhe: Dubhe;
  let buyerDubhe: Dubhe;
  let sessionAddress: string;
  let ownerAddress: string;
  let ownerUserStorageId: string;
  let buyerUserStorageId: string;
  let indexerLogPath: string;
  let stoppingIndexer = false;

  beforeAll(async () => {
    services = await setupManagedE2EServices({
      localnet: true,
      postgres: true,
      forceLocalnet: true
    });

    env = await setupIntegrationEnv(NETWORK);

    const tempDubheSourcesDir = path.join(env.tempDir, 'src', 'dubhe', 'sources');
    fs.rmSync(tempDubheSourcesDir, { recursive: true, force: true });
    fs.cpSync(path.join(FRAMEWORK_DIR, 'sources'), tempDubheSourcesDir, { recursive: true });

    const indexerConfig = createIndexerCoverageConfig(template101Config);

    await schemaGen(env.tempDir, indexerConfig);
    writeIndexerFixture(env.tempDir);
    fs.writeFileSync(
      path.join(env.tempDir, 'dubhe.config.json'),
      generateConfigJson(indexerConfig)
    );

    await publishHandler(indexerConfig, NETWORK, false);

    const counterData = JSON.parse(
      fs.readFileSync(
        path.join(env.tempDir, 'src', 'counter', '.history', 'sui_localnet', 'latest.json'),
        'utf-8'
      )
    ) as Record<string, unknown>;
    const dubheData = JSON.parse(
      fs.readFileSync(
        path.join(env.tempDir, 'src', 'dubhe', '.history', 'sui_localnet', 'latest.json'),
        'utf-8'
      )
    ) as Record<string, unknown>;

    counterPackageId = counterData.packageId as string;
    dappHubId = dubheData.dappHubId as string;
    dappStorageId = counterData.dappStorageId as string;
    frameworkPackageId = dubheData.packageId as string;

    const indexerPort = 18080;
    indexerLogPath = path.join(env.tempDir, 'indexer.log');
    const indexerLog = fs.openSync(indexerLogPath, 'a');
    indexer = spawn(
      INDEXER_BIN,
      [
        '--config-json',
        path.join(env.tempDir, 'dubhe.config.json'),
        '--database-url',
        services.databaseUrl,
        '--checkpoint-url',
        services.checkpointUrl,
        '--port',
        String(indexerPort),
        '--grpc-port',
        '18085',
        '--graphql-port',
        '18089',
        '--force'
      ],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, RUST_LOG: 'info' },
        stdio: ['ignore', indexerLog, indexerLog]
      }
    );

    indexer.once('exit', (code, signal) => {
      if (!stoppingIndexer) {
        console.warn(`dubhe-indexer exited before test finished: code=${code} signal=${signal}`);
      }
    });

    try {
      await waitForIndexerHealth(indexerPort);
    } catch (error) {
      const log = fs.existsSync(indexerLogPath) ? fs.readFileSync(indexerLogPath, 'utf-8') : '';
      console.error(`\n--- dubhe-indexer log (${indexerLogPath}) ---\n${log.slice(-8000)}`);
      throw error;
    }

    ownerDubhe = new Dubhe({
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      secretKey: LOCALNET_TEST_KEYS[0],
      packageId: counterPackageId,
      frameworkPackageId,
      dappStorageId
    });
    adminDubhe = new Dubhe({
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      secretKey: env.privateKey,
      packageId: counterPackageId,
      frameworkPackageId,
      dappStorageId
    });
    buyerDubhe = new Dubhe({
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      secretKey: LOCALNET_TEST_KEYS[1],
      packageId: counterPackageId,
      frameworkPackageId,
      dappStorageId
    });
    ownerAddress = ownerDubhe.getAddress();
    sessionAddress = new Dubhe({
      networkType: NETWORK,
      fullnodeUrls: [LOCALNET_RPC],
      secretKey: LOCALNET_TEST_KEYS[2],
      packageId: counterPackageId,
      frameworkPackageId,
      dappStorageId
    }).getAddress();
    await Promise.all([
      fundAddress(ownerAddress),
      fundAddress(buyerDubhe.getAddress()),
      fundAddress(adminDubhe.getAddress())
    ]);
  }, 300_000);

  afterAll(async () => {
    stoppingIndexer = true;
    await stopProcess(indexer);
    if (env) await teardownIntegrationEnv(env);
    await services?.teardown();
  }, 60_000);

  it('indexes all supported event families from real contract calls', async () => {
    const initResult = (await ownerDubhe.initUserStorage({
      dappHubId,
      dappStorageId
    })) as SuiTransactionBlockResponse;
    expect(initResult.effects?.status.status).toBe('success');
    ownerUserStorageId = extractUserStorageId(initResult);
    await ownerDubhe.waitForTransaction(initResult.digest);

    const buyerInitResult = (await buyerDubhe.initUserStorage({
      dappHubId,
      dappStorageId
    })) as SuiTransactionBlockResponse;
    expect(buyerInitResult.effects?.status.status).toBe('success');
    buyerUserStorageId = extractUserStorageId(buyerInitResult);
    await buyerDubhe.waitForTransaction(buyerInitResult.digest);

    const incResult = await callInc(ownerDubhe, counterPackageId, ownerUserStorageId);
    expect(incResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(incResult.digest);

    const profileResult = await callFixture(ownerDubhe, counterPackageId, 'set_profile', (tx) => [
      tx.object(ownerUserStorageId),
      tx.pure.u64(1),
      tx.pure.u64(100)
    ]);
    expect(profileResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(profileResult.digest);

    const profileFieldResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'set_profile_level',
      (tx) => [tx.object(ownerUserStorageId), tx.pure.u64(2)]
    );
    expect(profileFieldResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(profileFieldResult.digest);

    const profileDeleteFieldResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'delete_profile_score',
      (tx) => [tx.object(ownerUserStorageId)]
    );
    expect(profileDeleteFieldResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(profileDeleteFieldResult.digest);

    const objectCreateResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'create_indexer_object',
      (tx) => [tx.object(dappStorageId), bytesArg(tx, 'object-1')]
    );
    expect(objectCreateResult.effects?.status.status).toBe('success');
    const objectStorageId = extractCreatedObjectId(
      objectCreateResult,
      /::dapp_service::ObjectStorage<.*::indexer_object::IndexerObject>/
    );
    await ownerDubhe.waitForTransaction(objectCreateResult.digest);

    const objectSetResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'set_object_hp',
      (tx) => [tx.object(objectStorageId), tx.pure.u64(500)]
    );
    expect(objectSetResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(objectSetResult.digest);

    const objectDeleteFieldResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'delete_object_hp',
      (tx) => [tx.object(objectStorageId)]
    );
    expect(objectDeleteFieldResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(objectDeleteFieldResult.digest);

    const objectDestroyResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'destroy_indexer_object',
      (tx) => [tx.object(dappStorageId), tx.object(objectStorageId)]
    );
    expect(objectDestroyResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(objectDestroyResult.digest);

    const activePermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'create_active_permit',
      (tx) => [tx.object(dappStorageId)]
    );
    expect(activePermitResult.effects?.status.status).toBe('success');
    const activePermitId = extractCreatedObjectId(
      activePermitResult,
      /::dapp_service::ScenePermit<.*::indexer_permit::IndexerPermit>/
    );
    await ownerDubhe.waitForTransaction(activePermitResult.digest);

    const sceneCreateResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'create_indexer_scene',
      (tx) => [tx.object(dappStorageId), tx.object(activePermitId)]
    );
    expect(sceneCreateResult.effects?.status.status).toBe('success');
    const sceneStorageId = extractCreatedObjectId(
      sceneCreateResult,
      /::dapp_service::SceneStorage<.*::indexer_scene::IndexerScene>/
    );
    await ownerDubhe.waitForTransaction(sceneCreateResult.digest);

    const sceneSetResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'set_scene_score',
      (tx) => [tx.object(activePermitId), tx.object(sceneStorageId), tx.pure.u64(900)]
    );
    expect(sceneSetResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(sceneSetResult.digest);

    const sceneDeleteFieldResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'delete_scene_score',
      (tx) => [tx.object(sceneStorageId)]
    );
    expect(sceneDeleteFieldResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(sceneDeleteFieldResult.digest);

    const sceneDestroyResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'destroy_indexer_scene',
      (tx) => [tx.object(sceneStorageId)]
    );
    expect(sceneDestroyResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(sceneDestroyResult.digest);

    const joinablePermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'create_joinable_permit',
      (tx) => [tx.object(dappStorageId)]
    );
    const joinablePermitId = extractCreatedObjectId(
      joinablePermitResult,
      /::dapp_service::ScenePermit<.*::indexer_permit::IndexerPermit>/
    );
    await ownerDubhe.waitForTransaction(joinablePermitResult.digest);

    const joinPermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'join_permit',
      (tx) => [tx.object(joinablePermitId)]
    );
    expect(joinPermitResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(joinPermitResult.digest);

    const leavePermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'leave_permit',
      (tx) => [tx.object(joinablePermitId)]
    );
    expect(leavePermitResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(leavePermitResult.digest);

    const invitePermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'create_invite_permit',
      (tx) => [tx.object(dappStorageId)]
    );
    const invitePermitId = extractCreatedObjectId(
      invitePermitResult,
      /::dapp_service::ScenePermit<.*::indexer_permit::IndexerPermit>/
    );
    await ownerDubhe.waitForTransaction(invitePermitResult.digest);

    const acceptPermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'accept_permit',
      (tx) => [tx.object(invitePermitId)]
    );
    expect(acceptPermitResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(acceptPermitResult.digest);

    const expiredPermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'create_expired_permit',
      (tx) => [tx.object(dappStorageId)]
    );
    const expiredPermitId = extractCreatedObjectId(
      expiredPermitResult,
      /::dapp_service::ScenePermit<.*::indexer_permit::IndexerPermit>/
    );
    await ownerDubhe.waitForTransaction(expiredPermitResult.digest);

    const expirePermitResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'expire_permit',
      (tx) => [tx.object(expiredPermitId)]
    );
    expect(expirePermitResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(expirePermitResult.digest);

    const sessionResult = (await ownerDubhe.activateSession({
      dappHubId,
      userStorageId: ownerUserStorageId,
      sessionWallet: sessionAddress,
      durationMs: MIN_SESSION_DURATION_MS
    })) as SuiTransactionBlockResponse;
    expect(sessionResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(sessionResult.digest);

    const deactivateSessionResult = (await ownerDubhe.deactivateSession({
      dappHubId,
      userStorageId: ownerUserStorageId
    })) as SuiTransactionBlockResponse;
    expect(deactivateSessionResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(deactivateSessionResult.digest);

    const pauseTx = new Transaction();
    pauseTx.moveCall({
      target: `${counterPackageId}::indexer_fixture::set_market_item`,
      arguments: [pauseTx.object(ownerUserStorageId), pauseTx.pure.u64(11), pauseTx.pure.u64(110)]
    });
    const pausePrep = (await ownerDubhe.signAndSendTxn({
      tx: pauseTx
    })) as SuiTransactionBlockResponse;
    expect(pausePrep.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(pausePrep.digest);

    const ownerSecondItemResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'set_market_item',
      (tx) => [tx.object(ownerUserStorageId), tx.pure.u64(12), tx.pure.u64(120)]
    );
    expect(ownerSecondItemResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(ownerSecondItemResult.digest);

    const buyerItemResult = await callFixture(
      buyerDubhe,
      counterPackageId,
      'set_market_item',
      (tx) => [tx.object(buyerUserStorageId), tx.pure.u64(21), tx.pure.u64(210)]
    );
    expect(buyerItemResult.effects?.status.status).toBe('success');
    await buyerDubhe.waitForTransaction(buyerItemResult.digest);

    const listCancelResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'list_market_item',
      (tx) => [
        tx.object(dappStorageId),
        tx.object(ownerUserStorageId),
        tx.pure.u64(11),
        tx.pure.u64(100)
      ]
    );
    expect(listCancelResult.effects?.status.status).toBe('success');
    const cancelListingId = extractCreatedObjectId(
      listCancelResult,
      /::dapp_service::Listing<.*SUI>/
    );
    await ownerDubhe.waitForTransaction(listCancelResult.digest);

    const cancelListingResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'cancel_market_item',
      (tx) => [tx.object(cancelListingId), tx.object(ownerUserStorageId)]
    );
    expect(cancelListingResult.effects?.status.status).toBe('success');
    await ownerDubhe.waitForTransaction(cancelListingResult.digest);

    const listBuyResult = await callFixture(
      ownerDubhe,
      counterPackageId,
      'list_market_item',
      (tx) => [
        tx.object(dappStorageId),
        tx.object(ownerUserStorageId),
        tx.pure.u64(12),
        tx.pure.u64(100)
      ]
    );
    expect(listBuyResult.effects?.status.status).toBe('success');
    const soldListingId = extractCreatedObjectId(listBuyResult, /::dapp_service::Listing<.*SUI>/);
    await ownerDubhe.waitForTransaction(listBuyResult.digest);

    const buyTx = new Transaction();
    const [payment] = buyTx.splitCoins(buyTx.gas, [buyTx.pure.u64(100)]);
    buyTx.moveCall({
      target: `${counterPackageId}::indexer_fixture::buy_market_item`,
      arguments: [
        buyTx.object(dappHubId),
        buyTx.object(dappStorageId),
        buyTx.object(soldListingId),
        buyTx.object(buyerUserStorageId),
        payment
      ]
    });
    const buyResult = (await buyerDubhe.signAndSendTxn({
      tx: buyTx
    })) as SuiTransactionBlockResponse;
    expect(buyResult.effects?.status.status).toBe('success');
    await buyerDubhe.waitForTransaction(buyResult.digest);

    const settlementModeTx = new Transaction();
    settlementModeTx.moveCall({
      target: `${frameworkPackageId}::dapp_system::set_dapp_settlement_config`,
      typeArguments: [`${counterPackageId}::dapp_key::DappKey`],
      arguments: [
        settlementModeTx.object(dappHubId),
        settlementModeTx.object(dappStorageId),
        settlementModeTx.pure.u8(0)
      ]
    });
    const settlementModeResult = (await adminDubhe.signAndSendTxn({
      tx: settlementModeTx
    })) as SuiTransactionBlockResponse;
    expect(settlementModeResult.effects?.status.status).toBe('success');
    await adminDubhe.waitForTransaction(settlementModeResult.digest);

    const pauseDappTx = new Transaction();
    pauseDappTx.moveCall({
      target: `${frameworkPackageId}::dapp_system::set_paused`,
      typeArguments: [`${counterPackageId}::dapp_key::DappKey`],
      arguments: [
        pauseDappTx.object(dappHubId),
        pauseDappTx.object(dappStorageId),
        pauseDappTx.pure.bool(true)
      ]
    });
    const pauseDappResult = (await adminDubhe.signAndSendTxn({
      tx: pauseDappTx
    })) as SuiTransactionBlockResponse;
    expect(pauseDappResult.effects?.status.status).toBe('success');
    await adminDubhe.waitForTransaction(pauseDappResult.digest);

    await waitFor('schema metadata rows', async () => {
      const count = Number(queryPostgres(services, 'SELECT COUNT(*) FROM storage_schemas;'));
      return count > 0;
    });

    await waitFor('UserStorage index row', async () => {
      const count = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM user_storages WHERE user_storage_id = ${sqlValue(
            ownerUserStorageId
          )};`
        )
      );
      return count === 1;
    });

    await waitFor('resource store row', async () => {
      const count = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM store_value WHERE entity_id = ${sqlValue(
            ownerAddress.toLowerCase()
          )} AND value = 1;`
        )
      );
      return count === 1;
    });

    await waitFor('profile store set field and delete field', async () => {
      const row = queryPostgres(
        services,
        `SELECT level, score IS NULL FROM store_profile LIMIT 1;`
      );
      return row === '2|t';
    });

    await waitFor('object storage lifecycle and field tombstone', async () => {
      const objectRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM object_storages WHERE object_id = ${sqlValue(
            objectStorageId
          )} AND is_destroyed = TRUE;`
        )
      );
      const fieldRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM object_storage_fields WHERE object_id = ${sqlValue(
            objectStorageId
          )} AND field_name = 'hp' AND is_deleted = TRUE;`
        )
      );
      return objectRows === 1 && fieldRows === 1;
    });

    await waitFor('scene storage lifecycle and field tombstone', async () => {
      const sceneRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM scene_storages WHERE scene_id = ${sqlValue(
            sceneStorageId
          )} AND authorized_permit_id = ${sqlValue(activePermitId)} AND is_destroyed = TRUE;`
        )
      );
      const fieldRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM scene_storage_fields WHERE scene_id = ${sqlValue(
            sceneStorageId
          )} AND field_name = 'score' AND is_deleted = TRUE;`
        )
      );
      return sceneRows === 1 && fieldRows === 1;
    });

    await waitFor('scene permit lifecycle and participant actions', async () => {
      const expiredRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM scene_permits WHERE permit_id = ${sqlValue(
            expiredPermitId
          )} AND expired = TRUE;`
        )
      );
      const joinLeaveRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM scene_permit_participants WHERE permit_id = ${sqlValue(
            joinablePermitId
          )} AND participant = ${sqlValue(
            ownerAddress.toLowerCase()
          )} AND active = FALSE AND last_action = 'leave';`
        )
      );
      const acceptRows = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM scene_permit_participants WHERE permit_id = ${sqlValue(
            invitePermitId
          )} AND participant = ${sqlValue(
            ownerAddress.toLowerCase()
          )} AND active = TRUE AND last_action = 'accept';`
        )
      );
      return expiredRows === 1 && joinLeaveRows === 1 && acceptRows === 1;
    });

    await waitFor('marketplace listing statuses', async () => {
      const statuses = queryPostgres(
        services,
        `SELECT listing_id || ':' || status FROM marketplace_listings WHERE listing_id IN (${[
          cancelListingId,
          soldListingId
        ]
          .map(sqlValue)
          .join(',')}) ORDER BY listing_id;`
      );
      return (
        statuses.includes(`${cancelListingId}:cancelled`) &&
        statuses.includes(`${soldListingId}:sold`)
      );
    });

    await waitFor('session lifecycle index row', async () => {
      const count = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM sessions WHERE canonical = ${sqlValue(
            ownerAddress.toLowerCase()
          )} AND session_wallet = ${sqlValue(sessionAddress.toLowerCase())} AND active = FALSE;`
        )
      );
      return count === 1;
    });

    await waitFor('runtime state row from DappCreated and admin events', async () => {
      const count = Number(
        queryPostgres(
          services,
          `SELECT COUNT(*) FROM dapp_runtime_state WHERE dapp_storage_id = ${sqlValue(
            dappStorageId
          )} AND paused = TRUE AND settlement_mode = 0 AND last_runtime_event = 'SettlementModeChanged';`
        )
      );
      return count === 1;
    });

    const schemaHash = queryPostgres(
      services,
      'SELECT dapp_schema_hash FROM indexer_schema_state WHERE id = 1;'
    );
    expect(schemaHash).toMatch(/^[0-9a-f]+$/);
  }, 300_000);
});
