import chalk from 'chalk';
import {
	InputNetworkType,
	Dubhe,
	AccountAddress,
} from '@0xobelisk/aptos-client';
import { DubheCliError } from './errors';
import {
	saveContractData,
	validatePrivateKey,
	compilePackage,
	getPackageBytesToPublish,
} from './utils';

export async function upgradeHandler(
	projectName: string,
	network: InputNetworkType,
	namedAddresses?: Array<{ name: string; address: AccountAddress }>
) {
	const privateKey = process.env.PRIVATE_KEY;
	if (!privateKey)
		throw new DubheCliError(
			`Missing PRIVATE_KEY environment variable.
  Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
  in your contracts directory to use the default aptos private key.`
		);

	const privateKeyFormat = validatePrivateKey(privateKey);
	if (privateKeyFormat === false) {
		throw new DubheCliError(`Please check your privateKey.`);
	}

	const dubhe = new Dubhe({
		secretKey: privateKeyFormat.toString(),
	});

	if (namedAddresses === undefined) {
		namedAddresses = [{ name: projectName, address: dubhe.getAddress() }];
	} else {
		const existingProjectAddress = namedAddresses.find(
			item => item.name === projectName
		);
		if (!existingProjectAddress) {
			namedAddresses.push({
				name: projectName,
				address: dubhe.getAddress(),
			});
		}
	}

	const path = process.cwd();
	try {
		compilePackage(
			`${path}/contracts/${projectName}`,
			`${path}/contracts/${projectName}/${projectName}.json`,
			namedAddresses
		);

		// const { Result: compileResult } = JSON.parse(
		// 	execSync(
		// 		`aptos move compile --save-metadata --package-dir ${path}/contracts/${projectName} --named-addresses ${addressArg}`,
		// 		{
		// 			encoding: 'utf-8',
		// 		}
		// 	)
		// );
		// modulesInfo = compileResult;
	} catch (error: any) {
		console.error(chalk.red('Error executing aptos move compile:'));
		console.error(error.stdout);
		process.exit(1); // You might want to exit with a non-zero status code to indicate an error
	}

	let packageId = '';
	let version = 0;

	try {
		const buildOutputPath = `contracts/${projectName}/${projectName}.json`;
		const { metadataBytes, byteCode } =
			getPackageBytesToPublish(buildOutputPath);

		let transaction = await dubhe.publishPackageTransaction(
			dubhe.getAddress(),
			metadataBytes,
			byteCode
		);

		const response = await dubhe.signAndSubmitTransaction(transaction);

		await dubhe.waitForTransaction(response.hash);
		packageId = dubhe.getAddress().toString();
		version = 1;

		console.log(chalk.blue(`${projectName} PackageId: ${packageId}`));
		saveContractData(projectName, network, packageId, version);
		console.log(
			chalk.green(`Upgrade Transaction Digest: ${response.hash}`)
		);
	} catch (error: any) {
		console.error(chalk.red(`Failed to execute upgrade`));
		console.error(error.message);
		process.exit(1);
	}
}
