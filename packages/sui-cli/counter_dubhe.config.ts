import { DubheConfig, storage } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter contract',
  schemas: {
    counter: storage('u32'),
    counter_v2: storage('u32'),
  },
  events: {
    Increment: {
      value: 'u32'
    }
  },
  errors: {
    InvalidIncrement: "Number can't be incremented, must be more than 0"
  }
} as DubheConfig;
