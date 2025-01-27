import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DeploymentJsonType } from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';

async function getDeploymentJson(
	projectPath: string,
	network: string
): Promise<DeploymentJsonType> {
	try {
		const data = await fsAsync.readFile(
			`${projectPath}/.history/sui_${network}/latest.json`,
			'utf8'
		);
		return JSON.parse(data) as DeploymentJsonType;
	} catch (error) {
		throw new Error(
			`read .history/sui_${network}/latest.json failed. ${error}`
		);
	}
}

function storeConfig(
	network: string,
	packageId: string,
	schemaId: string,
	outputPath: string
) {
	let code = `type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export const NETWORK: NetworkType = '${network}';
export const PACKAGE_ID = '${packageId}'
export const SCHEMA_ID = '${schemaId}'
`

	// if (outputPath) {
	writeOutput(code, outputPath, 'storeConfig');
	// writeOutput(code, `${path}/src/chain/config.ts`, 'storeConfig');
	// }
}

async function writeOutput(
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

export async function storeConfigHandler(
	dubheConfig: DubheConfig,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
	outputPath: string
) {
	const path = process.cwd();
	const contractPath = `${path}/contracts/${dubheConfig.name}`;
	const deployment = await getDeploymentJson(contractPath, network);
	storeConfig(
		deployment.network,
		deployment.packageId,
		deployment.schemaId,
		outputPath
	);
}
