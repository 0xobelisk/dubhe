import {BaseType, ErrorData, SchemaType} from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import {
	getStructAttrsWithType,
	getStructAttrs,
	getStructTypes,
	getStructAttrsQuery,
} from './common';

function convertToSnakeCase(input: string): string {
	return input
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '');
}

export async function generateSchemaError(
	projectName: string,
	errors: ErrorData,
	path: string
) {
	console.log('\n📦 Starting Schema Error Generation...');

	let	code = `module ${projectName}::errors {
		${Object.entries(errors).map(([name, message]) => {
			console.log(`  ├─ Generating Error: ${name}`);
		console.log(`  │  └─ Message: ${message}`);
		return `#[error]
				const ${name}: vector<u8> = b"${message}";
				public fun ${convertToSnakeCase(name)}_error(condition: bool) { assert!(condition, ${name})  }
		`
	}).join('\n')}		
            }`


	await formatAndWriteMove(
		code,
		`${path}/contracts/${projectName}/sources/codegen/errors.move`,
		'formatAndWriteMove'
	);
	console.log('✅ Schema Error Generation Complete\n');
}