import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'constantinople',
  description: 'constantinople contract',
  data: {
    MonsterType: ['None', 'Eagle', 'Rat', 'Caterpillar'],
    Direction: ['North', 'East', 'South', 'West'],
    TerrainType: ['None', 'TallGrass', 'Boulder'],
    MonsterCatchResult: ['Missed', 'Caught', 'Fled'],
    MapConfig: { width: 'u64', height: 'u64', terrain: 'vector<vector<TerrainType>>' },
    Position: { x: 'u64', y: 'u64' },
    MonsterInfo: { monster: 'address', catch_attempts: 'u64' }
  },
  errors: {
    CannotMove: 'This entity cannot move',
    AlreadyRegistered: 'This address is already registered',
    NotRegistered: 'This address is not registered',
    SpaceObstructed: 'This space is obstructed',
    NotInEncounter: 'This player is not in an encounter'
  },
  events: {
    MonsterCatchAttempt: {
      player: 'address',
      monster: 'address',
      result: 'MonsterCatchResult'
    }
  },
  schemas: {
    entity: {
      player: 'StorageMap<address, bool>',
      monster: 'StorageMap<address, MonsterType>',
      obstruction: 'StorageMap<address, bool>',
      owned_by: 'StorageMap<address, vector<address>>',
      encounterable: 'StorageMap<address, bool>',
      moveable: 'StorageMap<address, bool>'
    },
    map: {
      config: 'StorageValue<MapConfig>',
      position: 'StorageMap<address, Position>'
    },
    encounter: {
      monster_info: 'StorageMap<address, MonsterInfo>',
      trigger: 'StorageMap<address, bool>'
    }
  }
} as DubheConfig;
