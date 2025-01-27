import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { SUI_PRIVATE_KEY_PREFIX } from '@mysten/sui/cryptography';
import { FsIibError } from './errors';
import * as fs from 'fs';
import chalk from 'chalk';
import { spawn } from 'child_process';

export type DeploymentJsonType = {
	projectName: string;
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
	packageId: string;
	schemaId: string;
	upgradeCap: string;
	version: number;
	schemas: Record<string, string>;
};

export function validatePrivateKey(privateKey: string): false | string {
	if (privateKey.startsWith(SUI_PRIVATE_KEY_PREFIX)) {
		if (privateKey.length === 70) {
			return privateKey;
		} else {
			return false;
		}
	} else if (privateKey.startsWith('0x')) {
		const strippedPrivateKey = privateKey.slice(2);
		if (strippedPrivateKey.length === 64) {
			return strippedPrivateKey;
		} else {
			return false;
		}
	} else {
		if (privateKey.length === 64) {
			return privateKey;
		} else {
			return false;
		}
	}
}

export async function updateVersionInFile(
	projectPath: string,
	newVersion: string
) {
	try {
		const filePath = `${projectPath}/sources/script/migrate.move`;
		const data = await fsAsync.readFile(filePath, 'utf8');

		// update version data
		const updatedData = data.replace(
			/const VERSION: u64 = \d+;/,
			`const VERSION: u64 = ${newVersion};`
		);

		// write new version
		writeOutput(updatedData, filePath, 'Update package version');
	} catch {
		throw new FsIibError('Fs update version failed.');
	}
}

async function getDeploymentJson(projectPath: string, network: string) {
	try {
		const data = await fsAsync.readFile(
			`${projectPath}/.history/sui_${network}/latest.json`,
			'utf8'
		);
		return JSON.parse(data) as DeploymentJsonType;
	} catch {
		throw new FsIibError('Fs read deployment file failed.');
	}
}

export async function getOnchainSchemas(
	projectPath: string,
	network: string
): Promise<Record<string, string>> {
	const deployment = await getDeploymentJson(projectPath, network);
	return deployment.schemas;
}

export async function getVersion(
	projectPath: string,
	network: string
): Promise<number> {
	const deployment = await getDeploymentJson(projectPath, network);
	return deployment.version;
}

export async function getNetwork(
	projectPath: string,
	network: string
): Promise<'mainnet' | 'testnet' | 'devnet' | 'localnet'> {
	const deployment = await getDeploymentJson(projectPath, network);
	return deployment.network;
}

export async function getOldPackageId(
	projectPath: string,
	network: string
): Promise<string> {
	const deployment = await getDeploymentJson(projectPath, network);
	return deployment.packageId;
}

export async function getSchemaId(
	projectPath: string,
	network: string
): Promise<string> {
	const deployment = await getDeploymentJson(projectPath, network);
	return deployment.schemaId;
}

export async function getUpgradeCap(
	projectPath: string,
	network: string
): Promise<string> {
	const deployment = await getDeploymentJson(projectPath, network);
	return deployment.upgradeCap;
}

export function saveContractData(
	projectName: string,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
	packageId: string,
	schemaId: string,
	upgradeCap: string,
	version: number,
	schemas: Record<string, string>
) {
	const DeploymentData: DeploymentJsonType = {
		projectName,
		network,
		packageId,
		schemaId,
		schemas,
		upgradeCap,
		version,
	};

	const path = process.cwd();
	const storeDeploymentData = JSON.stringify(DeploymentData, null, 2);
	writeOutput(
		storeDeploymentData,
		`${path}/contracts/${projectName}/.history/sui_${network}/latest.json`,
		'Update deploy log'
	);
}

export async function writeOutput(
	output: string,
	fullOutputPath: string,
	logPrefix?: string
): Promise<void> {
	mkdirSync(dirname(fullOutputPath), { recursive: true });

	writeFileSync(fullOutputPath, output);
	if (logPrefix !== undefined) {
		console.log(`${logPrefix}: ${fullOutputPath}`);
	}
}

function getDubheDependency(
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
): string {
	switch (network) {
		case 'localnet':
			return 'Dubhe = { local = "../dubhe-framework" }';
		case 'testnet':
			return 'Dubhe = { git = "https://github.com/0xobelisk/dubhe-framework.git", rev = "dubhe-testnet-v1.1.0" }';
		case 'mainnet':
			return 'Dubhe = { git = "https://github.com/0xobelisk/dubhe-framework.git", rev = "dubhe-mainnet-v1.0.0" }';
		default:
			throw new Error(`Unsupported network: ${network}`);
	}
}

export async function updateDubheDependency(
	filePath: string,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
	const fileContent = fs.readFileSync(filePath, 'utf-8');
	const newDependency = getDubheDependency(network);
	const updatedContent = fileContent.replace(/Dubhe = \{.*\}/, newDependency);
	fs.writeFileSync(filePath, updatedContent, 'utf-8');
	console.log(`Updated Dubhe dependency in ${filePath} for ${network}.`);
}
export async function switchEnv(
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
	try {
		return new Promise<void>((resolve, reject) => {
			const suiProcess = spawn(
				'sui',
				['client', 'switch', '--env', network],
				{
					env: { ...process.env },
					stdio: 'pipe',
				}
			);

			suiProcess.stdout.on('data', data => {
				console.log(chalk.green(`${data.toString()}`));
			});

			suiProcess.on('error', error => {
				console.error(chalk.red('\n❌ Failed to Switch Env'));
				console.error(chalk.red(`  Error: ${error.message}`));
				reject(error); // Reject promise on error
			});

			suiProcess.on('exit', code => {
				if (code !== 0) {
					console.error(
						chalk.red(`\n❌ Process exited with code: ${code}`)
					);
					reject(new Error(`Process exited with code: ${code}`));
				} else {
					resolve(); // Resolve promise on successful exit
				}
			});
		});
	} catch (error) {
		console.error(chalk.red('\n❌ Failed to Switch Env'));
		console.error(chalk.red(`  └─ Error: ${error}`));
	}
}

export const delay = (ms: number) =>
	new Promise(resolve => setTimeout(resolve, ms));
