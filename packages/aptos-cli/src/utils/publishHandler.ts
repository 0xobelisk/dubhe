import chalk from 'chalk';
import {
	InputNetworkType,
	Dubhe,
	AccountAddress,
	NetworkType,
} from '@0xobelisk/aptos-client';

import { DubheCliError } from './errors';
import {
	saveContractData,
	validatePrivateKey,
	compilePackage,
	getPackageBytesToPublish,
} from './utils';

export async function publishHandler(
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
		networkType: network as NetworkType,
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
		// const packageMetadata = fs.readFileSync(
		// 	`${path}/contracts/${projectName}/build/${projectName}/package-metadata.bcs`
		// );

		// let modulesData = [];
		// modulesInfo.forEach(value => {
		// 	const moduleName = value.split('::')[1];
		// 	const moduleData = fs.readFileSync(
		// 		`${path}/contracts/${projectName}/build/${projectName}/bytecode_modules/${moduleName}.mv`
		// 	);

		// 	modulesData.push(
		// 		new Module(new (moduleData.toString('hex').toUint8Array)())
		// 	);
		// });
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
			chalk.green(`Publish Transaction Digest: ${response.hash}`)
		);
	} catch (error: any) {
		console.error(chalk.red(`Failed to execute publish, please republish`));
		console.error(error.message);
		process.exit(1);
	}

	console.log('Executing the deployHook: ');
	const delay = (ms: number) =>
		new Promise(resolve => setTimeout(resolve, ms));
	await delay(1000);

	// const payload: EntryFunctionPayload = {
	// 	function: `${packageId}::deploy_hook::run`,
	// 	type_arguments: [],
	// 	arguments: [],
	// };

	// const deployHookRawTxn = await client.generateTransaction(
	// 	keypair.address(),
	// 	payload
	// );
	// const deployHookBcsTxn = AptosClient.generateBCSTransaction(
	// 	keypair,
	// 	deployHookRawTxn
	// );

	try {
		let deployResponse = await dubhe.moveCall({
			sender: dubhe.getAddress(),
			contractAddress: packageId,
			moduleName: 'deploy_hook',
			funcName: 'run',
			params: [],
		});

		await dubhe.waitForTransaction(deployResponse.hash);
		console.log(
			chalk.green(
				`Successful auto-execution of deployHook, please check the transaction digest: ${deployResponse.hash}`
			)
		);
	} catch (error: any) {
		console.error(
			chalk.red(
				`Failed to execute deployHook, please republish or manually call deploy_hook::run`
			)
		);
		console.error(error.message);
		process.exit(1);
	}
}
