/**
 * Citizen wallet lifecycle. The runner manages several independent player
 * wallets (cross-player social actions require at least two), each going
 * through the same onboarding a human player would:
 *
 *   faucet → init UserStorage → register → mint agents → activate session key
 *
 * All game actions afterwards are signed by the ephemeral session key; the
 * main wallet key only signs onboarding and session activation. Keys are
 * persisted in .citizens.json so restarts reuse the same town population.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Dubhe, Ed25519Keypair, Transaction } from '@0xobelisk/sui-client';
import {
  AGENTS_PER_CITIZEN,
  CLOCK_ID,
  RUNNER_DIR,
  SESSION_DURATION_MS,
  type Deployment
} from './config.ts';
import type { Perception } from './perception.ts';
import type { AgentRow, Citizen } from './types.ts';

const KEYS_FILE = path.join(RUNNER_DIR, '.citizens.json');
const MIN_GAS_BALANCE = 500_000_000n; // 0.5 SUI
const SESSION_RENEW_MARGIN_MS = 5 * 60 * 1000;

interface StoredCitizen {
  address: string;
  secretKey: string; // bech32 suiprivkey
  /** Cached because getUserStorageId relies on the fullnode tx index,
   *  which localnet prunes after a few hours. */
  userStorageId?: string;
  session?: { address: string; secretKey: string; expiresAt: number };
}

/** Settle once a user's unsettled write count crosses this (chain max: 2000). */
const SETTLE_THRESHOLD = 800;
/** USER_PAYS mode: upper bound for one inline settlement payment (refunded if over). */
const MAX_SETTLE_PAYMENT = 1_000_000_000n; // 1 SUI
/** DAPP_PAYS mode: top up the credit pool when it drops below this. */
const MIN_CREDIT_POOL = 1_000_000_000n; // 1 SUI worth
const CREDIT_RECHARGE_AMOUNT = 50_000_000_000n; // 50 SUI

const NAMES = [
  'Alice', 'Bob', 'Clara', 'Dorian', 'Elke', 'Felix',
  'Greta', 'Hugo', 'Iris', 'Jasper', 'Kira', 'Louis'
];

// Personality prompts are public on-chain state and double as LLM prompts in v2.
const PERSONALITIES = [
  'Cheerful and talkative, loves gossip and treating friends to coffee.',
  'Quiet workaholic who saves every coin and secretly dreams of being mayor.',
  'Adventurous romantic, always by the water, tells tall tales about the sea.',
  'Meticulous craftsman, proud of quality work, grumpy before breakfast.',
  'Generous soul who gives away most of what they make.',
  'Ambitious social climber, always at the town hall when politics stir.'
];

const OCCUPATIONS = [1, 2, 3, 4]; // Farmer, Barista, Fisher, Artisan

export interface CitizenManagerEnv {
  deployment: Deployment;
  metadata: any;
  buildings: Record<string, string>;
  perception: Perception;
}

export class CitizenManager {
  private storageCache = new Map<string, string>();
  /** 0 = DAPP_PAYS (credit pool), 1 = USER_PAYS (inline coin). Read at bootstrap. */
  private settlementMode = 0;
  private stored: StoredCitizen[] = [];

  constructor(private env: CitizenManagerEnv) {}

  /** Load persisted wallets (creating new ones as needed) and fully onboard each. */
  async bootstrap(count: number): Promise<Citizen[]> {
    const stored = this.loadKeys();
    this.stored = stored;
    while (stored.length < count) {
      const kp = Ed25519Keypair.generate();
      stored.push({ address: kp.getPublicKey().toSuiAddress(), secretKey: kp.getSecretKey() });
    }
    this.saveKeys(stored);

    const worldPermitId = await this.env.perception.worldPermitId();
    const citizens: Citizen[] = [];
    for (let i = 0; i < count; i++) {
      citizens.push(await this.onboard(i, stored[i], worldPermitId, stored));
    }

    // Settlement mode decides who pays write fees: 0 = the DApp's credit
    // pool (keep it funded), 1 = each user pays inline at settlement time.
    const dappFields = await citizens[0].main.getDappStorageFields(this.env.deployment.dappStorageId);
    this.settlementMode = dappFields.settlement_mode;
    if (this.settlementMode === 0) await this.ensureDappCredit(citizens[0], dappFields.credit_pool);
    return citizens;
  }

  /**
   * Settle a citizen's accumulated write debt before it hits the on-chain
   * MAX_UNSETTLED_WRITES limit (2000), after which every write aborts.
   * Called periodically from the main loop.
   */
  async settleIfNeeded(citizen: Citizen): Promise<void> {
    const fields = await citizen.main.getUserStorageFields(citizen.userStorageId);
    const unsettled = Number(fields.unsettled_count ?? 0);
    if (unsettled < SETTLE_THRESHOLD) return;

    // Settlement gas + inline payment come from the main wallet.
    await this.ensureGas(citizen.main, citizen.address, `[citizen${citizen.index}]`);

    let digest: string;
    if (this.settlementMode === 1) {
      // USER_PAYS: pay inline from gas; the framework refunds any overpayment.
      const tx = new Transaction();
      citizen.main.buildSettleWritesUserPaysTx(tx, {
        dappHubId: this.env.deployment.dappHubId,
        dappStorageId: this.env.deployment.dappStorageId,
        userStorageId: citizen.userStorageId,
        maxPaymentMist: MAX_SETTLE_PAYMENT
      });
      const result = await citizen.main.signAndSendTxn({ tx });
      await citizen.main.waitForTransaction(result.digest);
      digest = result.digest;
    } else {
      // DAPP_PAYS: free for the user, drawn from the DApp credit pool.
      const result = await citizen.main.settleWrites({
        dappHubId: this.env.deployment.dappHubId,
        dappStorageId: this.env.deployment.dappStorageId,
        userStorageId: citizen.userStorageId
      });
      await citizen.main.waitForTransaction(result.digest);
      digest = result.digest;
    }
    console.log(`[citizen${citizen.index}] settled ${unsettled} writes (${digest.slice(0, 10)})`);
  }

  /** DAPP_PAYS only: recharge the credit pool that settlement draws on. */
  private async ensureDappCredit(payer: Citizen, pool: bigint): Promise<void> {
    if (pool >= MIN_CREDIT_POOL) return;

    await this.ensureGas(payer.main, payer.address, `[citizen${payer.index}]`);
    const fwPkg = this.env.deployment.frameworkPackageId!;
    const dappKeyType = this.env.deployment.dappKey.startsWith('0x')
      ? this.env.deployment.dappKey
      : `0x${this.env.deployment.dappKey}`;
    const tx = new Transaction();
    const [payment] = tx.splitCoins(tx.gas, [CREDIT_RECHARGE_AMOUNT]);
    tx.moveCall({
      target: `${fwPkg}::dapp_system::recharge_credit`,
      typeArguments: [dappKeyType, '0x2::sui::SUI'],
      arguments: [
        tx.object(this.env.deployment.dappHubId),
        tx.object(this.env.deployment.dappStorageId),
        payment
      ]
    });
    await this.send(payer.main, tx);
    console.log(
      `[citizen${payer.index}] recharged DApp credit pool (+${CREDIT_RECHARGE_AMOUNT} units, was ${pool})`
    );
  }

  /** Resolve (and cache) any player's UserStorage ObjectID. */
  async resolveStorage(owner: string): Promise<string> {
    const cached = this.storageCache.get(owner);
    if (cached) return cached;
    // Indexer first (robust); the tx-index scan only as fallback, since
    // localnet prunes old transactions.
    let id: string | null = null;
    try {
      const res = await this.env.perception.client.getDubheUserStorages({
        dappKey: this.env.deployment.dappKey,
        canonicalOwner: owner,
        first: 1
      });
      id = res.edges?.[0]?.node?.userStorageId ?? null;
    } catch {
      // fall through to the RPC scan
    }
    if (!id) id = await this.makeDubhe(undefined).getUserStorageId(owner);
    if (!id) throw new Error(`No UserStorage found for ${owner}`);
    this.storageCache.set(owner, id);
    return id;
  }

  // ─── Onboarding steps ──────────────────────────────────────────────────────

  private async onboard(
    index: number,
    keys: StoredCitizen,
    worldPermitId: string,
    allKeys: StoredCitizen[]
  ): Promise<Citizen> {
    const main = this.makeDubhe(keys.secretKey);
    const tag = `[citizen${index} ${short(keys.address)}]`;

    await this.ensureGas(main, keys.address, tag);

    // UserStorage (idempotent: only created once per address per DApp).
    // Resolution order: persisted id → indexer → fullnode tx-index scan
    // (localnet prunes old transactions, so the scan alone is unreliable).
    let userStorageId =
      keys.userStorageId ?? (await this.resolveStorage(keys.address).catch(() => null));
    if (!userStorageId) {
      console.log(`${tag} creating UserStorage...`);
      const result = await main.initUserStorage({
        dappHubId: this.env.deployment.dappHubId,
        dappStorageId: this.env.deployment.dappStorageId
      });
      await main.waitForTransaction(result.digest);
      // getUserStorageId reads the fullnode's tx index, which lags one
      // checkpoint behind execution — poll briefly.
      for (let i = 0; i < 15 && !userStorageId; i++) {
        await sleep(1000);
        userStorageId = await main.getUserStorageId(keys.address);
      }
      if (!userStorageId) throw new Error(`${tag} UserStorage creation failed`);
    }
    keys.userStorageId = userStorageId;
    this.storageCache.set(keys.address, userStorageId);

    // Registration grants starting gold and joins the world permit.
    if (!(await this.env.perception.hasRegistered(keys.address))) {
      console.log(`${tag} registering...`);
      try {
        const tx = new Transaction();
        await main.tx.world_system.register({
          tx,
          params: [
            tx.object(this.env.deployment.dappStorageId),
            tx.object(userStorageId),
            tx.object(worldPermitId)
          ]
        });
        await this.send(main, tx);
      } catch (e) {
        // Tolerate already_registered aborts when the indexer lags behind.
        console.log(`${tag} register skipped: ${trim(e)}`);
      }
    }

    // Mint agents up to the configured population.
    let agents = await this.env.perception.agentsOf(keys.address);
    for (let n = agents.length; n < AGENTS_PER_CITIZEN; n++) {
      const nameIdx = (index * AGENTS_PER_CITIZEN + n) % NAMES.length;
      const name = NAMES[nameIdx];
      const personality = PERSONALITIES[nameIdx % PERSONALITIES.length];
      const occupation = OCCUPATIONS[nameIdx % OCCUPATIONS.length];
      console.log(`${tag} minting agent ${name} (occupation ${occupation})...`);
      const tx = new Transaction();
      await main.tx.agent_system.mint_agent({
        tx,
        params: [
          tx.object(this.env.deployment.dappStorageId),
          tx.object(userStorageId),
          tx.object(this.env.buildings['town_hall']),
          tx.pure.string(name),
          tx.pure.string(personality),
          tx.pure.u8(occupation),
          tx.object(CLOCK_ID)
        ]
      });
      await this.send(main, tx);
    }
    agents = await this.waitForAgents(keys.address, AGENTS_PER_CITIZEN, tag);

    // Session key: reuse a valid one, otherwise activate a fresh keypair.
    const session = await this.ensureSession(main, keys, userStorageId, tag);
    this.saveKeys(allKeys);

    console.log(
      `${tag} ready — agents: ${agents.map((a) => a.name).join(', ')}; session ${short(session.getAddress())}`
    );
    return {
      index,
      address: keys.address,
      main,
      session,
      sessionExpiresAt: keys.session!.expiresAt,
      userStorageId,
      agents
    };
  }

  /** Re-activate the session key before it expires (long-running loops). */
  async renewSessionIfNeeded(citizen: Citizen): Promise<void> {
    if (Date.now() < citizen.sessionExpiresAt - SESSION_RENEW_MARGIN_MS) return;
    const keys = this.stored[citizen.index];
    keys.session = undefined; // force a fresh activation
    citizen.session = await this.ensureSession(
      citizen.main,
      keys,
      citizen.userStorageId,
      `[citizen${citizen.index}]`
    );
    citizen.sessionExpiresAt = keys.session!.expiresAt;
    this.saveKeys(this.stored);
  }

  private async ensureSession(
    main: Dubhe,
    keys: StoredCitizen,
    userStorageId: string,
    tag: string
  ): Promise<Dubhe> {
    const now = Date.now();
    if (!keys.session || keys.session.expiresAt < now + SESSION_RENEW_MARGIN_MS) {
      const kp = Ed25519Keypair.generate();
      const sessionAddress = kp.getPublicKey().toSuiAddress();
      console.log(`${tag} activating session key ${short(sessionAddress)}...`);
      await main.activateSession({
        userStorageId,
        sessionWallet: sessionAddress,
        durationMs: SESSION_DURATION_MS
      });
      keys.session = {
        address: sessionAddress,
        secretKey: kp.getSecretKey(),
        expiresAt: now + SESSION_DURATION_MS
      };
    }
    const session = this.makeDubhe(keys.session.secretKey);
    // The session wallet pays gas for silently-signed actions.
    await this.ensureGas(session, keys.session.address, `${tag}(session)`);
    return session;
  }

  private async ensureGas(dubhe: Dubhe, address: string, tag: string): Promise<void> {
    const balance = await dubhe.getBalance().catch(() => ({ totalBalance: '0' }));
    if (BigInt(balance.totalBalance) < MIN_GAS_BALANCE) {
      console.log(`${tag} requesting faucet gas...`);
      await dubhe.requestFaucet(address, this.env.deployment.network as any);
      await sleep(1500);
    }
  }

  /** Poll the indexer until freshly minted agents are visible. */
  private async waitForAgents(owner: string, expected: number, tag: string): Promise<AgentRow[]> {
    for (let attempt = 0; attempt < 30; attempt++) {
      const agents = await this.env.perception.agentsOf(owner);
      if (agents.length >= expected) return agents;
      if (attempt === 0) console.log(`${tag} waiting for the indexer to catch up...`);
      await sleep(1000);
    }
    throw new Error(`${tag} indexer never showed ${expected} agents`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private makeDubhe(secretKey: string | undefined): Dubhe {
    return new Dubhe({
      networkType: this.env.deployment.network as any,
      packageId: this.env.deployment.packageId,
      dappKey: this.env.deployment.dappKey,
      dappHubId: this.env.deployment.dappHubId,
      metadata: this.env.metadata,
      secretKey,
      frameworkPackageId: this.env.deployment.frameworkPackageId,
      dappStorageId: this.env.deployment.dappStorageId
    });
  }

  private async send(dubhe: Dubhe, tx: Transaction): Promise<void> {
    const result = await dubhe.signAndSendTxn({ tx });
    await dubhe.waitForTransaction(result.digest);
  }

  private loadKeys(): StoredCitizen[] {
    if (!fs.existsSync(KEYS_FILE)) return [];
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8')).citizens ?? [];
  }

  private saveKeys(citizens: StoredCitizen[]): void {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({ citizens }, null, 2));
  }
}

function short(addr: string): string {
  return addr.slice(0, 8);
}

function trim(e: unknown): string {
  return String(e instanceof Error ? e.message : e).slice(0, 140);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
