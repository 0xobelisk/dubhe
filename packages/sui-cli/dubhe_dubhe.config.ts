import {DubheConfig, storage} from '@0xobelisk/sui-common';

export const dubheConfig = {
    name: 'dubhe',
    description: 'Dubhe Protocol',
    data: {
        AccountStatus: ['Liquid', 'Frozen', 'Blocked'],
        AssetStatus: ['Liquid', 'Frozen'],
        AssetType: ['LP', 'Wrapped', 'Private', 'Package'],
        Account: { balance: 'u256', status: 'AccountStatus' },
        AssetMetadata: {
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
            // Extra information about this asset. Generally used for display purposes.
            extra_info: 'String',
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
        Pool: {
            pool_address: 'address',
            lp_asset_id: 'u256',
        },
        PathElement: {
            asset_id: 'u256',
            balance: 'u256',
        },
        BridgeConfig: {
            min_amount: 'u256',
            fee: 'u256',
            opened: 'bool',
        },
        DappMetadata: {
          name: 'String',
          description: 'String',
          cover_url: 'vector<String>',
          website_url: 'String',
          created_at: 'u64',
          partners: 'vector<String>',
        },
    },
    schemas: {
        next_asset_id: storage('u256'),
        asset_metadata: storage('u256', 'AssetMetadata'),
        account: storage('u256', 'address', 'Account'),
        swap_fee: storage('u256'),
        lp_fee: storage('u256'),
        fee_to: storage('address'),
        max_swap_path_len: storage('u64'),
        min_liquidity: storage('u256'),
        pools: storage('u256', 'u256', 'Pool'),
        bridge: storage('String', 'BridgeConfig'),
        dapp_admin: storage('address', 'address'),
        dapp_version: storage('address', 'u32'),
        dapp_pausable: storage('address', 'bool'),
        dapp_metadata: storage('address', 'DappMetadata'),
    },
    errors: {
        asset_not_found: "Asset not found",
        asset_already_frozen: "Asset already frozen",
        asset_not_liquid: "Asset not liquid",
        asset_not_frozen: "Asset not frozen",
        invalid_sender: "Invalid sender",
        invalid_receiver: "Invalid receiver",
        account_not_found: "Account not found",
        account_blocked: "Account is blocked",
        account_frozen: "Account is frozen",
        balance_too_low: "Balance too low",
        overflows: "Operation overflows",
        no_permission: "No permission",
        not_mintable: "Asset is not mintable",
        not_burnable: "Asset is not burnable",
        not_freezable: "Asset is not freezable",
        pool_already_exists: "Pool already exists",
        below_min_amount: "Amount is below minimum",
        below_min_liquidity: "Amount is below Liquidity",
        pool_not_found: "Pool not found",
        more_than_max_swap_path_len: "More than Max",
        swap_path_too_small: "Swap path too small",
        reserves_cannot_be_zero: "Reserve cannot be 0",
        amount_cannot_be_zero: "Amount cannot be 0",
        less_than_amount_out_min: "Less than expected",
        more_than_amount_in_max: "More than expected",
        chain_not_supported: "Chain not supported",
        bridge_not_opened: "Bridge is not opened",
        below_min_bridge_amount: "Amount is below minimum",
    },
    events: {
        asset_created: {
            asset_id: 'u256',
            name: 'String',
            symbol: 'String',
            owner: 'address',
            is_mintable: 'bool',
            is_burnable: 'bool',
            is_freezable: 'bool',
        },
        asset_transferred: {
            asset_id: 'u256',
            from: 'address',
            to: 'address',
            amount: 'u256',
        },
        ownership_transferred: {
            asset_id: 'u256',
            from: 'address',
            to: 'address',
        },
        pool_created: {
            creator: 'address',
            asset1_id: 'u256',
            asset2_id: 'u256',
            pool_address: 'address',
            lp_asset_id: 'u256',
            lp_asset_symbol: 'String',
        },
        liquidity_added: {
            who: 'address',
            asset1_id: 'u256',
            asset2_id: 'u256',
            asset1_amount: 'u256',
            asset2_amount: 'u256',
            lp_asset_id: 'u256',
            lp_asset_minted: 'u256',
        },
        liquidity_removed: {
            who: 'address',
            asset1_id: 'u256',
            asset2_id: 'u256',
            asset1_amount: 'u256',
            asset2_amount: 'u256',
            lp_asset_id: 'u256',
            lp_asset_burned: 'u256',
        },
        swap_executed: {
            who: 'address',
            send_to: 'address',
            amount_in: 'u256',
            amount_out: 'u256',
            path: 'vector<u256>',
        },
        asset_wrapped: {
            from: 'address',
            asset_id: 'u256',
            amount: 'u256',
            beneficiary: 'address',
        },
        asset_unwrapped: {
            from: 'address',
            asset_id: 'u256',
            amount: 'u256',
            beneficiary: 'address',
        },
        bridge_withdraw: {
            asset_id: 'u256',
            from: 'address',
            to: 'address',
            to_chain: 'String',
            amount: 'u256',
            fee: 'u256',
        },
        bridge_deposit: {
            asset_id: 'u256',
            from: 'address',
            to: 'address',
            from_chain: 'String',
            amount: 'u256',
        }
  },
} as DubheConfig;
