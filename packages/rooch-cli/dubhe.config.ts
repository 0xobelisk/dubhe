import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'Counter',
  systems: ['counter'],
  schemas: {
    counter: {
      structure: {
        value: 'StorageValue<u32>'
      }
    }
  }
} as DubheConfig;
