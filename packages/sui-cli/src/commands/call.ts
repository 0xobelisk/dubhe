// import type { CommandModule } from 'yargs';
// import { logError } from '../utils/errors';
// import { callHandler } from '../utils';
// import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';

// type Options = {
//   network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
//   module: string;
//   function: string;
//   'config-path'?: string;
//   'package-id'?: string;
//   'metadata-path'?: string;
//   params?: any[];
// };

// /**
//  * CLI command for calling a function in a module
//  */
// const commandModule: CommandModule<Options, Options> = {
//   command: 'call',

//   describe: 'Call a function in a module',

//   builder: {
//     network: {
//       type: 'string',
//       choices: ['mainnet', 'testnet', 'devnet', 'localnet'],
//       desc: 'Node network (mainnet/testnet/devnet/localnet)',
//       default: 'localnet'
//     },
//     module: {
//       type: 'string',
//       desc: 'Module name',
//       demandOption: true
//     },
//     function: {
//       type: 'string',
//       desc: 'Function name',
//       demandOption: true
//     },
//     'config-path': {
//       type: 'string',
//       default: 'dubhe.config.ts',
//       desc: 'Configuration file path'
//     },
//     'package-id': {
//       type: 'string',
//       desc: 'Package ID (optional)'
//     },
//     'metadata-path': {
//       type: 'string',
//       desc: 'Path to metadata JSON file (optional)'
//     },
//     params: {
//       type: 'array',
//       desc: 'Params for the function',
//       string: true
//     }
//   },

//   async handler({
//     network,
//     'config-path': configPath,
//     module: moduleName,
//     function: funcName,
//     'package-id': packageId,
//     'metadata-path': metadataPath,
//     params
//   }) {
//     try {
//       const dubheConfig = (await loadConfig(configPath)) as DubheConfig;

//       await callHandler({
//         dubheConfig,
//         moduleName,
//         funcName,
//         network,
//         packageId,
//         metadataFilePath: metadataPath,
//         params
//       });
//     } catch (error: any) {
//       logError(error);
//       process.exit(1);
//     }
//     process.exit(0);
//   }
// };

// export default commandModule;
