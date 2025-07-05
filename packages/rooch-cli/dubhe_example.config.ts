import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
	name: 'examples',
	description: 'examples',
	systems: ['example_system'],
	schemas: {
		example: {
			data: [
				{
					name: 'SingleColumn',
					fields: 'u64',
				},
				{
					name: 'MultiColumn',
					fields: {
						state: 'vector<u8>',
						last_update_time: 'u64',
					},
				},
				{
					name: 'SingleStruct',
					fields: {
						admin: 'address',
						fee: 'u64',
					},
				},
			],
			structure: {
				single_column: 'StorageValue<u64>',
				multi_column: 'StorageMap<address, MultiColumn>',
				ephemeral: 'EphemeralValue<u64>',
				single_value: 'StorageValue<u64>',
				single_struct: 'StorageValue<SingleStruct>',
			},
		},
	},
} as DubheConfig;
