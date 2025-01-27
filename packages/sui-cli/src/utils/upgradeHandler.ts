import { Dubhe } from '@0xobelisk/sui-client';
import { Transaction, UpgradePolicy } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { DubheCliError, UpgradeError } from './errors';
import {
    getOldPackageId,
    getVersion,
    getUpgradeCap,
    saveContractData,
    validatePrivateKey,
    getOnchainSchemas,
    switchEnv, getSchemaId,
} from './utils';
import * as fs from 'fs';
import * as path from 'path';
import { DubheConfig } from '@0xobelisk/sui-common';

type Migration = {
	schemaName: string;
	fields: string;
};

function updateMigrateMethod(
	projectPath: string,
	migrations: Migration[]
): void {
		let filePath = `${projectPath}/sources/codegen/schema.move`;
		const fileContent = fs.readFileSync(filePath, 'utf-8');
		const migrateMethodRegex = new RegExp(
			`public fun migrate\\(_schema: &mut Schema, _cap: &UpgradeCap, _ctx: &mut TxContext\\) {[^}]*}`
		);
		const newMigrateMethod = `
public fun migrate(_schema: &mut Schema, _cap: &UpgradeCap, _ctx: &mut TxContext) {
${migrations.map(migration => {
		let storage_type = '';
		if (migration.fields.includes('StorageValue')) {
			storage_type = `storage_value::new(b"${migration.schemaName}", _ctx)`;
		} else if (migration.fields.includes('StorageMap')) {
			storage_type = `storage_map::new(b"${migration.schemaName}", _ctx)`;
		} else if (migration.fields.includes('StorageDoubleMap')) {
			storage_type = `storage_double_map::new(b"${migration.schemaName}", _ctx)`;
		}
		return `storage::add_field<${migration.fields}>(&mut _schema.id, b"${migration.schemaName}", ${storage_type});`;
	})
	.join('')}
}
`;

		const updatedContent = fileContent.replace(
			migrateMethodRegex,
			newMigrateMethod
		);
		fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

function replaceEnvField(
	filePath: string,
	networkType: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
	field:
		| 'original-published-id'
		| 'latest-published-id'
		| 'published-version',
	newValue: string
): string {
	const envFilePath = path.resolve(filePath);
	const envContent = fs.readFileSync(envFilePath, 'utf-8');
	const envLines = envContent.split('\n');

	const networkSectionIndex = envLines.findIndex(
		line => line.trim() === `[env.${networkType}]`
	);
	if (networkSectionIndex === -1) {
		console.log(`Network type [env.${networkType}] not found in the file.`);
		return '';
	}

	let fieldIndex = -1;
	let previousValue: string = '';
	for (let i = networkSectionIndex + 1; i < envLines.length; i++) {
		const line = envLines[i].trim();
		if (line.startsWith('[')) break; // End of the current network section

		if (line.startsWith(field)) {
			fieldIndex = i;
			previousValue = line.split('=')[1].trim().replace(/"/g, '');
			break;
		}
	}

	if (fieldIndex !== -1) {
		envLines[fieldIndex] = `${field} = "${newValue}"`;
		const newEnvContent = envLines.join('\n');
		fs.writeFileSync(envFilePath, newEnvContent, 'utf-8');
	} else {
		console.log(`${field} not found for [env.${networkType}].`);
	}

	return previousValue;
}
export async function upgradeHandler(
	config: DubheConfig,
	name: string,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
	await switchEnv(network);

	const path = process.cwd();
	const projectPath = `${path}/contracts/${name}`;
	const privateKey = process.env.PRIVATE_KEY;
	if (!privateKey)
		throw new DubheCliError(
			`Missing PRIVATE_KEY environment variable.
Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
in your contracts directory to use the default sui private key.`
		);

	const privateKeyFormat = validatePrivateKey(privateKey);
	if (privateKeyFormat === false) {
		throw new DubheCliError(`Please check your privateKey.`);
	}
	const dubhe = new Dubhe({
		secretKey: privateKeyFormat,
	});
	const keypair = dubhe.getSigner();

	const client = new SuiClient({
		url: getFullnodeUrl(network),
	});

	let oldVersion = Number(await getVersion(projectPath, network));
	let oldPackageId = await getOldPackageId(projectPath, network);
	let upgradeCap = await getUpgradeCap(projectPath, network);
	let schemaId = await getSchemaId(projectPath, network);

	const original_published_id = replaceEnvField(
		`${projectPath}/Move.lock`,
		network,
		'original-published-id',
		'0x0000000000000000000000000000000000000000000000000000000000000000'
	);

	let pendingMigration: Migration[] = [];
	let schemas = await getOnchainSchemas(projectPath, network);
	Object.entries(config.schemas).forEach(([key, value]) => {
		if (!schemas.hasOwnProperty(key)) {
			pendingMigration.push({ schemaName: key, fields: value });
		}
	});

	pendingMigration.forEach(migration => {
		console.log(`\n🚀 Starting Migration for ${migration.schemaName}...`);
		console.log('📋 Migration Fields:', migration.fields);
	});
	updateMigrateMethod(projectPath, pendingMigration);

	try {
		let modules: any, dependencies: any, digest: any;
		try {
			const {
				modules: extractedModules,
				dependencies: extractedDependencies,
				digest: extractedDigest,
			} = JSON.parse(
				execSync(
					`sui move build --dump-bytecode-as-base64 --path ${path}/contracts/${name}`,
					{
						encoding: 'utf-8',
					}
				)
			);

			modules = extractedModules;
			dependencies = extractedDependencies;
			digest = extractedDigest;
		} catch (error: any) {
			throw new UpgradeError(error.stdout);
		}

		console.log('\n🚀 Starting Upgrade Process...');
		console.log('📋 OldPackageId:', oldPackageId);
		console.log('📋 UpgradeCap Object Id:', upgradeCap);
		console.log('📋 OldVersion:', oldVersion);

		const tx = new Transaction();
		const ticket = tx.moveCall({
			target: '0x2::package::authorize_upgrade',
			arguments: [
				tx.object(upgradeCap),
				tx.pure.u8(UpgradePolicy.COMPATIBLE),
				tx.pure.vector('u8', digest),
			],
		});

		const receipt = tx.upgrade({
			modules,
			dependencies,
			package: oldPackageId,
			ticket,
		});

		tx.moveCall({
			target: '0x2::package::commit_upgrade',
			arguments: [tx.object(upgradeCap), receipt],
		});

		const result = await client.signAndExecuteTransaction({
			signer: keypair,
			transaction: tx,
			options: {
				showObjectChanges: true,
			},
		});

		let newPackageId = '';
		result.objectChanges!.map(object => {
			if (object.type === 'published') {
				console.log(
					chalk.blue(`${name} PackageId: ${object.packageId}`)
				);
				console.log(chalk.blue(`${name} Version: ${oldVersion + 1}`));
				newPackageId = object.packageId;
			}
		});

		replaceEnvField(
			`${projectPath}/Move.lock`,
			network,
			'original-published-id',
			original_published_id
		);
		replaceEnvField(
			`${projectPath}/Move.lock`,
			network,
			'latest-published-id',
			newPackageId
		);
		replaceEnvField(
			`${projectPath}/Move.lock`,
			network,
			'published-version',
			oldVersion + 1 + ''
		);

		console.log(
			chalk.green(`Upgrade Transaction Digest: ${result.digest}`)
		);

		saveContractData(
			name,
			network,
			newPackageId,
            schemaId,
			upgradeCap,
			oldVersion + 1,
			config.schemas
		);
	} catch (error: any) {
		console.log(chalk.red('Upgrade failed!'));
		console.error(error.message);
	}
}
