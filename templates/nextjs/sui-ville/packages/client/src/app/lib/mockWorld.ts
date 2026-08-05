/**
 * Mock world for design review: `/?mock=1` renders the full UI from this
 * data without touching the indexer. Extra params:
 *   ?night=1    — force dusk (dark overlay + lit windows)
 *   ?event=1|2|3 — market day / storm / merchant visuals
 *
 * Agents cycle between their activity spots every few seconds so the walk
 * animation, bubbles and activity glyphs can all be reviewed live.
 */
import type { WorldState, AgentRow, PositionRow, DialogueRow } from './types';
import { POS_SCALE } from './constants';

interface MockOptions {
  event: number;
  night: boolean;
}

const OWNER_A = '0xaaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111';
const OWNER_B = '0xbbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222';
const OWNER_C = '0xcccc3333cccc3333cccc3333cccc3333cccc3333cccc3333cccc3333cccc3333';
const OWNER_D = '0xdddd4444dddd4444dddd4444dddd4444dddd4444dddd4444dddd4444dddd4444';

const id = (n: number) => `0x${n.toString(16).padStart(4, '0')}${'ab'.repeat(30)}`;

interface MockAgent {
  agent: AgentRow;
  /** Spots the agent cycles through: [x, y, activity][] (tile coords). */
  spots: Array<[number, number, number]>;
}

/** Spot coordinates mirror agent-runner LOCATION_SPOTS / the map furniture. */
const CAST: MockAgent[] = [
  {
    agent: row(OWNER_A, id(1), 'Alice', 'Cheerful farmer who hums while she works', 1, 82, 74, 2),
    spots: [
      [3.0, 20.2, 2],
      [7.0, 20.2, 2],
      [4.0, 21.8, 2],
      [6.0, 18.8, 0]
    ]
  },
  {
    agent: row(OWNER_A, id(2), 'Bob', 'Grumpy barista, secretly loves gossip', 2, 55, 61, 3),
    spots: [
      [29.2, 8.7, 2],
      [30.8, 8.7, 2],
      [30.0, 9.4, 0]
    ]
  },
  {
    agent: row(OWNER_B, id(3), 'Clara', 'Dreamy fisher who talks to the sea', 3, 68, 80, 4),
    spots: [
      [37.2, 21.0, 2],
      [38.3, 21.8, 2],
      [35.2, 20.6, 0],
      [36.4, 21.9, 2]
    ]
  },
  {
    agent: row(OWNER_B, id(4), 'Dorian', 'Perfectionist artisan, hates rainy days', 4, 47, 52, 5),
    spots: [
      [7.6, 7.2, 2],
      [12.4, 7.2, 2],
      [10.0, 7.8, 2],
      [9.0, 7.2, 0]
    ]
  },
  {
    agent: row(OWNER_C, id(5), 'Elena', 'Retired mayor, feeds the plaza pigeons', 0, 90, 88, 3),
    spots: [
      [27.2, 10.6, 3],
      [28.8, 10.6, 3],
      [31.2, 10.6, 3]
    ]
  },
  {
    agent: row(OWNER_C, id(6), 'Felix', 'Tavern regular with a hundred stories', 3, 35, 66, 6),
    spots: [
      [29.2, 19.2, 3],
      [30.8, 19.2, 3],
      [28.0, 17.9, 0]
    ]
  },
  {
    agent: row(OWNER_D, id(7), 'Grace', 'Curious newcomer, sketches everything', 2, 73, 79, 0),
    spots: [
      [17.6, 12.6, 0],
      [22.4, 12.6, 0],
      [19.0, 14.2, 4],
      [16.5, 13.8, 5]
    ]
  },
  {
    agent: row(OWNER_D, id(8), 'Hugo', 'Napping champion of the whole region', 4, 18, 44, 0),
    spots: [
      [21.8, 11.2, 1],
      [21.0, 14.2, 1],
      [23.5, 13.8, 0]
    ]
  }
];

const LINES: Array<[number, number, string]> = [
  [6, 4, 'Dorian, this stew is even better than yesterday, I swear on my nets!'],
  [4, 6, 'Careful Felix, flattery gets you a free refill and nothing else.'],
  [0, 2, 'Clara! The harvest is in early — come by the farm before dusk.'],
  [2, 0, 'Only if the tide lets me go, Alice. The fish are restless today.'],
  [6, 5, 'Grace, sketch me by the fountain — my good side this time!'],
  [5, 6, 'Hold still for once, Hugo, and I might.'],
  [1, 3, 'One more espresso and the workshop bill is settled, Dorian.'],
  [4, 1, 'The counter wobbles, Bob. I will fix it for two coffees.']
];

export function mockWorld(now: number, opts: MockOptions): WorldState {
  const dayLengthMs = 240_000;
  // Force the day fraction: 30% (noon) normally, 85% (dusk) with ?night=1.
  const dayStartMs = now - (opts.night ? 0.85 : 0.3) * dayLengthMs;

  const positions: Record<string, PositionRow> = {};
  CAST.forEach((m, i) => {
    // Each agent hops to its next spot on its own cadence.
    const step = Math.floor(now / (6000 + i * 900) + i) % m.spots.length;
    const [x, y, activity] = m.spots[step];
    positions[m.agent.agentId] = {
      agentId: m.agent.agentId,
      x: Math.round(x * POS_SCALE),
      y: Math.round(y * POS_SCALE),
      activity,
      updatedAtMs: now
    };
  });

  // Two fresh lines at a time, rotating through the script.
  const dialogues: DialogueRow[] = LINES.map(([s, l, content], i) => ({
    id: `mock-${i}`,
    speaker: CAST[s].agent.agentId,
    listener: CAST[l].agent.agentId,
    content,
    atMs: now - ((i + Math.floor(now / 9000)) % LINES.length) * 9000
  })).sort((a, b) => b.atMs - a.atMs);

  const relationships = LINES.map(([s, l], i) => ({
    owner: CAST[s].agent.owner,
    agentId: CAST[s].agent.agentId,
    otherAgent: CAST[l].agent.agentId,
    affinity: 55 + ((i * 13) % 40),
    interactions: 3 + ((i * 7) % 20)
  }));

  return {
    agents: CAST.map((m) => m.agent),
    town: {
      day: 5,
      dayStartMs,
      dayLengthMs,
      festivalUntil: 0,
      mayorAgent: CAST[4].agent.agentId,
      mayorOwner: CAST[4].agent.owner,
      population: CAST.length
    },
    election: {
      round: 2,
      endsAt: now + 90_000,
      candidateA: CAST[0].agent.agentId,
      candidateB: CAST[1].agent.agentId,
      votesA: 3,
      votesB: 2
    },
    event:
      opts.event > 0
        ? { kind: opts.event, until: now + 120_000, magnitude: opts.event === 1 ? 150 : 50, startedDay: 5 }
        : null,
    positions,
    dialogues,
    relationships,
    memories: CAST.map((m) => ({
      agentId: m.agent.agentId,
      digest: `Day 5: ${m.agent.name} ${['worked hard', 'made a friend', 'ate well', 'napped twice'][m.agent.occupation % 4]}; the town feels alive.`,
      updatedAt: now - 60_000
    })),
    gold: {
      [OWNER_A]: 132,
      [OWNER_B]: 87,
      [OWNER_C]: 245,
      [OWNER_D]: 41
    },
    lastSyncMs: now,
    error: null
  };
}

function row(
  owner: string,
  agentId: string,
  name: string,
  personality: string,
  occupation: number,
  energy: number,
  mood: number,
  location: number
): AgentRow {
  return {
    owner,
    agentId,
    name,
    personality,
    occupation,
    energy,
    mood,
    location,
    lastActionMs: Date.now()
  };
}
