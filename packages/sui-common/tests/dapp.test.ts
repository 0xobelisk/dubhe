import { describe, it, expect } from 'vitest';
import { defineConfig } from '../src/codegen/utils/renderMove/dapp';
import { DubheConfig, MoveType } from '../src/codegen/types';

describe('defineConfig', () => {
  it('should generate correct Move module with basic config', () => {
    const config: DubheConfig = {
      name: 'game',
      description: 'Game module',
      components: {
        player: {
          fields: {
            id: 'address',
            name: 'vector<u8>',
            level: 'u64'
          },
          keys: ['id']
        },
        monster: {
          fields: {
            id: 'vector<u8>',
            name: 'vector<u8>',
            hp: 'u64'
          },
          keys: ['id']
        }
      },
      resources: {
        game_state: {
          fields: {
            id: 'address'
          }
        }
      }
    };

    const _result = defineConfig(config);
  });

  it('should handle config with offchain table', () => {
    const config: DubheConfig = {
      name: 'game',
      description: 'Game module',
      components: {
        player: {
          offchain: true,
          fields: {
            id: 'vector<u8>' as MoveType,
            name: 'vector<u8>' as MoveType,
            level: 'u64' as MoveType
          },
          keys: ['id']
        }
      },
      resources: {
        game_state: {
          fields: {
            id: 'address'
          }
        }
      }
    };

    defineConfig(config);
  });

  it('should handle config with simple table type', () => {
    const config: DubheConfig = {
      name: 'game',
      description: 'Game module',
      components: {
        player: 'bool',
        movable: 'bool'
      },
      resources: {
        game_state: {
          fields: {
            id: 'address'
          }
        }
      }
    };

    defineConfig(config);
  });

  it('should handle empty config', () => {
    const config: DubheConfig = {
      name: 'game',
      description: 'Game module',
      components: {},
      resources: {}
    };

    defineConfig(config);
  });

  it('should throw error when duplicate keys exist between resources and objects', () => {
    const config: DubheConfig = {
      name: 'game',
      description: 'Game module',
      resources: {
        player: {
          fields: { id: 'address', level: 'u64' },
          transferable: true
        }
      },
      objects: {
        player: {
          accepts: []
        }
      }
    };

    expect(() => defineConfig(config)).toThrow(
      'Duplicate module names found across resources/objects/scenes: player'
    );
  });

  it('should throw error when duplicate keys exist between resources and scenes', () => {
    const config: DubheConfig = {
      name: 'game',
      description: 'Game module',
      resources: {
        arena: { fields: { hp: 'u64' } }
      },
      scenes: {
        arena: { accepts: [] }
      }
    };

    expect(() => defineConfig(config)).toThrow(
      'Duplicate module names found across resources/objects/scenes: arena'
    );
  });

  it('should throw error for global + reactive combination', () => {
    expect(() =>
      defineConfig({
        name: 'game',
        description: '',
        resources: { score: { fields: { v: 'u64' }, global: true, reactive: true } }
      })
    ).toThrow(/global.*reactive|reactive.*global/);
  });

  it('should throw error for global + listable combination', () => {
    expect(() =>
      defineConfig({
        name: 'game',
        description: '',
        resources: { score: { fields: { v: 'u64' }, global: true, listable: true } }
      })
    ).toThrow(/global.*listable|listable.*global/);
  });

  it('should throw error for global + transferable combination', () => {
    expect(() =>
      defineConfig({
        name: 'game',
        description: '',
        resources: { score: { fields: { v: 'u64' }, global: true, transferable: true } }
      })
    ).toThrow(/global.*transferable|transferable.*global/);
  });
});
