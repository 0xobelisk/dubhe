/**
 * Action executor: turns brain decisions into on-chain transactions, signed
 * by the citizen's session key. Parameter order mirrors the Move entry
 * function signatures exactly (the SDK does not auto-inject parameters).
 */
import { Transaction, type Dubhe } from '@0xobelisk/sui-client';
import { CLOCK_ID, KIND_TO_KEY, POS_SCALE, RANDOM_ID, pickSpot } from './config.ts';
import type { Action, AgentRow, Citizen } from './types.ts';

export interface ExecutorEnv {
  dappStorageId: string;
  /** buildings.json key → shared ObjectID. */
  buildings: Record<string, string>;
  worldPermitId: string;
  /** Resolve (and cache) another player's UserStorage ObjectID. */
  resolveStorage: (owner: string) => Promise<string>;
}

export class ActionExecutor {
  constructor(private env: ExecutorEnv) {}

  /** Submit one action for one agent. Returns the transaction digest. */
  async submit(citizen: Citizen, agent: AgentRow, action: Action): Promise<string> {
    const signer = citizen.session;
    const tx = new Transaction();
    const dapp = () => tx.object(this.env.dappStorageId);
    const us = () => tx.object(citizen.userStorageId);
    const clock = () => tx.object(CLOCK_ID);

    switch (action.kind) {
      case 'sleep':
        await signer.tx.life_system.sleep({
          tx,
          params: [dapp(), us(), tx.pure.address(agent.agentId), clock()]
        });
        break;

      case 'eat':
        await signer.tx.life_system.eat({
          tx,
          params: [
            dapp(),
            us(),
            tx.object(this.buildingId(action.locationKind)),
            tx.pure.address(agent.agentId),
            clock()
          ]
        });
        break;

      case 'move': {
        // Stand at a spot that matches the intent: workstation, table seat
        // or a bench — the client map draws furniture at these coordinates.
        const spot = pickSpot(action.locationKind, action.activity);
        await signer.tx.life_system.move_to({
          tx,
          params: [
            dapp(),
            us(),
            tx.pure.address(agent.agentId),
            tx.pure.u8(action.locationKind),
            tx.pure.u64(scaled(spot.x)),
            tx.pure.u64(scaled(spot.y)),
            tx.pure.u8(action.activity),
            clock()
          ]
        });
        break;
      }

      case 'work':
        await signer.tx.life_system.work({
          tx,
          params: [
            dapp(),
            us(),
            tx.object(this.buildingId(action.locationKind)),
            tx.pure.address(agent.agentId),
            tx.object(RANDOM_ID),
            clock()
          ]
        });
        break;

      case 'talk': {
        const listenerStorage = await this.env.resolveStorage(action.listener.owner);
        await signer.tx.social_system.talk({
          tx,
          params: [
            dapp(),
            us(),
            tx.object(listenerStorage),
            tx.object(this.env.worldPermitId),
            tx.pure.address(agent.agentId),
            tx.pure.address(action.listener.agentId),
            tx.pure.string(action.content),
            clock()
          ]
        });
        break;
      }

      case 'gift': {
        const receiverStorage = await this.env.resolveStorage(action.receiver.owner);
        await signer.tx.social_system.gift_item({
          tx,
          params: [
            dapp(),
            us(),
            tx.object(receiverStorage),
            tx.object(this.env.worldPermitId),
            tx.pure.address(agent.agentId),
            tx.pure.address(action.receiver.agentId),
            tx.pure.address(action.itemId),
            clock()
          ]
        });
        break;
      }

      case 'nominate':
        await signer.tx.town_system.nominate({
          tx,
          params: [
            dapp(),
            us(),
            tx.object(this.env.buildings['town_hall']),
            tx.pure.address(agent.agentId),
            clock()
          ]
        });
        break;

      case 'vote':
        await signer.tx.town_system.vote({
          tx,
          params: [
            dapp(),
            us(),
            tx.pure.address(agent.agentId),
            tx.pure.address(action.candidate),
            clock()
          ]
        });
        break;

      case 'idle':
        return '';
    }

    return this.send(signer, tx);
  }

  /** Persist a compressed memory digest for an agent (agent_system). */
  async updateMemory(citizen: Citizen, agentId: string, digest: string): Promise<string> {
    const signer = citizen.session;
    const tx = new Transaction();
    await signer.tx.agent_system.update_memory({
      tx,
      params: [
        tx.object(this.env.dappStorageId),
        tx.object(citizen.userStorageId),
        tx.pure.address(agentId),
        tx.pure.string(digest),
        tx.object(CLOCK_ID)
      ]
    });
    return this.send(signer, tx);
  }

  /** Advance the town day (public settlement utility, anyone may call). */
  async tick(signer: Dubhe): Promise<string> {
    const tx = new Transaction();
    await signer.tx.town_system.tick({
      tx,
      params: [tx.object(this.env.dappStorageId), tx.object(RANDOM_ID), tx.object(CLOCK_ID)]
    });
    return this.send(signer, tx);
  }

  /** Settle a finished election, passing the winner owner's storage. */
  async closeElection(signer: Dubhe, winnerStorageId: string): Promise<string> {
    const tx = new Transaction();
    await signer.tx.town_system.close_election({
      tx,
      params: [tx.object(this.env.dappStorageId), tx.object(winnerStorageId), tx.object(CLOCK_ID)]
    });
    return this.send(signer, tx);
  }

  private buildingId(kind: number): string {
    const key = KIND_TO_KEY[kind];
    const id = this.env.buildings[key];
    if (!id) throw new Error(`No building id for kind ${kind} (${key}) in buildings.json`);
    return id;
  }

  private async send(signer: Dubhe, tx: Transaction): Promise<string> {
    const result = await signer.signAndSendTxn({ tx });
    await signer.waitForTransaction(result.digest);
    return result.digest;
  }
}

/** Tile → scaled on-chain u64, with a small (±0.3 tile) de-overlap jitter. */
function scaled(tile: number): number {
  const jitter = Math.floor(Math.random() * 7) - 3;
  return Math.max(0, Math.round(tile * POS_SCALE) + jitter);
}
