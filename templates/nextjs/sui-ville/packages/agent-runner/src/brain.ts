/**
 * Rule-driven brain (v1). Given a perception snapshot for one agent, produce
 * the next action. The LLM brain (v2) will implement the same `decide`
 * contract, with this module remaining as the degradation fallback.
 *
 * Dialogue content must stay ASCII: on-chain strings are std::ascii::String.
 */
import {
  Activity,
  BuildingKind,
  ENERGY_DECAY_MS,
  EventKind,
  KIND_TO_KEY,
  NOMINATION_FEE,
  SLEEP_COOLDOWN_MS,
  TALK_ENERGY_COST,
  WORKPLACE_OF,
  WORK_COOLDOWN_MS,
  WORK_ENERGY_COST
} from './config.ts';
import type { Action, AgentRow, ElectionRow, ItemRow, TownConfigRow, TownEventRow } from './types.ts';

export interface BrainContext {
  agent: AgentRow;
  now: number;
  gold: number;
  items: ItemRow[];
  town: TownConfigRow;
  election: ElectionRow;
  /** Daily random event (market day / storm / merchant). */
  event: TownEventRow;
  /** Agents owned by other players (valid talk/gift targets). */
  others: AgentRow[];
  /** Whether this agent already voted in the current election round. */
  hasVoted: boolean;
  /** Meal prices by BuildingKind (from the seed data). */
  mealPrices: Record<number, number>;
}

const ENERGY_CRITICAL = 20;
const ENERGY_HUNGRY = 45;
const TALK_CHANCE = 0.45;
const GIFT_CHANCE = 0.1;
const NOMINATE_CHANCE = 0.25;
const WANDER_CHANCE = 0.3;

export function decide(ctx: BrainContext): Action {
  const { agent, now } = ctx;
  const energy = estimateEnergy(agent, now);
  const marketDay = eventActive(ctx, EventKind.MarketDay);
  const storm = eventActive(ctx, EventKind.Storm);
  const merchant = eventActive(ctx, EventKind.Merchant);

  // 1. Survival: recover energy before anything else. While the traveling
  //    merchant halves meal prices, agents top up earlier than usual.
  const canSleep = agent.lastSleepMs === 0 || now >= agent.lastSleepMs + SLEEP_COOLDOWN_MS;
  if (energy < ENERGY_CRITICAL) {
    if (canSleep) return { kind: 'sleep' };
    const meal = affordableMeal(ctx);
    if (meal !== null) return goEatOrMove(agent, meal);
    return { kind: 'idle', reason: 'exhausted, waiting for sleep cooldown' };
  }
  if (energy < (merchant ? ENERGY_HUNGRY + 20 : ENERGY_HUNGRY)) {
    const meal = affordableMeal(ctx);
    if (meal !== null) return goEatOrMove(agent, meal);
    if (canSleep) return { kind: 'sleep' };
  }

  // 1b. Storm: outdoor workplaces are closed on-chain — anyone outside or at
  //     the farm/dock runs for shelter and rides it out indoors.
  const OUTDOOR_SPOTS = [BuildingKind.Outdoors, BuildingKind.Farm, BuildingKind.Dock] as number[];
  if (storm && OUTDOOR_SPOTS.includes(agent.location)) {
    const shelter = Math.random() < 0.5 ? BuildingKind.Tavern : BuildingKind.Cafe;
    return {
      kind: 'move',
      locationKind: shelter,
      activity: Activity.Idle,
      reason: 'sheltering from the storm'
    };
  }

  // 2. Civic duty: vote once per election round.
  const electionActive =
    ctx.election.round > 0 && ctx.election.endsAt > 0 && now < ctx.election.endsAt;
  if (electionActive && !ctx.hasVoted) {
    const candidates = [ctx.election.candidateA, ctx.election.candidateB].filter(
      (c) => c && !isZero(c)
    );
    if (candidates.length > 0) {
      // Prefer a housemate candidate, otherwise pick randomly.
      const own = candidates.find((c) => c === agent.agentId);
      const pick = own ?? candidates[Math.floor(Math.random() * candidates.length)];
      if (pick !== agent.agentId) return { kind: 'vote', candidate: pick };
    } else if (ctx.gold >= NOMINATION_FEE + 20 && Math.random() < NOMINATE_CHANCE) {
      return { kind: 'nominate' };
    }
  }

  // 3. Socialize: chat with someone standing in the same location. On market
  //    day gold takes priority, so idle chatter is rarer.
  const talkChance = marketDay ? TALK_CHANCE / 3 : TALK_CHANCE;
  const nearby = ctx.others.filter((o) => o.location === agent.location);
  if (nearby.length > 0 && energy >= TALK_ENERGY_COST + 10 && Math.random() < talkChance) {
    const listener = nearby[Math.floor(Math.random() * nearby.length)];
    if (ctx.items.length > 0 && Math.random() < GIFT_CHANCE) {
      return { kind: 'gift', receiver: listener, itemId: ctx.items[0].itemId };
    }
    return { kind: 'talk', listener, content: composeLine(ctx, listener) };
  }

  // 4. Earn a living: head to the workplace and do a shift. During a storm
  //    outdoor workers (farmers, fishers) stay indoors instead.
  const workplace = WORKPLACE_OF[agent.occupation];
  const workplaceClosed = storm && OUTDOOR_SPOTS.includes(workplace);
  const canWork = agent.lastWorkMs === 0 || now >= agent.lastWorkMs + WORK_COOLDOWN_MS;
  if (workplace && !workplaceClosed && canWork && energy >= WORK_ENERGY_COST) {
    if (agent.location === workplace) return { kind: 'work', locationKind: workplace };
    return {
      kind: 'move',
      locationKind: workplace,
      activity: Activity.Working,
      reason: marketDay ? 'cashing in on market day' : 'heading to work'
    };
  }

  // 5. Downtime: wander somewhere social (indoors only while it storms).
  if (Math.random() < WANDER_CHANCE) {
    const spots = storm
      ? [BuildingKind.Tavern, BuildingKind.Cafe, BuildingKind.TownHall]
      : [BuildingKind.Outdoors, BuildingKind.Tavern, BuildingKind.Cafe, BuildingKind.TownHall];
    const dest = spots[Math.floor(Math.random() * spots.length)];
    if (dest !== agent.location) {
      return { kind: 'move', locationKind: dest, activity: Activity.Wandering, reason: 'wandering' };
    }
  }
  return { kind: 'idle', reason: 'resting between shifts' };
}

function eventActive(ctx: BrainContext, kind: number): boolean {
  return ctx.event.kind === kind && ctx.now < ctx.event.until;
}

/** Mirror of agent_system::settle_energy — decay since the last action. */
export function estimateEnergy(agent: AgentRow, now: number): number {
  if (now <= agent.lastActionMs) return agent.energy;
  const decay = Math.floor((now - agent.lastActionMs) / ENERGY_DECAY_MS);
  return Math.max(0, agent.energy - decay);
}

/** Cheapest meal venue the agent can afford, or null. */
function affordableMeal(ctx: BrainContext): number | null {
  const venues = [BuildingKind.Cafe, BuildingKind.Tavern]
    .filter((k) => ctx.mealPrices[k] !== undefined && ctx.gold >= ctx.mealPrices[k])
    .sort((a, b) => ctx.mealPrices[a] - ctx.mealPrices[b]);
  return venues.length > 0 ? venues[0] : null;
}

function goEatOrMove(agent: AgentRow, venue: number): Action {
  if (agent.location === venue) return { kind: 'eat', locationKind: venue };
  return { kind: 'move', locationKind: venue, activity: Activity.Eating, reason: 'getting food' };
}

function isZero(addr: string): boolean {
  return /^0x0+$/.test(addr);
}

// ─── Dialogue templates (ASCII only) ─────────────────────────────────────────

const OPENERS = [
  'Good to see you around here,',
  'Hey',
  'Well well, if it is not',
  'Fancy meeting you here,'
];

const TOPICS = [
  'the harvest has been generous this week.',
  'I heard the tavern got a new stew recipe.',
  'work keeps me busy, but I cannot complain.',
  'the dock smells like a storm is coming.',
  'someone should really fix the fountain in the square.',
  'I have been saving up for something special.'
];

const FESTIVAL_TOPICS = [
  'this festival has the whole town buzzing!',
  'double wages during the festival — what a time to be alive!'
];

const ELECTION_TOPICS = [
  'have you decided who gets your vote this round?',
  'the mayoral race is heating up, do you follow it?'
];

const EVENT_TOPICS: Record<number, string[]> = {
  [EventKind.MarketDay]: [
    'market day! Wages are half again as much, I am not missing a shift.',
    'the whole town is out earning on market day, are you?'
  ],
  [EventKind.Storm]: [
    'this storm is fierce — the farm and the dock are shut tight.',
    'nothing to do but wait out the storm somewhere dry.'
  ],
  [EventKind.Merchant]: [
    'the traveling merchant is in town, meals are half price!',
    'seen the merchant caravan? Cheapest supper of the season.'
  ]
};

function composeLine(ctx: BrainContext, listener: AgentRow): string {
  const opener = pick(OPENERS);
  let topics = TOPICS;
  if (ctx.now < ctx.town.festivalUntil) topics = topics.concat(FESTIVAL_TOPICS);
  if (ctx.election.round > 0 && ctx.election.endsAt > ctx.now) topics = topics.concat(ELECTION_TOPICS);
  if (ctx.event.kind !== 0 && ctx.now < ctx.event.until) {
    // Event gossip dominates the conversation while an event is on.
    topics = (EVENT_TOPICS[ctx.event.kind] ?? []).concat(topics.slice(0, 2));
  }
  const place = KIND_TO_KEY[ctx.agent.location] ?? 'town';
  return `${opener} ${listener.name}! Here at the ${place.replace('_', ' ')}, ${pick(topics)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
