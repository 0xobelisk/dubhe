import fs from 'fs';
import chalk from 'chalk';
import { Dubhe, MsgPublish, NetworkType } from '@0xobelisk/initia-client';
import { MoveBuilder } from '@initia/builder.js';
import { DubheCliError } from './errors';
import { saveContractData, validatePrivateKey } from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';

export async function publishHandler(
	dubheConfig: DubheConfig,
	network: NetworkType
) {
	const privateKey = process.env.PRIVATE_KEY;
	if (!privateKey)
		throw new DubheCliError(
			`Missing PRIVATE_KEY environment variable.
  Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
  in your contracts directory to use the default initia private key.`
		);

	const privateKeyFormat = validatePrivateKey(privateKey);
	if (privateKeyFormat === false) {
		throw new DubheCliError(`Please check your privateKey.`);
	}

	const client = new Dubhe({
		networkType: network,
		secretKey: privateKeyFormat,
	});

	const path = process.cwd();
	const contractPath = `${path}/contracts/${dubheConfig.name}`;
	const builder = new MoveBuilder(contractPath, {
		additionalNamedAddresses: [[dubheConfig.name, client.getHexAddress()]],
	});

	try {
		await builder.build();
	} catch (error: any) {
		console.error(chalk.red('Error executing initia move build:'));
		console.error(error);
		process.exit(1); // You might want to exit with a non-zero status code to indicate an error
	}
	let packageId = '';
	let version = 0;

	try {
		const buildPath = `${path}/contracts/${dubheConfig.name}/build/${dubheConfig.name}/bytecode_modules`;
		const moduleFiles = fs
			.readdirSync(buildPath)
			.filter(file => file.endsWith('.mv'));

		const codeBytesList = await Promise.all(
			moduleFiles.map(async moduleFile => {
				const moduleName = moduleFile.replace('.mv', '');
				console.log(chalk.blue(`Module Name: ${moduleName}`));

				const codeBytes = await builder.get(moduleName);
				return codeBytes.toString('base64');
			})
		);

		const msgs = [new MsgPublish(client.getAddress(), codeBytesList, 1)];

		const response = await client.signAndSendTxnWithPayload(msgs);

		packageId = client.getHexAddress();
		version = 1;
		const txHash = response.txhash;
		console.log(chalk.blue(`${dubheConfig.name} PackageId: ${packageId}`));
		saveContractData(dubheConfig.name, network, packageId, version);
		console.log(chalk.green(`Publish Transaction Digest: ${txHash}`));
	} catch (error: any) {
		console.error(chalk.red(`Failed to execute publish, please republish`));
		console.error(error.message);
		process.exit(1);
	}
}
