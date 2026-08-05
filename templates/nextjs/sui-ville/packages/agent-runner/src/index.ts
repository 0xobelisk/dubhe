/**
 * Ville agent runner — rule-driven brains (v1).
 *
 * Loop: perceive (indexer) → decide (brain) → act (session-key transaction).
 * The chain is the single source of truth; the runner holds no authoritative
 * state and can be killed / restarted at any point.
 */
import { loadMetadata } from '@0xobelisk/sui-client';
import {
  CITIZEN_COUNT,
  KIND_TO_KEY,
  MEMORY_EVERY_N_ACTIONS,
  STEP_INTERVAL_MS,
  loadBuildings,
  loadDeployment
} from './config.ts';
import { Perception } from './perception.ts';
import { CitizenManager } from './citizens.ts';
import { ActionExecutor } from './actions.ts';
import { decide, estimateEnergy, type BrainContext } from './brain.ts';
import { createProviderFromEnv, type LLMProvider } from './llm/provider.ts';
import { decideWithLLM } from './llm/llm-brain.ts';
import { runKeeper } from './keeper.ts';
import type { Action, AgentRow, Citizen } from './types.ts';

/** Rolling journal of recent actions per agent, flushed on-chain periodically. */
const journals = new Map<string, string[]>();
const actionCounts = new Map<string, number>();

async function main() {
  const deployment = await loadDeployment();
  const buildings = loadBuildings();
  const metadata = await loadMetadata(deployment.network as any, deployment.packageId);

  console.log(`Ville agent runner — network=${deployment.network} package=${deployment.packageId}`);

  // Optional LLM brain: rule brain remains the always-on fallback.
  const llm = createProviderFromEnv();
  console.log(
    llm
      ? `LLM brain enabled: ${llm.name} (${llm.model})`
      : 'LLM brain disabled (set LLM_PROVIDER/LLM_API_KEY to enable) — using rule brain'
  );

  const perception = new Perception();
  const manager = new CitizenManager({ deployment, metadata, buildings, perception });
  const citizens = await manager.bootstrap(CITIZEN_COUNT);
  const resolveStorage = (owner: string) => manager.resolveStorage(owner);

  const executor = new ActionExecutor({
    dappStorageId: deployment.dappStorageId,
    buildings,
    worldPermitId: await perception.worldPermitId(),
    resolveStorage
  });

  // Meal prices as seeded (used by the brain to plan food runs).
  const mealPrices: Record<number, number> = { 3: 5, 6: 8 };

  console.log(`\nTown is alive: ${citizens.length} citizens, ${citizens.reduce((n, c) => n + c.agents.length, 0)} agents. Stepping every ${STEP_INTERVAL_MS / 1000}s.\n`);

  for (;;) {
    try {
      const snapshot = await perception.snapshot();
      await runKeeper(executor, snapshot, citizens, resolveStorage);

      for (const citizen of citizens) {
        // Keep unsettled write debt below the on-chain limit (2000), after
        // which every storage write aborts; renew the session key before it
        // expires so actions keep signing silently.
        try {
          await manager.settleIfNeeded(citizen);
          await manager.renewSessionIfNeeded(citizen);
        } catch (e) {
          console.log(`[citizen${citizen.index}] maintenance failed: ${trim(e)}`);
        }

        // Refresh this citizen's agents from the indexer each round.
        citizen.agents = await perception.agentsOf(citizen.address);

        for (const agent of citizen.agents) {
          try {
            await step(citizen, agent, snapshot, perception, executor, mealPrices, llm);
          } catch (e) {
            console.log(`[${agent.name}] action failed: ${trim(e)}`);
          }
        }
      }
    } catch (e) {
      console.log(`[runner] round failed: ${trim(e)}`);
    }
    await sleep(STEP_INTERVAL_MS);
  }
}

async function step(
  citizen: Citizen,
  agent: AgentRow,
  snapshot: Awaited<ReturnType<Perception['snapshot']>>,
  perception: Perception,
  executor: ActionExecutor,
  mealPrices: Record<number, number>,
  llm: LLMProvider | null
): Promise<void> {
  const now = Date.now();
  const [gold, items, hasVoted] = await Promise.all([
    perception.goldOf(citizen.address),
    perception.itemsOf(citizen.address),
    snapshot.election.round > 0
      ? perception.hasVoted(citizen.address, snapshot.election.round, agent.agentId)
      : Promise.resolve(false)
  ]);

  const ctx: BrainContext = {
    agent,
    now,
    gold,
    items,
    town: snapshot.town,
    election: snapshot.election,
    event: snapshot.event,
    others: snapshot.agents.filter((a) => a.owner !== citizen.address),
    hasVoted,
    mealPrices
  };

  let action: Action;
  if (llm) {
    try {
      const memory = (journals.get(agent.agentId) ?? []).join('; ');
      action = await decideWithLLM(ctx, llm, memory);
    } catch (e) {
      console.log(`[${agent.name}] llm brain failed (${trim(e)}) — falling back to rules`);
      action = decide(ctx);
    }
  } else {
    action = decide(ctx);
  }

  if (action.kind === 'idle') {
    console.log(`[${agent.name}] idles (${action.reason}) energy~${estimateEnergy(agent, now)}`);
    return;
  }

  const digest = await executor.submit(citizen, agent, action);
  console.log(`[${agent.name}] ${describe(action)} (${digest.slice(0, 10)})`);
  journal(agent.agentId, describe(action));

  // Periodically compress the journal into an on-chain memory digest so a
  // fresh brain can rebuild context purely from chain state.
  const count = (actionCounts.get(agent.agentId) ?? 0) + 1;
  actionCounts.set(agent.agentId, count);
  if (count % MEMORY_EVERY_N_ACTIONS === 0) {
    const digestText = (journals.get(agent.agentId) ?? []).join('; ').slice(0, 400);
    try {
      await executor.updateMemory(citizen, agent.agentId, digestText);
      console.log(`[${agent.name}] memory digest updated (${count} actions)`);
    } catch (e) {
      console.log(`[${agent.name}] memory update failed: ${trim(e)}`);
    }
  }
}

function journal(agentId: string, entry: string): void {
  const list = journals.get(agentId) ?? [];
  list.push(entry);
  if (list.length > 10) list.shift();
  journals.set(agentId, list);
}

function describe(action: Action): string {
  switch (action.kind) {
    case 'sleep':
      return 'takes a nap';
    case 'eat':
      return `eats at the ${KIND_TO_KEY[action.locationKind]}`;
    case 'move':
      return `moves to the ${KIND_TO_KEY[action.locationKind] ?? 'outdoors'} (${action.reason})`;
    case 'work':
      return `works a shift at the ${KIND_TO_KEY[action.locationKind]}`;
    case 'talk':
      return `chats with ${action.listener.name}: "${action.content}"`;
    case 'gift':
      return `gifts an item to ${action.receiver.name}`;
    case 'nominate':
      return 'runs for mayor';
    case 'vote':
      return `votes for ${action.candidate.slice(0, 8)}`;
    case 'idle':
      return `idles (${action.reason})`;
  }
}

function trim(e: unknown): string {
  return String(e instanceof Error ? e.message : e).slice(0, 500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
