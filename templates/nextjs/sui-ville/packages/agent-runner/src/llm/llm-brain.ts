/**
 * LLM brain (v2): same `decide` contract as the rule brain, but the action
 * is chosen by a chat model playing the agent's on-chain personality.
 *
 * The model sees a compact world snapshot and must answer with one JSON
 * action. Anything invalid (unknown action, unknown target, malformed JSON,
 * timeout) throws — the caller falls back to the rule brain, so the town
 * never stalls on a flaky API.
 */
import {
  Activity,
  BuildingKind,
  EventKind,
  KIND_TO_KEY,
  NOMINATION_FEE,
  SLEEP_COOLDOWN_MS,
  WORKPLACE_OF,
  WORK_COOLDOWN_MS,
  WORK_ENERGY_COST
} from '../config.ts';
import { estimateEnergy, type BrainContext } from '../brain.ts';
import type { Action, AgentRow } from '../types.ts';
import type { LLMProvider } from './provider.ts';

const KEY_TO_KIND: Record<string, number> = {
  outdoors: BuildingKind.Outdoors,
  town_hall: BuildingKind.TownHall,
  farm: BuildingKind.Farm,
  cafe: BuildingKind.Cafe,
  dock: BuildingKind.Dock,
  workshop: BuildingKind.Workshop,
  tavern: BuildingKind.Tavern
};

const EVENT_NAMES: Record<number, string> = {
  [EventKind.MarketDay]: 'market day (wages x1.5 today)',
  [EventKind.Storm]: 'storm (farm and dock are CLOSED until it passes)',
  [EventKind.Merchant]: 'traveling merchant (meals half price today)'
};

export async function decideWithLLM(
  ctx: BrainContext,
  provider: LLMProvider,
  recentActions: string
): Promise<Action> {
  const raw = await provider.chat(
    [
      { role: 'system', content: systemPrompt(ctx) },
      { role: 'user', content: worldPrompt(ctx, recentActions) }
    ],
    { temperature: 0.9, maxTokens: 250 }
  );
  return parseAction(ctx, raw);
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function systemPrompt(ctx: BrainContext): string {
  const a = ctx.agent;
  return [
    `You are ${a.name}, a resident of Ville, a small pixel town living entirely on a blockchain.`,
    `Your personality: ${a.personality}`,
    `Stay in character. Prefer actions that fit your personality and the situation.`,
    ``,
    `Reply with EXACTLY ONE JSON object and nothing else. Allowed actions:`,
    `{"action":"work"}                                  — do a shift at your workplace (you will walk there first if needed)`,
    `{"action":"sleep"}                                 — nap to restore energy`,
    `{"action":"eat","venue":"cafe"|"tavern"}          — buy a meal`,
    `{"action":"move","to":"<place>","why":"<short>"}  — go to: outdoors, town_hall, farm, cafe, dock, workshop, tavern`,
    `{"action":"talk","to":"<name>","say":"<1-2 sentences, plain ASCII>"} — chat with a nearby resident`,
    `{"action":"gift","to":"<name>"}                    — give your first inventory item to a nearby resident`,
    `{"action":"nominate"}                              — run for mayor (costs ${NOMINATION_FEE} gold)`,
    `{"action":"vote","for":"<candidate name>"}        — vote in the active election`,
    `{"action":"idle","why":"<short>"}                  — do nothing this turn`
  ].join('\n');
}

function worldPrompt(ctx: BrainContext, recentActions: string): string {
  const a = ctx.agent;
  const now = ctx.now;
  const energy = estimateEnergy(a, now);
  const canSleep = a.lastSleepMs === 0 || now >= a.lastSleepMs + SLEEP_COOLDOWN_MS;
  const canWork = a.lastWorkMs === 0 || now >= a.lastWorkMs + WORK_COOLDOWN_MS;
  const workplace = KIND_TO_KEY[WORKPLACE_OF[a.occupation]] ?? 'none';
  const nearby = ctx.others.filter((o) => o.location === a.location);
  const eventLine =
    ctx.event.kind !== 0 && now < ctx.event.until
      ? EVENT_NAMES[ctx.event.kind] ?? 'unknown event'
      : 'none';

  const election =
    ctx.election.round > 0 && ctx.election.endsAt > now
      ? {
          candidates: [ctx.election.candidateA, ctx.election.candidateB]
            .filter((c) => !/^0x0+$/.test(c))
            .map((c) => nameOf(ctx, c)),
          youAlreadyVoted: ctx.hasVoted
        }
      : null;

  return JSON.stringify(
    {
      you: {
        occupation: workplace === 'none' ? 'drifter' : `works at the ${workplace}`,
        location: KIND_TO_KEY[a.location] ?? 'outdoors',
        energy: `${energy}/100${energy < 25 ? ' (very tired!)' : ''}`,
        mood: a.mood,
        gold: ctx.gold,
        inventoryItems: ctx.items.length,
        canWorkNow: canWork && energy >= WORK_ENERGY_COST,
        canSleepNow: canSleep
      },
      town: {
        day: ctx.town.day,
        festival: now < ctx.town.festivalUntil,
        todaysEvent: eventLine,
        mayor: /^0x0+$/.test(ctx.town.mayorAgent) ? 'none' : nameOf(ctx, ctx.town.mayorAgent),
        election
      },
      nearbyResidents: nearby.map((o) => o.name),
      yourRecentActions: recentActions || 'none yet'
    },
    null,
    1
  );
}

// ─── Response parsing ────────────────────────────────────────────────────────

function parseAction(ctx: BrainContext, raw: string): Action {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`LLM reply has no JSON: ${raw.slice(0, 120)}`);
  let obj: any;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    throw new Error(`LLM reply is not valid JSON: ${match[0].slice(0, 120)}`);
  }

  const agent = ctx.agent;
  const now = ctx.now;
  const nearby = ctx.others.filter((o) => o.location === agent.location);

  switch (obj.action) {
    case 'sleep': {
      const canSleep = agent.lastSleepMs === 0 || now >= agent.lastSleepMs + SLEEP_COOLDOWN_MS;
      if (!canSleep) throw new Error('sleep is on cooldown');
      return { kind: 'sleep' };
    }

    case 'idle':
      return { kind: 'idle', reason: str(obj.why) || 'thinking' };

    case 'work': {
      const workplace = WORKPLACE_OF[agent.occupation];
      if (!workplace) throw new Error('agent has no workplace');
      const canWork = agent.lastWorkMs === 0 || now >= agent.lastWorkMs + WORK_COOLDOWN_MS;
      if (!canWork) throw new Error('work is on cooldown');
      if (estimateEnergy(agent, now) < WORK_ENERGY_COST) throw new Error('too tired to work');
      if (agent.location !== workplace) {
        return {
          kind: 'move',
          locationKind: workplace,
          activity: Activity.Working,
          reason: 'heading to work'
        };
      }
      return { kind: 'work', locationKind: workplace };
    }

    case 'eat': {
      const venue = KEY_TO_KIND[str(obj.venue)];
      if (venue !== BuildingKind.Cafe && venue !== BuildingKind.Tavern) {
        throw new Error(`invalid eat venue: ${obj.venue}`);
      }
      if (agent.location !== venue) {
        return { kind: 'move', locationKind: venue, activity: Activity.Eating, reason: 'getting food' };
      }
      return { kind: 'eat', locationKind: venue };
    }

    case 'move': {
      const dest = KEY_TO_KIND[str(obj.to)];
      if (dest === undefined) throw new Error(`unknown destination: ${obj.to}`);
      return {
        kind: 'move',
        locationKind: dest,
        activity: Activity.Wandering,
        reason: sanitize(str(obj.why) || 'wandering').slice(0, 60)
      };
    }

    case 'talk': {
      const listener = findByName(nearby, str(obj.to));
      if (!listener) throw new Error(`talk target not nearby: ${obj.to}`);
      const say = sanitize(str(obj.say)).slice(0, 200);
      if (!say) throw new Error('talk content is empty after sanitizing');
      return { kind: 'talk', listener, content: say };
    }

    case 'gift': {
      const receiver = findByName(nearby, str(obj.to));
      if (!receiver) throw new Error(`gift target not nearby: ${obj.to}`);
      if (ctx.items.length === 0) throw new Error('no items to gift');
      return { kind: 'gift', receiver, itemId: ctx.items[0].itemId };
    }

    case 'nominate':
      return { kind: 'nominate' };

    case 'vote': {
      const wanted = str(obj.for);
      const candidates = [ctx.election.candidateA, ctx.election.candidateB].filter(
        (c) => !/^0x0+$/.test(c)
      );
      const target = candidates.find(
        (c) => nameOf(ctx, c).toLowerCase() === wanted.toLowerCase()
      );
      if (!target) throw new Error(`vote target is not a candidate: ${wanted}`);
      return { kind: 'vote', candidate: target };
    }

    default:
      throw new Error(`unknown action: ${obj.action}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nameOf(ctx: BrainContext, agentId: string): string {
  if (agentId === ctx.agent.agentId) return ctx.agent.name;
  return ctx.others.find((o) => o.agentId === agentId)?.name ?? agentId.slice(0, 8);
}

function findByName(agents: AgentRow[], name: string): AgentRow | undefined {
  return agents.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** On-chain strings are std::ascii::String — strip anything non-printable-ASCII. */
function sanitize(s: string): string {
  return s.replace(/[^\x20-\x7e]/g, '').trim();
}
