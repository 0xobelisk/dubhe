import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { schemaGen } from '../src/codegen/utils/renderMove/schemaGen';
import { DubheConfig } from '../src/codegen/types';
import path from 'path';
import fs from 'fs';
import { error } from 'console';

describe('schemaGen', () => {
  const testConfig: DubheConfig = {
    name: 'test_project',
    description: 'Test project for schema generation',
    enums: {
      Status: ['Missed', 'Caught', 'Fled'],
      Direction: ['North', 'East', 'South', 'West'],
      AssetType: ['Lp', 'Wrapped', 'Private', 'Package']
    },
    components: {
      // Only has a key
      component0: {},
      component1: {
        fields: {
          player: 'address'
        },
        keys: ['player']
      },
      component2: {
        fields: {
          player_id: 'u32'
        },
        keys: ['player_id']
      },

      // Only has a key and a value
      component3: 'u32',
      component4: {
        fields: {
          player: 'address',
          value: 'u32'
        },
        keys: ['player']
      },
      component5: {
        fields: {
          value: 'u32'
        }
      },
      // Only has a key and some fields
      component6: {
        fields: {
          attack: 'u32',
          hp: 'u32'
        }
      },
      component7: {
        fields: {
          monster: 'address',
          attack: 'u32',
          hp: 'u32'
        },
        keys: ['monster']
      },

      // Enum
      component8: 'Direction',
      component9: {
        fields: {
          direction: 'Direction'
        }
      },
      component10: {
        fields: {
          player: 'address',
          direction: 'Direction'
        },
        keys: ['player']
      },
      component11: {
        fields: {
          player: 'address',
          value: 'u32',
          direction: 'Direction'
        },
        keys: ['player']
      },
      component12: {
        fields: {
          direction: 'Direction',
          player: 'address',
          value: 'u32'
        },
        keys: ['direction']
      },

      // Offchain
      component13: {
        offchain: true,
        fields: {
          player: 'address',
          value: 'u32'
        },
        keys: ['player']
      },
      component14: {
        offchain: true,
        fields: {
          result: 'Status'
        }
      },

      component15: 'String',
      component16: {
        fields: {
          player: 'address',
          name: 'String',
          age: 'u8',
        },
        keys: ['player']
      },
      component17: 'vector<String>',
      //
      test_component: {
        fields: {
          player: 'address',
          value: 'u32'
        }
      }
    },
    resources: {
      // Only has a value
      resource0: 'u32',
      resource1: {
        fields: {
          player: 'address',
          value: 'u32'
        }
      },
      resource2: {
        fields: {
          player: 'address',
          value: 'u32',
          direction: 'Direction'
        }
      },
      resource3: 'Direction',

      // Has a key and a value
      resource4: {
        fields: {
          player: 'address',
          value: 'u32'
        },
        keys: ['player']
      },
      resource5: {
        fields: {
          player: 'address',
          id: 'u32',
          value: 'u32'
        },
        keys: ['player', 'id']
      },
      resource6: {
        fields: {
          player: 'address',
          id1: 'u32',
          id2: 'u32',
          value1: 'u32',
          value2: 'u32'
        },
        keys: ['player', 'id1', 'id2']
      },

      // Offchain
      resource7: {
        offchain: true,
        fields: {
          player: 'address',
          value: 'u32'
        }
      },
      resource8: 'String',
      resource9: {
        fields: {
          player: 'address',
          value: 'String'
        }
      },
      resource10: {
        fields: {
          name: 'String',
          player: 'address',
          value: 'String'
        },
        keys: ['name']
      },
      test_resource: {
        fields: {
          player: 'address',
          value: 'u32'
        }
      }
    }
  };

  const testDir = path.join(__dirname, 'test_project');

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      // fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should generate schema files', async () => {
    await schemaGen(testDir, testConfig, 'testnet');
  });
});
