import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'eve_extension',
  description: 'Sui EVE extension business scaffold for Dubhe',
  resources: {
    extension_config: {
      fields: {
        admin: 'address',
        paused: 'bool',
        max_units_per_call: 'u64'
      }
    },
    player_stats: {
      fields: {
        total_units: 'u64',
        call_count: 'u64',
        last_nonce: 'u64',
        tier: 'u8'
      }
    }
  },
  errors: {
    already_initialized: 'Extension config already initialized',
    not_initialized: 'Extension config is not initialized',
    admin_only: 'Only admin can update extension config',
    paused: 'Extension is paused',
    invalid_max_units: 'max_units_per_call must be greater than 0',
    invalid_units: 'units must be between 1 and max_units_per_call',
    invalid_nonce: 'nonce must be strictly increasing'
  }
});
