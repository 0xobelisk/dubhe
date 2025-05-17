import { DubheConfig } from '@0xobelisk/aptos-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter',
  systems: ['counter_system'],
  schemas: {
    counter: {
      valueType: 'u64',
      defaultValue: 0,
    },
  },
} as DubheConfig;
