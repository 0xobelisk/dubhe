import { DubheConfig, storage } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter contract',
  schemas: {
    value: storage('u32'),
  },
  events: {
    increment: { value: 'u32' },
  },
  errors: {
    invalid_increment: "Number can't be incremented, must be more than 0",
  },
} as DubheConfig;
