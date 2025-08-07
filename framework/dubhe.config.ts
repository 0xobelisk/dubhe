import {DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
    name: 'dubhe',
    description: 'Dubhe Protocol',
    enums: {
        AccountStatus: ['Liquid', 'Frozen', 'Blocked'],
        AssetStatus: ['Liquid', 'Frozen'],
        AssetType: ['Lp', 'Wrapped', 'Private', 'Package'],
    },
    resources: {
        dubhe_asset_id: 'address',
        dubhe_config: {
            fields: {
                next_asset_id: 'u256',
                swap_fee: 'u256',
                fee_to: 'address',
                max_swap_path_len: 'u64',
                admin: 'address',
            }
        },
        asset_metadata: {
            fields: {
                asset_id: 'address',
                // The user friendly name of this asset. Limited in length by `StringLimit`.
                name: 'String',
                // The ticker symbol for this asset. Limited in length by `StringLimit`.
                symbol: 'String',
                // A short description of this asset.
                description: 'String',
                // The number of decimals this asset uses to represent one unit.
                decimals: 'u8',
                // Asset icon url 
                icon_url: 'String',
                // Can change `owner`, `issuer`, `freezer` and `admin` accounts.
                owner: 'address',
                // The total supply across all accounts.
                supply: 'u256',
                // The total number of accounts.
                accounts: 'u256',
                // The status of the asset
                status: 'AssetStatus',
                // Whether the asset is mintable.
                is_mintable: 'bool',
                // Whether the asset is burnable.
                is_burnable: 'bool',
                // Whether the asset is freezable.
                is_freezable: 'bool',
                // The type of the asset.
                asset_type: 'AssetType',
            },
            keys: ['asset_id']
        }, 
        asset_account: {
            fields: {
                asset_id: 'address',
                account: 'address',
                balance: 'u256',
                status: 'AccountStatus'
            },
            keys: ['asset_id', 'account']
        },
        asset_pools: {
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
        },
        bridge_config: {
            fields: {
                chain: 'String',
                min_amount: 'u256',
                fee: 'u256',
                opened: 'bool'
            },
            keys: ['chain']
        },
        bridge_withdraw: {
            offchain: true,
            fields: {
                from: 'address',
                to: 'address',
                to_chain: 'String',
                amount: 'u256',
                fee: 'u256'
            }
        },
        bridge_deposit: { 
            offchain: true,
            fields: {
                from: 'address',
                to: 'address',
                from_chain: 'String',
                amount: 'u256'
            }
        },
        wrapper_assets: {
            fields: {
                coin_type: 'String',
                asset_id: 'address',
            },
            keys: ['coin_type']    
        },
        dapp_metadata: {
            fields: {
                dapp_key: 'String',
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
            },
            keys: ['dapp_key']
        },
        dapp_fee_config: {
            fields: { 
                free_credit: 'u256',
                base_fee: 'u256',
                byte_fee: 'u256',
            }
        },
        dapp_fee_state: {
            fields: {
                dapp_key: 'String',
                base_fee: 'u256',
                byte_fee: 'u256',
                free_credit: 'u256',
                total_bytes_size: 'u256',
                total_recharged: 'u256',
                total_paid: 'u256',
            },
            keys: ['dapp_key']
        },
        dapp_proxy: {
            fields: {
                dapp_key: 'String',
                delegator: 'address',
                enabled: 'bool',
            },
            keys: ['dapp_key']
        }
    },
    components: { },
     errors: {
        asset_not_found: "Asset not found",
        asset_already_frozen: "Asset already frozen",
        invalid_sender: "Invalid sender",
        invalid_receiver: "Invalid receiver",
        invalid_metadata: "Invalid metadata",
        account_not_found: "Account not found",
        account_blocked: "Account is blocked",
        account_frozen: "Account is frozen",
        balance_too_low: "Balance too low",
        overflows: "Operation overflows",
        no_permission: "No permission",
        not_mintable: "Asset is not mintable",
        not_burnable: "Asset is not burnable",
        not_freezable: "Asset is not freezable",
        below_min_amount: "Amount is below minimum",
        liquidity_cannot_be_zero: "Liquidity cannot be 0",
        more_than_max_swap_path_len: "More than Max",
        more_than_reserve: "More than reserve",
        swap_path_too_small: "Swap path too small",
        reserves_cannot_be_zero: "Reserve cannot be 0",
        amount_cannot_be_zero: "Amount cannot be 0",
        less_than_amount_out_min: "Less than expected",
        more_than_amount_in_max: "More than expected",
        bridge_not_opened: "Bridge is not opened",
        not_latest_version: "Not latest version",
        dapp_already_paused: "Dapp already paused",
        invalid_package_id: "Invalid package id",
        invalid_version: "Invalid version",
        dapp_not_initialized: "Dapp not initialized",
        dapp_already_initialized: "Dapp already initialized",
        insufficient_credit: "Insufficient credit",
        dapp_not_been_delegated: "Dapp not been delegated",
        dapp_already_delegated: "Dapp already delegated",
    },
} as DubheConfig;