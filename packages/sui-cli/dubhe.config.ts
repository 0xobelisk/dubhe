import { DubheConfig, storage } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'counter1',
  description: 'Merak Protocol',
  data: {
    AccountStatus: ['Liquid', 'Frozen', 'Blocked'],
    Status: ['Live', 'Frozen', 'Destroying'],
    Account: { balance: 'u256', status: 'AccountStatus' },
    Metadata: {
      // The user friendly name of this asset. Limited in length by `StringLimit`.
      name: 'String',
      // The ticker symbol for this asset. Limited in length by `StringLimit`.
      symbol: 'String',
      // A short description of this asset.
      description: 'String',
      // The number of decimals this asset uses to represent one unit.
      decimals: 'u8',
      // Asset icon url
      url: 'String',
      // Extra information about this asset. Generally used for display purposes.
      info: 'String'
    },
    Details: {
      // Can change `owner`, `issuer`, `freezer` and `admin` accounts.
      owner: 'address',
      // The total supply across all accounts.
      supply: 'u256',
      // The total number of accounts.
      accounts: 'u32',
      // The total number of approvals.
      approvals: 'u32',
      // The status of the asset
      status: 'Status',
      // Whether the asset is mintable.
      is_mintable: 'bool',
      // Whether the asset is burnable.
      is_burnable: 'bool',
      // Whether the asset is freezable.
      is_freezable: 'bool'
    },
    Pool: {
      pool_id: 'u32',
      pool_address: 'address',
      lp_asset_id: 'u32',
      asset1_id: 'u32',
      asset2_id: 'u32'
    },
    PathElement: { asset_id: 'u32', balance: 'u256' },
    Data: { asset_id: 'u32', balance: 'u256' },
    TestData: { asset_id: 'u32', balance: 'Data' }
  },
  schemas: {
    next_asset_id: storage('u32'),
    metadata: storage('u32', 'Metadata'),
    details: storage('u32', 'Details'),
    account: storage('address', 'u32', 'Account')
  },
  events: {
    created: {
      asset_id: 'u32',
      name: 'String',
      symbol: 'Metadata',
      owner: 'address',
      is_mintable: 'bool',
      is_burnable: 'bool',
      is_freezable: 'bool'
    },
    address_frozen: {
      asset_id: 'u32',
      owner: 'AccountStatus'
    },
    address_blocked: {
      asset_id: 'u32',
      owner: 'address'
    }
  },
  errors: {
    account_not_found: 'This account not found',
    asset_not_found: 'This asset not found'
  }
} as DubheConfig;
