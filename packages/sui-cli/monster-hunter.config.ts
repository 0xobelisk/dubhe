import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'monster_hunter',
  description: 'monster_hunter contract',
  enums: {
    Direction: ["North", "East", "South", "West"],
    MonsterCatchResult: ["Missed", "Caught", "Fled"],
    MonsterType: ["Eagle", "Rat", "Caterpillar"],
    TerrainType: ["None", "TallGrass", "Boulder"]
  },
  errors: {
    cannot_move: 'This entity cannot move',
    already_registered: 'This address is already registered',
    space_obstructed: 'This space is obstructed',
    in_encounter: 'This player is already in an encounter',
    not_in_encounter: 'This player is not in an encounter',
  },
  components: {
    player: {},
    moveable: {},
    obstruction: {},
    encounterable: {},
    encounter_trigger: {},
    position: {
      fields: {
        x: 'u64',
        y: 'u64',
      },
    },
    encounter: {
      fields: {
        monster: 'address',
        catch_attempts: 'u64',
      }
    },
    monster: {
      fields: {
        id: 'address',
        monster_type: 'MonsterType',
      },
      keys: ["id"]
    },
    owned_by: "address",
    monster_catch_attempt: {
      fields: {
        monster: 'address',
        result: 'MonsterCatchResult',
      },
      keys: ["monster"]
    },
  },
  resources: {
    map_config: {
      fields: {
        width: 'u64',
        height: 'u64',
        terrain: 'vector<u32>',
      },
      keys: []
    },
  }
} as DubheConfig;