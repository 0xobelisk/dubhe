import {
	Dubhe,
	loadMetadata,
	Transaction,
	TransactionResult,
} from '@0xobelisk/sui-client';
import { DubheCliError } from './errors';
import { validatePrivateKey, getOldPackageId, getObjectId } from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import { loadMetadataFromFile } from './queryStorage';

const BaseTxType = [
	'u8',
	'u16',
	'u32',
	'u64',
	'u128',
	'u256',
	'bool',
	'id',
	'string',
	'address',
];

function validateParams(params: any[]) {
	try {
		params.forEach(param => {
			const [type, value] = param.split(':');
			if (!BaseTxType.includes(type)) {
				throw new Error(`Invalid param type: ${type}`);
			}
		});
	} catch (error) {
		throw new Error(`Invalid params: ${error}`);
	}
}

// param:
// u8:1
// u16:1
// u32:1
// u64:1
// u128:1
// u256:1
// object:0x1
// address:0x1
// bool:true
// string:"hello"
function formatBCS(tx: Transaction, param: string) {
	const [type, value] = param.split(':');
	switch (type) {
		case 'u8':
			return tx.pure.u8(parseInt(value));
		case 'u16':
			return tx.pure.u16(parseInt(value));
		case 'u32':
			return tx.pure.u32(parseInt(value));
		case 'u64':
			return tx.pure.u64(parseInt(value));
		case 'u128':
			return tx.pure.u128(parseInt(value));
		case 'u256':
			return tx.pure.u256(parseInt(value));
		case 'object':
			return tx.object(value);
		case 'address':
			return tx.pure.address(value);
		case 'bool':
			return tx.pure.bool(value === 'true');
		case 'string':
			return tx.pure.string(value);
		default:
			throw new Error(`Invalid param type: ${type}`);
	}
}

function formatBCSParams(tx: Transaction, params: any[]) {
	return params.map(param => formatBCS(tx, param));
}

export async function callHandler({
	dubheConfig,
	moduleName,
	funcName,
	params,
	network,
	packageId,
	metadataFilePath,
}: {
	dubheConfig: DubheConfig;
	moduleName: string;
	funcName: string;
	params?: any[];
	network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
	packageId?: string;
	metadataFilePath?: string;
}) {
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

	const path = process.cwd();
	const projectPath = `${path}/contracts/${dubheConfig.name}`;

	packageId = packageId || (await getOldPackageId(projectPath, network));

	// objectId = objectId || (await getObjectId(projectPath, network, schema));

	let metadata;
	if (metadataFilePath) {
		metadata = await loadMetadataFromFile(metadataFilePath);
	} else {
		metadata = await loadMetadata(network, packageId);
	}
	if (!metadata) {
		throw new DubheCliError(
			`Metadata file not found. Please provide a metadata file path or set the packageId.`
		);
	}

	// if (!dubheConfig.schemas[schema]) {
	// 	throw new DubheCliError(
	// 		`Schema "${schema}" not found in dubhe config. Available schemas: ${Object.keys(
	// 			dubheConfig.schemas
	// 		).join(', ')}`
	// 	);
	// }

	// if (!dubheConfig.schemas[schema].structure[struct]) {
	// 	throw new DubheCliError(
	// 		`Struct "${struct}" not found in schema "${schema}". Available structs: ${Object.keys(
	// 			dubheConfig.schemas[schema].structure
	// 		).join(', ')}`
	// 	);
	// }

	// const storageType = dubheConfig.schemas[schema].structure[struct];

	const processedParams = params || [];
	validateParams(processedParams);
	const dubhe = new Dubhe({
		secretKey: privateKeyFormat,
		networkType: network,
		packageId,
		metadata,
	});
	const tx = new Transaction();
	const formattedParams = formatBCSParams(tx, processedParams);

	const result = (await dubhe.tx[moduleName][funcName]({
		tx,
		params: formattedParams,
	})) as TransactionResult;

	console.log(result);
}