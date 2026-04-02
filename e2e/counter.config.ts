import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'counter',
  description: 'counter contract',
  resources: {
    value: {
      fields: { value: 'u32' }
    }
  }
});
