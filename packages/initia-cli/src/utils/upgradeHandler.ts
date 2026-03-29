// import { Dubhe } from '@0xobelisk/sui-client';
// import { Transaction, UpgradePolicy } from '@mysten/sui/transactions';
// import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
// import { execSync } from 'child_process';
// import chalk from 'chalk';
// import { DubheCliError, UpgradeError } from './errors';
// import {
// 	updateVersionInFile,
// 	getOldPackageId,
// 	getVersion,
// 	getUpgradeCap,
// 	saveContractData,
// 	validatePrivateKey,
// } from './utils';

// type ObjectContent = {
// 	type: string;
// 	fields: Record<string, any>;
// 	hasPublicTransfer: boolean;
// 	dataType: string;
// };

// export async function upgradeHandler(
// 	name: string,
// 	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
// 	schemaNames: string[]
// ) {
// 	const path = process.cwd();
// 	const projectPath = `${path}/contracts/${name}`;
// 	const privateKey = process.env.PRIVATE_KEY;
// 	if (!privateKey)
// 		throw new DubheCliError(
// 			`Missing PRIVATE_KEY environment variable.
// Run 'echo "PRIVATE_KEY=YOUR_PRIVATE_KEY" > .env'
// in your contracts directory to use the default sui private key.`
// 		);

// 	const privateKeyFormat = validatePrivateKey(privateKey);
// 	if (privateKeyFormat === false) {
// 		throw new DubheCliError(`Please check your privateKey.`);
// 	}
// 	const dubhe = new Dubhe({
// 		secretKey: privateKeyFormat,
// 	});
// 	const keypair = dubhe.getKeypair();

// 	const client = new SuiClient({
// 		url: getFullnodeUrl(network),
// 	});

// 	let oldVersion = Number(await getVersion(projectPath, network));
// 	let oldPackageId = await getOldPackageId(projectPath, network);
// 	let worldId = await getWorldId(projectPath, network);
// 	let upgradeCap = await getUpgradeCap(projectPath, network);
// 	let adminCap = await getAdminCap(projectPath, network);

// 	const newVersion = oldVersion + 1;
// 	await updateVersionInFile(projectPath, newVersion.toString());

// 	try {
// 		let modules: any, dependencies: any, digest: any;
// 		try {
// 			const {
// 				modules: extractedModules,
// 				dependencies: extractedDependencies,
// 				digest: extractedDigest,
// 			} = JSON.parse(
// 				execSync(
// 					`sui move build --dump-bytecode-as-base64 --path ${path}/contracts/${name}`,
// 					{
// 						encoding: 'utf-8',
// 					}
// 				)
// 			);

// 			modules = extractedModules;
// 			dependencies = extractedDependencies;
// 			digest = extractedDigest;
// 		} catch (error: any) {
// 			throw new UpgradeError(error.stdout);
// 		}

// 		const tx = new Transaction();
// 		const ticket = tx.moveCall({
// 			target: '0x2::package::authorize_upgrade',
// 			arguments: [
// 				tx.object(upgradeCap),
// 				tx.pure.u8(UpgradePolicy.COMPATIBLE),
// 				tx.pure.vector('u8', digest),
// 			],
// 		});

// 		const receipt = tx.upgrade({
// 			modules,
// 			dependencies,
// 			package: oldPackageId,
// 			ticket,
// 		});

// 		tx.moveCall({
// 			target: '0x2::package::commit_upgrade',
// 			arguments: [tx.object(upgradeCap), receipt],
// 		});

// 		tx.transferObjects(
// 			[tx.object(upgradeCap)],
// 			keypair.toSuiAddress()
// 		);

// 		const result = await client.signAndExecuteTransaction({
// 			signer: keypair,
// 			transaction: tx,
// 			options: {
// 				showObjectChanges: true,
// 			},
// 		});

// 		console.log('');
// 		console.log(`${name} WorldId: ${worldId}`);

// 		let newPackageId = '';
// 		let newUpgradeCap = '';
// 		result.objectChanges!.map(object => {
// 			if (object.type === 'published') {
// 				console.log(
// 					chalk.blue(`${name} PackageId: ${object.packageId}`)
// 				);
// 				newPackageId = object.packageId;
// 			}
// 			if (
// 				object.type === 'mutated' &&
// 				object.objectType === '0x2::package::UpgradeCap'
// 			) {
// 				console.log(
// 					chalk.blue(`${name} UpgradeCap: ${object.objectId}`)
// 				);
// 				newUpgradeCap = object.objectId;
// 			}
// 		});

// 		console.log(
// 			chalk.green(`Upgrade Transaction Digest: ${result.digest}`)
// 		);

// 		saveContractData(
// 			name,
// 			network,
// 			newPackageId,
// 			worldId,
// 			newUpgradeCap,
// 			adminCap,
// 			newVersion
// 		);

// 		oldPackageId = newPackageId;
// 		upgradeCap = newUpgradeCap;
// 		oldVersion = newVersion;

// 		console.log('\nExecuting the migrate: ');
// 		const delay = (ms: number) =>
// 			new Promise(resolve => setTimeout(resolve, ms));
// 		await delay(5000);

// 		const migrateTx = new Transaction();
// 		migrateTx.moveCall({
// 			target: `${newPackageId}::migrate::run`,
// 			arguments: [migrateTx.object(worldId), migrateTx.object(adminCap)],
// 		});

// 		let newWorldObject = await client.getObject({
// 			id: worldId,
// 			options: {
// 				showContent: true,
// 				showDisplay: true,
// 				showType: true,
// 				showOwner: true,
// 			},
// 		});
// 		let newObjectContent = newWorldObject.data!.content as ObjectContent;

// 		const uniqueSchema: string[] = schemaNames.filter(
// 			item => !newObjectContent.fields['schema_names'].includes(item)
// 		);

// 		console.log('new schema:', uniqueSchema);
// 		let needRegisterSchema = [];
// 		for (const newSchema of uniqueSchema) {
// 			migrateTx.moveCall({
// 				target: `${newPackageId}::${newSchema}_schema::register`,
// 				arguments: [
// 					migrateTx.object(worldId),
// 					migrateTx.object(adminCap),
// 				],
// 			});
// 			needRegisterSchema.push(`${newSchema}_schema`);
// 		}
// 		const migrateResult = await client.signAndExecuteTransaction({
// 			signer: keypair,
// 			transaction: migrateTx,
// 			options: {
// 				showEffects: true,
// 			},
// 		});

// 		if (migrateResult.effects?.status.status === 'success') {
// 			console.log(
// 				chalk.green(
// 					`${name} migrate world success, new world version is: ${newObjectContent.fields['version']}, package version is ${newVersion}`
// 				)
// 			);
// 			if (needRegisterSchema.length !== 0) {
// 				console.log(
// 					chalk.green(
// 						`new schema: ${needRegisterSchema.toString()} register success.`
// 					)
// 				);
// 			}

// 			console.log(
// 				chalk.blue(
// 					`\n${name} world schemas is ${newObjectContent.fields['schema_names']}`
// 				)
// 			);
// 		} else {
// 			console.log(
// 				chalk.red(
// 					`${name} migrate world failed, world version is: ${newObjectContent.fields['version']}, package version is ${newVersion}`
// 				)
// 			);
// 		}
// 	} catch (error: any) {
// 		console.log(chalk.red('Upgrade failed!'));
// 		console.error(error.message);

// 		saveContractData(
// 			name,
// 			network,
// 			oldPackageId,
// 			worldId,
// 			upgradeCap,
// 			adminCap,
// 			oldVersion
// 		);
// 		await updateVersionInFile(projectPath, oldVersion.toString());
// 	}
// }
