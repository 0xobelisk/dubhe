import type { DubheConfig } from '@0xobelisk/sui-common';

/**
 * Full config for the example DApp.
 *
 * This is the canonical regression config used by tests/schemagen/all-types.test.ts.
 * It declares 35 migrated ECS components (component0-34) and 10 original resources
 * (resource0-9), plus 3 enum types, and covers ALL codegen annotation scenarios:
 *   resources:  global, fungible, unique, reactive, listable, transferable, offchain
 *   objects:    vault (accepts gold + sword, acceptsFrom dungeon)
 *   scenes:     dungeon (accepts gold + sword, acceptsFrom arena)
 *               arena  (accepts gold)
 *   errors:     custom DApp error constants
 */
export const exampleConfig: DubheConfig = {
  name: 'example',
  description: 'Example DApp for testing all resource types and schemagen regression',

  enums: {
    Direction: ['East', 'North', 'South', 'West'],
    Status: ['Caught', 'Fled', 'Missed'],
    AssetType: ['Lp', 'Package', 'Private', 'Wrapped']
  },

  resources: {
    // ── Components 0-34 (migrated ECS components, now stored in resources/) ─

    // Primitive singles — no extra key params
    component0: 'bool', // presence flag
    component3: 'u32',
    component5: 'u32',
    component8: 'Direction', // enum single value
    component9: { fields: { direction: 'Direction' } }, // Direction in struct
    component15: 'u8',
    component16: 'u16',
    component17: 'u32',
    component18: 'u64',
    component19: 'u128',
    component20: 'u256',
    component21: 'address',
    component22: 'bool',
    component23: 'vector<u8>',
    component24: 'vector<u16>',
    component25: 'vector<u32>',
    component26: 'vector<u64>',
    component27: 'vector<u128>',
    component28: 'vector<u256>',
    component29: 'vector<address>',
    component30: 'vector<bool>',
    component31: 'vector<vector<u8>>',
    component32: 'String',
    component33: 'vector<String>',

    // Keyed by player
    component1: { fields: { player: 'address', value: 'bool' }, keys: ['player'] },
    component4: { fields: { player: 'address', value: 'u32' }, keys: ['player'] },
    component10: { fields: { player: 'address', direction: 'Direction' }, keys: ['player'] },
    component11: {
      fields: { player: 'address', value: 'u32', direction: 'Direction' },
      keys: ['player']
    },

    // Keyed by player_id (u32 key)
    component2: { fields: { player_id: 'u32', value: 'bool' }, keys: ['player_id'] },

    // Keyed by direction (enum key)
    component12: {
      fields: { direction: 'Direction', player: 'address', value: 'u32' },
      keys: ['direction']
    },

    // Multi-field, no extra keys
    component6: { fields: { attack: 'u32', hp: 'u32' } }, // combat stats
    component7: { fields: { attack: 'u32', hp: 'u32' } }, // monster variant

    // Multi-field with keys
    component34: { fields: { name: 'vector<String>', age: 'u8' } },

    // Offchain components (no get/has generated)
    component13: { fields: { player: 'address', value: 'u32' }, keys: ['player'], offchain: true },
    component14: {
      fields: { entity_id: 'address', result: 'Direction' },
      keys: ['entity_id'],
      offchain: true
    },

    // ── Resources 0-9 ───────────────────────────────────────────────────────

    resource0: 'u32', // simple u32, no keys
    resource1: { fields: { player: 'address', value: 'u32' } }, // multi-field, no keys
    resource2: { fields: { player: 'address', value: 'u32', direction: 'Direction' } },
    resource3: 'Direction', // single Direction value
    resource4: { fields: { player: 'address', value: 'u32' }, keys: ['player'] }, // keyed, isSingleValue
    resource5: {
      fields: { player: 'address', id: 'u32', value: 'u32' },
      keys: ['player', 'id']
    }, // two keys
    resource6: {
      fields: {
        player: 'address',
        id1: 'u32',
        id2: 'u32',
        value1: 'u32',
        value2: 'u32'
      },
      keys: ['player', 'id1', 'id2']
    }, // three keys, two value fields
    resource7: { fields: { player: 'address', value: 'u32' }, offchain: true }, // offchain
    resource8: { fields: { player: 'address', name: 'String' } }, // String field
    resource9: {
      fields: { player: 'address', name: 'vector<String>', age: 'u32' },
      keys: ['player']
    }, // keyed, multi-field with vector<String>

    // ── New annotation scenarios ─────────────────────────────────────────────

    // global: true — DApp-wide singleton stored in DappStorage (no per-user key)
    game_config: {
      fields: { max_players: 'u32', season: 'u32' },
      global: true
    },

    // fungible: true — quantity-based resource with add/sub
    gold: {
      fields: { amount: 'u64' },
      fungible: true,
      transferable: true
    },

    // unique: true — non-fungible with mint + item_id key
    sword: {
      fields: { item_id: 'u64', power: 'u32' },
      unique: true,
      keys: ['item_id'],
      transferable: true,
      listable: true
    },

    // reactive: true — cross-user scene writes (e.g. dealing damage)
    hp: {
      fields: { current: 'u64', max: 'u64' },
      reactive: true
    }
  },

  objects: {
    vault: {
      fields: { level: 'u32' },
      accepts: ['gold', 'sword'],
      acceptsFrom: ['dungeon']
    }
  },

  scenes: {
    arena: {
      fields: { round: 'u32' },
      accepts: ['gold']
    },
    dungeon: {
      fields: { floor: 'u32' },
      accepts: ['gold', 'sword'],
      acceptsFrom: ['arena']
    }
  },

  errors: {
    not_authorized: 'Caller is not authorized',
    insufficient_level: 'Level requirement not met'
  }
};

// Allow `dubhe generate --config-path example.config.ts` to work alongside
// the named `exampleConfig` import used by all-types.test.ts.
export const dubheConfig = exampleConfig;
