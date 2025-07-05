import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter contract',
  enums: {
      direction: ["left", "right"]
  },
  components: {
    counter0: {},
    counter1: "u32",
  },
  resources: {
    counter2: { 
      fields: {
        value: "u32"
      }
    }
  },
  errors: {
    invalid_increment: "Number can't be incremented, must be more than 0"
  }
} as DubheConfig;
