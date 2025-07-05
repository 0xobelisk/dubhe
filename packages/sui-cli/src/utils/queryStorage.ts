// import { loadMetadata } from '@0xobelisk/sui-client';
// import { DubheCliError } from './errors';
// import { getOldPackageId, getSchemaId, initializeDubhe } from './utils';
// import { DubheConfig } from '@0xobelisk/sui-common';
// import * as fs from 'fs';
// import * as path from 'path';

// function validateParams(storageType: string, params: any[]): boolean {
//   const formatStorageType = storageType.split('<')[0].trim();
//   switch (formatStorageType) {
//     case 'StorageValue':
//       return params.length === 0;
//     case 'StorageMap':
//       return params.length === 1;
//     case 'StorageDoubleMap':
//       return params.length === 2;
//     default:
//       return false;
//   }
// }

// function getExpectedParamsCount(storageType: string): number {
//   const formatStorageType = storageType.split('<')[0].trim();
//   switch (formatStorageType) {
//     case 'StorageValue':
//       return 0;
//     case 'StorageMap':
//       return 1;
//     case 'StorageDoubleMap':
//       return 2;
//     default:
//       return 0;
//   }
// }

// export async function queryStorage({
//   dubheConfig,
//   schema,
//   params,
//   network,
//   objectId,
//   packageId,
//   metadataFilePath
// }: {
//   dubheConfig: DubheConfig;
//   schema: string;
//   params?: any[];
//   network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
//   objectId?: string;
//   packageId?: string;
//   metadataFilePath?: string;
// }) {
//   const path = process.cwd();
//   const projectPath = `${path}/src/${dubheConfig.name}`;

//   packageId = packageId || (await getOldPackageId(projectPath, network));

//   objectId = objectId || (await getSchemaId(projectPath, network));

//   let metadata;
//   if (metadataFilePath) {
//     metadata = await loadMetadataFromFile(metadataFilePath);
//   } else {
//     metadata = await loadMetadata(network, packageId);
//   }
//   if (!metadata) {
//     throw new DubheCliError(
//       `Metadata file not found. Please provide a metadata file path or set the packageId.`
//     );
//   }

//   if (!dubheConfig.schemas[schema]) {
//     throw new DubheCliError(
//       `Schema "${schema}" not found in dubhe config. Available schemas: ${Object.keys(
//         dubheConfig.schemas
//       ).join(', ')}`
//     );
//   }

//   const storageType = dubheConfig.schemas[schema];

//   const processedParams = params || [];
//   if (!validateParams(storageType, processedParams)) {
//     throw new Error(
//       `Invalid params count for ${storageType}. ` +
//         `Expected: ${getExpectedParamsCount(storageType)}, ` +
//         `Got: ${processedParams.length}`
//     );
//   }

//   const dubhe = initializeDubhe({
//     network,
//     packageId,
//     metadata
//   });
//   const result = await dubhe.parseState({
//     schema,
//     objectId,
//     storageType,
//     params: processedParams
//   });

//   console.log(result);
// }

// /**
//  * Load metadata from a JSON file and construct the metadata structure
//  * @param metadataFilePath Path to the metadata JSON file
//  * @param network Network type
//  * @param packageId Package ID
//  * @returns Constructed metadata object
//  */
// export async function loadMetadataFromFile(metadataFilePath: string) {
//   // Verify file extension is .json
//   if (path.extname(metadataFilePath) !== '.json') {
//     throw new Error('Metadata file must be in JSON format');
//   }

//   try {
//     // Read JSON file content
//     const rawData = fs.readFileSync(metadataFilePath, 'utf8');
//     const jsonData = JSON.parse(rawData);

//     // Validate JSON structure
//     if (!jsonData || typeof jsonData !== 'object') {
//       throw new Error('Invalid JSON format');
//     }

//     // Construct metadata structure
//     const metadata = {
//       ...jsonData
//     };

//     return metadata;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(`Failed to read metadata file: ${error.message}`);
//     }
//     throw error;
//   }
// }
