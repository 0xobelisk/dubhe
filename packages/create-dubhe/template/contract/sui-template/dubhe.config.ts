import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
	name: 'counter',
	description: 'counter contract',
	schemas: {
		counter: {
			structure: {
				value: 'StorageValue<u32>',
			},
			events: [
				{
					name: 'Increment',
					fields: {
						value: 'u32',
					},
				},
			],
			errors: [
				{
					name: 'InvalidIncrement',
					code: 0,
					description: 'Increment must be greater than zero',
				},
			]
		},
	},
} as DubheConfig;
