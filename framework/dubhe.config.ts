import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'dubhe',
  description: 'Dubhe Protocol',
  resources: {
    dubhe_config: {
      global: true,
      fields: {
        next_asset_id: 'u256',
        swap_fee: 'u256',
        fee_to: 'String',
        max_swap_path_len: 'u64',
        admin: 'String'
      }
    },
    dapp_metadata: {
      fields: {
        name: 'String',
        description: 'String',
        website_url: 'String',
        cover_url: 'vector<String>',
        partners: 'vector<String>',
        package_ids: 'vector<address>',
        created_at: 'u64',
        admin: 'address',
        version: 'u32',
        pausable: 'bool'
      }
    },
    dapp_fee_config: {
      global: true,
      fields: {
        free_credit: 'u256',
        base_fee: 'u256',
        byte_fee: 'u256'
      }
    },
    dapp_fee_state: {
      fields: {
        base_fee: 'u256',
        byte_fee: 'u256',
        free_credit: 'u256',
        total_bytes_size: 'u256',
        total_recharged: 'u256',
        total_paid: 'u256',
        total_set_count: 'u256'
      }
    }
    // session: {
    //   fields: {
    //     dapp_key: 'String',
    //     account: 'address',
    //     owner: 'String'
    //   },
    //   keys: ['dapp_key', 'account']
    // }
  },
  components: {},
  errors: {
    asset_not_found: 'Asset not found',
    asset_already_frozen: 'Asset already frozen',
    invalid_sender: 'Invalid sender',
    invalid_receiver: 'Invalid receiver',
    invalid_metadata: 'Invalid metadata',
    account_not_found: 'Account not found',
    account_blocked: 'Account is blocked',
    account_frozen: 'Account is frozen',
    balance_too_low: 'Balance too low',
    overflows: 'Operation overflows',
    no_permission: 'No permission',
    not_mintable: 'Asset is not mintable',
    not_burnable: 'Asset is not burnable',
    not_freezable: 'Asset is not freezable',
    below_min_amount: 'Amount is below minimum',
    liquidity_cannot_be_zero: 'Liquidity cannot be 0',
    more_than_max_swap_path_len: 'More than Max',
    more_than_reserve: 'More than reserve',
    swap_path_too_small: 'Swap path too small',
    reserves_cannot_be_zero: 'Reserve cannot be 0',
    amount_cannot_be_zero: 'Amount cannot be 0',
    less_than_amount_out_min: 'Less than expected',
    more_than_amount_in_max: 'More than expected',
    bridge_not_opened: 'Bridge is not opened',
    not_latest_version: 'Not latest version',
    dapp_already_paused: 'Dapp already paused',
    invalid_package_id: 'Invalid package id',
    invalid_version: 'Invalid version',
    dapp_not_initialized: 'Dapp not initialized',
    dapp_already_initialized: 'Dapp already initialized',
    insufficient_credit: 'Insufficient credit',
    dapp_not_been_delegated: 'Dapp not been delegated',
    dapp_already_delegated: 'Dapp already delegated'
  }
} as DubheConfig;
