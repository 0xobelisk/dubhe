import { Dubhe } from '@0xobelisk/sui-client';
import { Transaction } from '@mysten/sui/transactions';
import {
	getFullnodeUrl,
	SuiClient,
	SuiTransactionBlockResponse,
} from '@mysten/sui/client';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { DubheCliError } from './errors';
import {
	updateVersionInFile,
	saveContractData,
	validatePrivateKey,
	schema, getSchemaHub, updateDubheDependency, switchEnv, delay,
} from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import * as fs from 'fs';
import * as path from 'path';

async function getDappsObjectId(
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
	switch (network) {
		case "localnet": {
			const path = process.cwd();
			return await getSchemaHub(`${path}/contracts/dubhe-framework`, network)
		}
		case 'testnet':
			return '0x181befc40b3dafe2740b41d5a970e49bed2cca20205506ee6be2cfb73ff2d3e9';
		default:
			return '0x181befc40b3dafe2740b41d5a970e49bed2cca20205506ee6be2cfb73ff2d3e9';
	}
}

function removeEnvContent(filePath: string, networkType: 'mainnet' | 'testnet' | 'devnet' | 'localnet'): void {
	if (!fs.existsSync(filePath)) {
		return;
	}
	const content = fs.readFileSync(filePath, 'utf-8');
	const regex = new RegExp(`\\[env\\.${networkType}\\][\\s\\S]*?(?=\\[|$)`, 'g');
	const updatedContent = content.replace(regex, '');
	fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

interface EnvConfig {
	chainId: string;
	originalPublishedId: string;
	latestPublishedId: string;
	publishedVersion: number;
}

const chainIds: { [key: string]: string } = {
	localnet: 'dfa7bb83',
	testnet: '4c78adac',
	mainnet: '35834a8a',
};

function updateEnvFile(filePath: string, networkType: 'mainnet' | 'testnet' | 'devnet' | 'localnet', operation: 'publish' | 'upgrade', chainId: string, publishedId: string): void {
	const envFilePath = path.resolve(filePath);
	const envContent = fs.readFileSync(envFilePath, 'utf-8');
	const envLines = envContent.split('\n');

	const networkSectionIndex = envLines.findIndex(line => line.trim() === `[env.${networkType}]`);
	const config: EnvConfig = {
		chainId: chainId,
		originalPublishedId: '',
		latestPublishedId: '',
		publishedVersion: 0,
	};

	if (networkSectionIndex === -1) {
		// If network section is not found, add a new section
		if (operation === 'publish') {
			config.originalPublishedId = publishedId;
			config.latestPublishedId = publishedId;
			config.publishedVersion = 1;
		} else {
			throw new Error(`Network type [env.${networkType}] not found in the file and cannot upgrade.`);
		}
	} else {
		for (let i = networkSectionIndex + 1; i < envLines.length; i++) {
			const line = envLines[i].trim();
			if (line.startsWith('[')) break; // End of the current network section

			const [key, value] = line.split('=').map(part => part.trim().replace(/"/g, ''));
			switch (key) {
				case 'original-published-id':
					config.originalPublishedId = value;
					break;
				case 'latest-published-id':
					config.latestPublishedId = value;
					break;
				case 'published-version':
					config.publishedVersion = parseInt(value, 10);
					break;
			}
		}

		if (operation === 'publish') {
			config.originalPublishedId = publishedId;
			config.latestPublishedId = publishedId;
			config.publishedVersion = 1;
		} else if (operation === 'upgrade') {
			config.latestPublishedId = publishedId;
			config.publishedVersion += 1;
		}
	}

	const updatedSection = `
[env.${networkType}]
chain-id = "${config.chainId}"
original-published-id = "${config.originalPublishedId}"
latest-published-id = "${config.latestPublishedId}"
published-version = "${config.publishedVersion}"
`;

	const newEnvContent = networkSectionIndex === -1
		? envContent + updatedSection
		: envLines.slice(0, networkSectionIndex).join('\n') + updatedSection;

	fs.writeFileSync(envFilePath, newEnvContent, 'utf-8');
}
function capitalizeAndRemoveUnderscores(input: string): string {
	return input
		.split('_')
		.map((word, index) => {
			return index === 0
				? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join('');
}

function getLastSegment(input: string): string {
	const segments = input.split('::');
	return segments.length > 0 ? segments[segments.length - 1] : '';
}

function buildContract(projectPath: string):  string[][] {
	let modules: any, dependencies: any;
	try {
		const buildResult = JSON.parse(
			execSync(
				`sui move build --dump-bytecode-as-base64 --path ${projectPath}`,
				{
					encoding: 'utf-8',
				}
			)
		);
		modules = buildResult.modules;
		dependencies = buildResult.dependencies;
		console.log('  └─ Build successful');
	} catch (error: any) {
		console.error(chalk.red('  └─ Build failed'));
		console.error(error.stdout);
		process.exit(1);
	}
	return [modules, dependencies];
}

async function publishContract(
	client: SuiClient,
	dubhe: Dubhe,
	dubheConfig: DubheConfig,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
	projectPath: string
) {
	const dappsObjectId = await getDappsObjectId(network);
	console.log("dappsObjectId", dappsObjectId);
	const chainId = await client.getChainIdentifier();
	removeEnvContent(`${projectPath}/Move.lock`, network);
	console.log('\n🚀 Starting Contract Publication...');
	console.log(`  ├─ Project: ${projectPath}`);
	console.log(`  ├─ Network: ${network}`);
	console.log(`  ├─ ChainId: ${chainId}`);
	console.log('  ├─ Validating Environment...');

	const keypair = dubhe.getKeypair();
	console.log(`  └─ Account: ${keypair.toSuiAddress()}`);

	console.log('\n📦 Building Contract...');
	const [modules, dependencies] = buildContract(projectPath);

	console.log('\n🔄 Publishing Contract...');
	const tx = new Transaction();
	const [upgradeCap] = tx.publish({ modules, dependencies });
	tx.transferObjects([upgradeCap], keypair.toSuiAddress());

	let result: SuiTransactionBlockResponse;
	try {
		result = await client.signAndExecuteTransaction({
			signer: keypair,
			transaction: tx,
			options: { showObjectChanges: true },
		});
	} catch (error: any) {
		console.error(chalk.red('  └─ Publication failed'));
		console.error(error.message);
		process.exit(1);
	}

	if (result.effects?.status.status === 'failure') {
		console.log(chalk.red('  └─ Publication failed'));
		process.exit(1);
	}

	console.log('  ├─ Processing publication results...');
	let version = 1;
	let packageId = '';
	let schemas: schema[] = [];
	let upgradeCapId = '';
	let schemaHubId = '';

	result.objectChanges!.map(object => {
		if (object.type === 'published') {
			console.log(`  ├─ Package ID: ${object.packageId}`);
			packageId = object.packageId;
		}
		if (
			object.type === 'created' &&
			object.objectType === '0x2::package::UpgradeCap'
		) {
			console.log(`  ├─ Upgrade Cap: ${object.objectId}`);
			upgradeCapId = object.objectId;
		}
		if (
			object.type === 'created' &&
			object.objectType.includes("schema_hub")
		) {
			console.log(`  ├─ Schema Hub: ${object.objectId}`);
			schemaHubId = object.objectId;
		}
	});

	console.log(`  └─ Transaction: ${result.digest}`);

	updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);

	console.log('\n⚡ Executing Deploy Hook...');
	await delay(5000);

	const deployHookTx = new Transaction();
	deployHookTx.setGasBudget(2000000000);
	const [txCoin] = deployHookTx.splitCoins(deployHookTx.gas, ["1000000000"]);
	deployHookTx.moveCall({
		target: `${packageId}::deploy_hook::run`,
		arguments: [
			deployHookTx.object(schemaHubId),
			deployHookTx.object(dappsObjectId),
			deployHookTx.object(upgradeCapId),
			deployHookTx.object('0x6'),
			txCoin
		],
	});

	let deployHookResult: SuiTransactionBlockResponse;
	try {
		deployHookResult = await client.signAndExecuteTransaction({
			signer: keypair,
			transaction: deployHookTx,
			options: { showEffects: true, showObjectChanges: true },
		});
	} catch (error: any) {
		console.error(chalk.red('  └─ Deploy hook execution failed'));
		console.error(error.message);
		process.exit(1);
	}

	if (deployHookResult.effects?.status.status === 'success') {
		console.log('  ├─ Hook execution successful');
		console.log(`  ├─ Transaction: ${deployHookResult.digest}`);

		console.log('\n📋 Created Schemas:');
		deployHookResult.objectChanges?.map(object => {
			if (
				object.type === 'created' &&
				object.objectType.includes('_schema') && !object.objectType.includes("dynamic_field")
			) {
				console.log(`  ├─ ${object.objectType}`);
				console.log(`     └─ ID: ${object.objectId}`);

				let structure: Record<string, string> = {};
				for (let schemaKey in dubheConfig.schemas) {
					if (capitalizeAndRemoveUnderscores(schemaKey) === getLastSegment(object.objectType)) {
						structure = dubheConfig.schemas[schemaKey].structure;
					}
				}

				schemas.push({
					name: object.objectType,
					objectId: object.objectId,
					structure,
				});
			}
		});

		saveContractData(
			dubheConfig.name,
			network,
			packageId,
			upgradeCapId,
			schemaHubId,
			version,
			schemas,
		);
		console.log('\n✅ Contract Publication Complete\n');
	} else {
		console.log(chalk.yellow('  └─ Deploy hook execution failed'));
		console.log(
			chalk.yellow(
				'     Please republish or manually call deploy_hook::run'
			)
		);
	}
}

async function publishDubheFramework(
	client: SuiClient,
	dubhe: Dubhe,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
) {
	const path = process.cwd();
	const projectPath = `${path}/contracts/dubhe-framework`;
	const chainId = await client.getChainIdentifier();
	console.log(`  └─ Chain ID: ${chainId}`);
	removeEnvContent(`${projectPath}/Move.lock`, network);
	console.log('\n🚀 Starting Contract Publication...');
	console.log(`  ├─ Project: ${projectPath}`);
	console.log(`  ├─ Network: ${network}`);
	console.log(`  ├─ ChainId: ${chainId}`);
	console.log('  ├─ Validating Environment...');

	const keypair = dubhe.getKeypair();
	console.log(`  └─ Account: ${keypair.toSuiAddress()}`);


	console.log('\n📦 Building Contract...');
	const [modules, dependencies] = buildContract(projectPath);

	console.log('\n🔄 Publishing Contract...');
	const tx = new Transaction();
	const [upgradeCap] = tx.publish({ modules, dependencies });
	tx.transferObjects([upgradeCap], keypair.toSuiAddress());

	let result: SuiTransactionBlockResponse;
	try {
		result = await client.signAndExecuteTransaction({
			signer: keypair,
			transaction: tx,
			options: { showObjectChanges: true },
		});
	} catch (error: any) {
		console.error(chalk.red('  └─ Publication failed'));
		console.error(error.message);
		process.exit(1);
	}

	if (result.effects?.status.status === 'failure') {
		console.log(chalk.red('  └─ Publication failed'));
		process.exit(1);
	}

	console.log('  ├─ Processing publication results...');
	let version = 1;
	let packageId = '';
	let schemas: schema[] = [];
	let upgradeCapId = '';
	let schemaHubId = '';

	result.objectChanges!.map(object => {
		if (object.type === 'published') {
			console.log(`  ├─ Package ID: ${object.packageId}`);
			packageId = object.packageId;
		}
		if (
			object.type === 'created' &&
			object.objectType === '0x2::package::UpgradeCap'
		) {
			console.log(`  ├─ Upgrade Cap: ${object.objectId}`);
			upgradeCapId = object.objectId;
		}
		if (
			object.type === 'created' &&
			object.objectType.includes("dapps")
		) {
			console.log(`  ├─ Dapps: ${object.objectId}`);
			schemaHubId = object.objectId;
		}
	});

	console.log(`  └─ Transaction: ${result.digest}`);

	updateEnvFile(`${projectPath}/Move.lock`, network, 'publish', chainId, packageId);

	saveContractData(
		"dubhe-framework",
		network,
		packageId,
		upgradeCapId,
		schemaHubId,
		version,
		schemas,
	);
}

export async function publishHandler(
	dubheConfig: DubheConfig,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
	contractName?: string,
) {
	await switchEnv(network);

	const privateKey = process.env.PRIVATE_KEY;
	if (!privateKey) {
		throw new DubheCliError(
			`Missing PRIVATE_KEY environment variable.
Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
in your contracts directory to use the default sui private key.`
		);
	}
	const privateKeyFormat = validatePrivateKey(privateKey);
	if (privateKeyFormat === false) {
		throw new DubheCliError(`Please check your privateKey.`);
	}

	const dubhe = new Dubhe({ secretKey: privateKeyFormat });
	const client = new SuiClient({ url: getFullnodeUrl(network) });

	if (contractName == "dubhe-framework") {
		await publishDubheFramework(client, dubhe, network);
	} else {
		const path = process.cwd();
		const projectPath = `${path}/contracts/${dubheConfig.name}`;
		updateDubheDependency(`${projectPath}/Move.toml`, network);
		await publishContract(client, dubhe, dubheConfig, network, projectPath);
	}
}
