import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter',
  description: 'counter contract',
  components: {},
  resources: {
    asset_balance: {
      fields: {
        balance: 'u256'
      }
    },
    asset_pool: {
      global: true,
      fields: {
        asset0: 'address',
        asset1: 'address',
        pool_address: 'address',
        lp_asset: 'address',
        reserve0: 'u128',
        reserve1: 'u128',
        k_last: 'u256'
      },
      keys: ['asset0', 'asset1']
    }
  },
  errors: {
    invalid_increment: "Number can't be incremented, must be more than 0"
  }
} as DubheConfig;
