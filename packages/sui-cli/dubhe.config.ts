import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
	name: 'merak',
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
			info: 'String',
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
			is_freezable: 'bool',
		},
		Pool: {
			pool_id: 'u32',
			pool_address: 'address',
			lp_asset_id: 'u32',
			asset1_id: 'u32',
			asset2_id: 'u32',
		},
		PathElement: { asset_id: 'u32', balance: 'u256' },
	},
	schemas: {
		next_asset_id: 'StorageValue<u32>',
		metadata: 'StorageMap<u32, Metadata>',
		details: 'StorageMap<u32, Details>',
		details1: 'StorageMap<u32, address>',
		account: 'StorageDoubleMap<u32, address, Account>',
		account1: 'StorageDoubleMap<u32, address, address>',
	},
	events: {
		Created: {
			asset_id: 'u32',
			name: 'String',
			symbol: 'String',
			owner: 'address',
			is_mintable: 'bool',
			is_burnable: 'bool',
			is_freezable: 'bool',
		},
		Minted: {
			asset_id: 'u32',
			to: 'address',
			amount: 'u256',
		},
		Burned: {
			asset_id: 'u32',
			from: 'address',
			amount: 'u256',
		},
		Transferred: {
			asset_id: 'u32',
			from: 'address',
			to: 'address',
			amount: 'u256',
		},
		FrozenAddress: {
			asset_id: 'u32',
			owner: 'address',
		},
		BlockedAddress: {
			asset_id: 'u32',
			owner: 'address',
		},
		ThawedAddress: {
			asset_id: 'u32',
			owner: 'address',
		},
		FrozenAsset: {
			asset_id: 'u32',
		},
		ThawedAsset: {
			asset_id: 'u32',
		},
		OwnershipTransferred: {
			asset_id: 'u32',
			from: 'address',
			to: 'address',
		},
		PoolCreated: {
			creator: 'address',
			pool_id: 'u32',
			pool_address: 'address',
			asset1_id: 'u32',
			asset2_id: 'u32',
			lp_asset_id: 'u32',
			lp_asset_symbol: 'String',
		},
		LiquidityAdded: {
			who: 'address',
			pool_id: 'u32',
			asset1_amount: 'u256',
			asset2_amount: 'u256',
			lp_asset_id: 'u32',
			lp_asset_minted: 'u256',
		},
		LiquidityRemoved: {
			who: 'address',
			pool_id: 'u32',
			asset1_amount: 'u256',
			asset2_amount: 'u256',
			lp_asset_id: 'u32',
			lp_asset_burned: 'u256',
		},
		SwapExecuted: {
			who: 'address',
			send_to: 'address',
			amount_in: 'u256',
			amount_out: 'u256',
			path: 'vector<u32>',
		},
		Registered: {
			who: 'address',
			asset_id: 'u32',
		},
		Wrapped: {
			from: 'address',
			asset_id: 'u32',
			amount: 'u256',
			beneficiary: 'address',
		},
		Unwrapped: {
			from: 'address',
			asset_id: 'u32',
			amount: 'u256',
			beneficiary: 'address',
		},
	},
	errors: {
		AccountNotFound: 'This account not found',
		AssetNotFound: 'This asset not found',
	},
} as DubheConfig;
