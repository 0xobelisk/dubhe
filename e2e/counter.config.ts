import { defineConfig } from '@0xobelisk/sui-common';

export const counterConfig = defineConfig({
  name: 'counter',
  description: 'counter contract',
  resources: {
    value: {
      global: true,
      fields: { value: 'u32' }
    }
  }
});
