import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter contract',
  systems: ['counter'],
  schemas: {
    te: {
      structure: {
        value: "StorageValue<u32>"
      }
    },
  },
} as DubheConfig;
