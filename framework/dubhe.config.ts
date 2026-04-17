import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'dubhe',
  description: 'Dubhe Protocol',
  errors: {
    no_permission: 'No permission',
    not_latest_version: 'Not latest version',
    dapp_paused: 'Dapp is paused',
    invalid_package_id: 'Invalid package id',
    invalid_version: 'Invalid version',
    dapp_already_initialized: 'Dapp already initialized',
    insufficient_credit: 'Insufficient credit',
    no_pending_ownership_transfer: 'No pending ownership transfer',
    user_debt_limit_exceeded: 'User debt limit exceeded',
    dapp_suspended: 'Dapp is suspended',
    dapp_key_mismatch: 'Dapp key mismatch',
    no_active_session: 'No active session',
    not_canonical_owner: 'Not canonical owner',
    insufficient_credit_to_unsuspend: 'Insufficient credit to unsuspend',
    user_storage_already_exists: 'User storage already exists',
    invalid_session_key: 'Invalid session key',
    invalid_session_duration: 'Invalid session duration',
    wrong_payment_coin_type: 'Wrong payment coin type',
    no_pending_coin_type_change: 'No pending coin type change',
    coin_type_change_not_ready: 'Coin type change not ready'
  }
});
