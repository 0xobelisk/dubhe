import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'dubhe',
  description: 'Dubhe Protocol',
  resources: {
    dapp_metadata: {
      global: true,
      fields: {
        name: 'String',
        description: 'String',
        website_url: 'String',
        cover_url: 'vector<String>',
        partners: 'vector<String>',
        package_ids: 'vector<address>',
        created_at: 'u64',
        admin: 'address',
        pending_admin: 'address',
        version: 'u32',
        paused: 'bool'
      }
    }
  },
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
    dapp_paused: 'Dapp is paused',
    invalid_package_id: 'Invalid package id',
    invalid_version: 'Invalid version',
    dapp_not_initialized: 'Dapp not initialized',
    dapp_already_initialized: 'Dapp already initialized',
    insufficient_credit: 'Insufficient credit',
    dapp_not_been_delegated: 'Dapp not been delegated',
    dapp_already_delegated: 'Dapp already delegated',
    no_pending_ownership_transfer: 'No pending ownership transfer',
    user_debt_limit_exceeded: 'User debt limit exceeded',
    dapp_suspended: 'Dapp is suspended',
    dapp_key_mismatch: 'Dapp key mismatch',
    no_active_session: 'No active session',
    not_canonical_owner: 'Not canonical owner',
    insufficient_credit_to_unsuspend: 'Insufficient credit to unsuspend',
    user_storage_already_exists: 'User storage already exists',
    invalid_session_key: 'Invalid session key',
    invalid_session_duration: 'Invalid session duration'
  }
} as DubheConfig;
