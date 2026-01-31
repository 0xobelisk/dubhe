import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'counter',
  description: 'counter contract',
  components: {},
  resources: {
    value: 'u32'
  },
  errors: {
    invalid_increment: "Number can't be incremented, must be more than 0"
  }
});
