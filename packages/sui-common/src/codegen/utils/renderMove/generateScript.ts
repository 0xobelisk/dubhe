import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
import { capitalizeAndRemoveUnderscores } from './generateSchema';

import { readFileSync } from 'fs';

export function extractLogicAndAuthorizationContent(filePath: string): string {
	const fileContent = readFileSync(filePath, 'utf-8');
	const logicAndAuthRegex = /\/\/ Logic that needs to be automated once the contract is deployed\s*\{([\s\S]*?)\}\s*;\s*\/\/ Authorize schemas and public share objects/;
	const match = fileContent.match(logicAndAuthRegex);

	if (match) {
		return match[1].trim();
	} else {
		throw new Error('Logic and authorization block not found in the file.');
	}
}

export async function generateDeployHook(
	config: DubheConfig,
	srcPrefix: string
) {
	console.log('\n📝 Starting Deploy Hook Generation...');
	console.log(
		`  └─ Output path: ${srcPrefix}/contracts/${config.name}/sources/scripts/deploy_hook.move`
	);

	const schemas = Object.keys(config.schemas).map(schemaName => { return `_${schemaName}: &mut ${capitalizeAndRemoveUnderscores(schemaName)}`}).join(',')
	const importSchemas = Object.keys(config.schemas).map(schemaName => { return `use ${config.name}::${schemaName}_schema::${capitalizeAndRemoveUnderscores(schemaName)};`}).join('\n')
	const path = `${srcPrefix}/contracts/${config.name}/sources/scripts/deploy_hook.move`;
	let code = '';
	if (!existsSync(path)) {
		code = `module ${config.name}::deploy_hook {
			use std::ascii::string;
			use sui::clock::Clock;
			use ${config.name}::dapp_system;
		  public entry fun run(clock: &Clock, ctx: &mut TxContext) {
		  // Create a dapp.
    	  let mut dapp = dapp_system::create(string(b"${config.name}"),string(b"${config.description}"), clock , ctx);
    
		 // Create schemas
		let mut schema = ${config.name}::schema::create(ctx);
			// Logic that needs to be automated once the contract is deployed
			{
			};
			// Authorize schemas and public share objects
			 dapp.add_schema(schema);
			 sui::transfer::public_share_object(dapp);
		  }
}` } else {
		const content = extractLogicAndAuthorizationContent(path);
		code = `module ${config.name}::deploy_hook {
			use std::ascii::string;
			use sui::clock::Clock;
			use ${config.name}::dapp_system;
		  public entry fun run(clock: &Clock, ctx: &mut TxContext) {
		  // Create a dapp.
    	  let mut dapp = dapp_system::create(string(b"${config.name}"),string(b"${config.description}"), clock , ctx);
    
		 // Create schemas
			let mut schema = ${config.name}::schema::create(ctx);
			// Logic that needs to be automated once the contract is deployed
			
			{
			${content}
			};
			
			// Authorize schemas and public share objects
			 dapp.add_schema(schema);
			 sui::transfer::public_share_object(dapp);
		  }
}`
	}
	await formatAndWriteMove(
		code,
		path,
		'formatAndWriteMove'
	);
	console.log('✅ Deploy Hook Generation Complete\n');
}

export async function generateMigrate(config: DubheConfig, srcPrefix: string) {
	if (
		!existsSync(
			`${srcPrefix}/contracts/${config.name}/sources/scripts/migrate.move`
		)
	) {
		let code = `module ${config.name}::migrate {
    const ON_CHAIN_VERSION: u32 = 1;

    public fun on_chain_version(): u32 {
        ON_CHAIN_VERSION
    }
}
`;
		await formatAndWriteMove(
			code,
			`${srcPrefix}/contracts/${config.name}/sources/scripts/migrate.move`,
			'formatAndWriteMove'
		);
	}
}
