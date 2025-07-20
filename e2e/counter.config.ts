import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'counter',
  description: 'counter',
  components: { },
  resources: {
    // Only has a value
    value: 'u32',
  }
})
