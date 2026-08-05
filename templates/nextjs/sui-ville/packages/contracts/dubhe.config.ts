import { defineConfig } from '@0xobelisk/sui-common';

/**
 * Ville - Full-chain AI agent town (generative-agents style).
 *
 * Players mint AI agents (personality prompt stored on-chain) and release them
 * into a shared town. Off-chain LLM "brains" act on behalf of agents through
 * session keys — but every action (work, eat, talk, gift, vote...) is an
 * on-chain transaction, so the chain remains the single source of truth.
 *
 * High-frequency data (map positions, dialogue text) uses `offchain: true`
 * resources: they are ordered and published by the chain as events and stored
 * by the indexer, but consume no on-chain storage.
 */
export const dubheConfig = defineConfig({
  name: 'ville',
  description: 'Ville - Full-chain AI agent town built with Dubhe',

  enums: {
    // Documentation enums — stored on-chain as u8 (see constants in the systems)
    Occupation: ['None', 'Farmer', 'Barista', 'Fisher', 'Artisan'],
    Activity: ['Idle', 'Sleeping', 'Working', 'Eating', 'Chatting', 'Wandering'],
    BuildingKind: ['None', 'TownHall', 'Farm', 'Cafe', 'Dock', 'Workshop', 'Tavern'],
    ItemKind: ['None', 'Bread', 'Coffee', 'Fish', 'Craftwork', 'Flower'],
    EventKind: ['None', 'MarketDay', 'Storm', 'Merchant']
  },

  resources: {
    // ── Currency. Transferable into buildings (meal payments, fees) and
    //    listable on the player market. ─────────────────────────────────────
    gold: { fields: { amount: 'u64' }, fungible: true, transferable: true, listable: true },

    // ── Player profile (one per wallet) ────────────────────────────────────
    profile: { fields: { agents_minted: 'u32', total_earned: 'u64' } },

    // ── AI agent, keyed by globally-unique agent_id (ctx.fresh_object_address()).
    //    personality is the on-chain prompt that defines the agent's brain;
    //    energy/mood are settled lazily from last_action_ms. ────────────────
    agent: {
      fields: {
        agent_id: 'address',
        name: 'String',
        personality: 'String',
        occupation: 'u8',
        energy: 'u64',
        mood: 'u64',
        location: 'u8',
        last_action_ms: 'u64',
        last_work_ms: 'u64',
        last_sleep_ms: 'u64',
        born_at: 'u64'
      },
      keys: ['agent_id']
    },

    // ── Compressed long-term memory, written by the off-chain brain so a new
    //    brain instance can be bootstrapped purely from chain state. ─────────
    memory_digest: {
      fields: { agent_id: 'address', digest: 'String', updated_at: 'u64' },
      keys: ['agent_id']
    },

    // ── Directed relationship edge (my agent → other agent). The other side
    //    of a conversation is updated via reactive write under the world
    //    permit, so a single `talk` tx updates both edges. ──────────────────
    relationship: {
      fields: { agent_id: 'address', other_agent: 'address', affinity: 'u64', interactions: 'u64' },
      keys: ['agent_id', 'other_agent'],
      reactive: true
    },

    // ── Items crafted while working. reactive → giftable cross-player
    //    (gift = delete on giver + reactive set on receiver). ───────────────
    item: {
      fields: { item_id: 'address', kind: 'u8', quality: 'u8' },
      keys: ['item_id'],
      reactive: true,
      listable: true
    },

    // ── One vote per agent per election round ──────────────────────────────
    vote_record: {
      fields: { round: 'u64', agent_id: 'address', candidate: 'address' },
      keys: ['round', 'agent_id']
    },

    // ── High-frequency map position + current activity: event-only. ────────
    // Keyed by agent so the indexer keeps one live row per agent (not per
    // player). x/y are tile coordinates scaled by 10 for sub-tile detail
    // (e.g. 278 = tile 27.8).
    agent_position: {
      fields: { agent_id: 'address', x: 'u64', y: 'u64', activity: 'u8' },
      keys: ['agent_id'],
      offchain: true
    },

    // ── Dialogue transcript: event-only (indexer/frontend consume it);
    //    only the affinity change persists in on-chain state. ───────────────
    dialogue: {
      fields: { speaker: 'address', listener: 'address', content: 'String' },
      offchain: true
    },

    // ── Global town state (singleton in DappStorage) ───────────────────────
    town_config: {
      global: true,
      fields: {
        day: 'u64',
        day_start_ms: 'u64',
        day_length_ms: 'u64',
        festival_until: 'u64',
        mayor_agent: 'address',
        mayor_owner: 'address',
        population: 'u64'
      }
    },

    // ── Two-candidate mayoral election (opened periodically by town_tick) ──
    election_state: {
      global: true,
      fields: {
        round: 'u64',
        ends_at: 'u64',
        candidate_a: 'address',
        candidate_b: 'address',
        votes_a: 'u64',
        votes_b: 'u64'
      }
    },

    // ── Random daily town event, rolled by town_system::tick. kind is an
    //    EventKind; magnitude is a percentage modifier (e.g. 150 = wages
    //    ×1.5 on MarketDay, 50 = meals at half price while the Merchant is
    //    in town). Storm halts outdoor work (farm/dock) while active. ────────
    town_event: {
      global: true,
      fields: { kind: 'u8', until: 'u64', magnitude: 'u64', started_day: 'u64' }
    },

    // Stores the ObjectID of the global WorldPermit so clients can look it up
    world_permit_id: {
      global: true,
      fields: { object_id: 'address' }
    }
  },

  objects: {
    // ── Town buildings: workplaces + gold treasuries. Meal payments and
    //    nomination/mint fees flow in; the mayor spends the TownHall treasury
    //    on festivals. adminOnly — created in deploy_hook. ──────────────────
    building: {
      fields: { kind: 'u8', name: 'String', wage: 'u64', meal_price: 'u64' },
      accepts: ['gold'],
      adminOnly: true
    }
  },

  permits: {
    // Global town-wide permit: every registered player joins it once, which
    // authorizes reactive writes between any two citizens (relationship
    // updates, gifts).
    world: {}
  },

  errors: {
    already_registered: 'Player already registered',
    not_registered: 'Player not registered',
    max_agents_reached: 'Maximum agents per player reached',
    agent_not_found: 'Agent not found in this storage',
    insufficient_gold: 'Not enough gold',
    insufficient_energy: 'Agent is too tired for this action',
    invalid_occupation: 'Invalid occupation',
    wrong_building: 'Wrong building for this action',
    not_at_location: 'Agent is not at the required location',
    work_cooldown_active: 'Agent already worked recently',
    sleep_cooldown_active: 'Agent slept too recently',
    cannot_socialize_self: 'An agent cannot socialize with itself',
    same_owner_socialize: 'Cross-storage social actions require two different players',
    agents_not_together: 'Both agents must be at the same location',
    item_not_found: 'Item not owned',
    day_not_finished: 'The current town day is not over yet',
    election_not_active: 'No active election',
    election_still_active: 'The election has not ended yet',
    election_not_opened: 'No election round has been opened',
    candidate_slots_full: 'Both candidate slots are already taken',
    already_nominated: 'This agent is already a candidate',
    invalid_candidate: 'Not a candidate in this election',
    not_the_winner: 'This agent did not win the election',
    not_mayor: 'Only the mayor can do this',
    storm_blocks_work: 'The storm makes outdoor work impossible'
  }
});
