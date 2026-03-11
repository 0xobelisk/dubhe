import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'counter',
  description: 'counter contract',
  resources: {
    counter1: 'u32',
    counter2: {
      fields: {
        value: 'u32',
        data: 'u64'
      },
      keys: ['data']
    }
  },
  errors: {
    invalid_increment: "Number can't be incremented, must be more than 0"
  }
});
