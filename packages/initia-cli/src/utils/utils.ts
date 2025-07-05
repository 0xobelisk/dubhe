import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { FsIibError } from './errors';
export * from './localnode';

export type schema = {
	name: string;
	objectId: string;
};

export type DeploymentJsonType = {
	projectName: string;
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
	packageId: string;
	// schemas: schema[];
	// upgradeCap: string;
	version: number;
};

export function validatePrivateKey(privateKey: string): false | string {
	if (privateKey.startsWith('0x')) {
		const strippedPrivateKey = privateKey.slice(2);
		if (strippedPrivateKey.length <= 64) {
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

// export async function getUpgradeCap(
// 	projectPath: string,
// 	network: string
// ): Promise<string> {
// 	const deployment = await getDeploymentJson(projectPath, network);
// 	return deployment.upgradeCap;
// }

// export async function getObjectIdBySchemaName(
// 	projectPath: string,
// 	network: string,
// 	schemaName: string
// ): Promise<string | undefined> {
// 	const deployment = await getDeploymentJson(projectPath, network);
// 	return deployment.schemas.find(schema => schema.name.includes(schemaName))
// 		?.objectId;
// }

export function saveContractData(
	projectName: string,
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
	packageId: string,
	// schemas: schema[],
	// upgradeCap: string,
	version: number
) {
	const DeploymentData: DeploymentJsonType = {
		projectName,
		network,
		packageId,
		// schemas,
		// upgradeCap,
		version,
	};

	const path = process.cwd();
	const storeDeploymentData = JSON.stringify(DeploymentData, null, 2);
	writeOutput(
		storeDeploymentData,
		`${path}/contracts/${projectName}/.history/initia_${network}/latest.json`,
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

export function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
