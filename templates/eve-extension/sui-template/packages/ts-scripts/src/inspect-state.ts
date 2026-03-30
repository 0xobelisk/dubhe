import { Dubhe, Transaction, type DevInspectResults, loadMetadata } from '@0xobelisk/sui-client';
import {
  getRuntimeConfig,
  normalizeDubheAccountFromSuiAddress,
  requireValue,
  scriptDir
} from './shared';

const runtime = getRuntimeConfig(scriptDir(import.meta.url));
const privateKey = requireValue('PRIVATE_KEY', runtime.privateKey);
const packageId = requireValue('EXTENSION_PACKAGE_ID or generated PACKAGE_ID', runtime.packageId);
const dappHubId = requireValue('DUBHE_SCHEMA_ID or generated DUBHE_SCHEMA_ID', runtime.dappHubId);

const metadata = await loadMetadata(runtime.network, packageId, [runtime.rpcUrl]);
if (!metadata) {
  throw new Error('Failed to load Move metadata for extension package');
}

const dubhe = new Dubhe({
  networkType: runtime.network,
  fullnodeUrls: [runtime.rpcUrl],
  secretKey: privateKey,
  packageId,
  metadata
});

const configTx = new Transaction();
const configInspect = (await dubhe.query.extension_system.read_config({
  tx: configTx,
  params: [configTx.object(dappHubId)]
})) as DevInspectResults;
const configView = dubhe.view(configInspect);

const accountKey =
  process.env.PLAYER_ACCOUNT ?? normalizeDubheAccountFromSuiAddress(dubhe.getAddress());
const stringBcs = dubhe.object['0x1::ascii::String'];
if (!stringBcs) {
  throw new Error('Missing BCS serializer for 0x1::ascii::String');
}

const statsTx = new Transaction();
const statsInspect = (await dubhe.query.extension_system.read_player_stats({
  tx: statsTx,
  params: [statsTx.object(dappHubId), statsTx.pure(stringBcs.serialize(accountKey))]
})) as DevInspectResults;
const statsView = dubhe.view(statsInspect);

console.log(`network: ${runtime.network}`);
console.log(`rpc: ${runtime.rpcUrl}`);
console.log(`packageId: ${packageId}`);
console.log(`dappHub: ${dappHubId}`);
console.log(`accountKey: ${accountKey}`);
console.log('config:');
console.log(JSON.stringify(configView, null, 2));
console.log('playerStats:');
console.log(JSON.stringify(statsView, null, 2));
