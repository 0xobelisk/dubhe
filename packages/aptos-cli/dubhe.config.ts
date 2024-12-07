import { DubheConfig } from '@0xobelisk/aptos-common';

export const dubheConfig = {
	name: 'counter',
	description: 'examples',
	systems: ['example_system'],
	schemas: {
		single_column: 'u64',
		single_column_1: 'string',
		single_column_2: 'vector<string>',
		multi_column: {
			valueType: {
				state: 'vector<u8>',
				a: 'vector<string>',
				b: 'string',
				last_update_time: 'u64',
			},
		},
		ephemeral: {
			ephemeral: true,
			valueType: {
				caller: 'address',
				value: 'u64',
				flag: 'bool',
			},
		},
		single_value: {
			valueType: 'u64',
			defaultValue: 1000,
		},

		single_value_1: {
			valueType: 'vector<u8>',
			defaultValue: [],
		},

		single_value_2: {
			valueType: 'vector<vector<u8>>',
			defaultValue: [[]],
		},
		single_value_4: {
			valueType: 'vector<bool>',
			defaultValue: [],
		},

		single_value_5: {
			valueType: 'vector<string>',
			defaultValue: [],
		},

		single_value_6: {
			valueType: 'vector<address>',
			defaultValue: [],
		},
		// single_value_7: {
		//   valueType: "vector<u8>",
		//   defaultValue: [1, 2, 3, 4, 5],
		// },
		// single_value_8: {
		//   valueType: "vector<u8>",
		//   defaultValue: [1, 2, 3, 4, 5],
		// },
		// single_value_9: {
		//   valueType: "vector<u8>",
		//   defaultValue: [1, 2, 3, 4, 5],
		// },
		single_struct: {
			valueType: {
				admin: 'address',
				addr_list: 'vector<address>',
				bool_list: 'vector<bool>',
				fee: 'u64',
				name: 'string',
				name_list: 'vector<string>',
				map: 'vector<vector<u8>>',
			},
			defaultValue: {
				admin: '0x1',
				addr_list: [
					'0x1804b821bba181110599b8757008eabe6f89f62774d7fafb5ee666ac742a41f8',
					'0x341ede3aa40e29d6716ce92b2fdb977be5ac1129aa43eb024a8b5a9478204fe2',
					'0x34ea3ab186a2b8f217a71301ae447e01e9aa3e22bd4bc827f45a3a2f5381d9c4',
					'0x4f42679d98cd10fbc3daf9996a40e1bb9213315680489b978fe1681b7f00091d',
				],
				bool_list: [true, false, true],
				fee: 100,
				name: 'tom',
				name_list: ['bob', 'alice', 'tom'],
				map: [
					[1, 2, 3, 4, 5],
					[1, 35, 5, 6, 7, 9],
				],
			},
		},
		single_struct_empty: {
			valueType: {
				admin: 'address',
				addr_list: 'vector<address>',
				bool_list: 'vector<bool>',
				fee: 'u64',
				name: 'string',
				name_list: 'vector<string>',
				map: 'vector<vector<u8>>',
			},
			defaultValue: {
				admin: '@0x1',
				addr_list: [],
				bool_list: [],
				fee: 0,
				name: '',
				name_list: [],
				map: [[]],
			},
		},
	},
} as DubheConfig;
