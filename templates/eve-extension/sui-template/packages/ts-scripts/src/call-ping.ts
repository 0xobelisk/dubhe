import { Dubhe, Transaction } from '@0xobelisk/sui-client';
import { getRuntimeConfig, parseU64Env, requireValue, scriptDir } from './shared';

const runtime = getRuntimeConfig(scriptDir(import.meta.url));
const privateKey = requireValue('PRIVATE_KEY', runtime.privateKey);
const packageId = requireValue('EXTENSION_PACKAGE_ID or generated PACKAGE_ID', runtime.packageId);
const dappHubId = requireValue('DUBHE_SCHEMA_ID or generated DUBHE_SCHEMA_ID', runtime.dappHubId);
const nonce = parseU64Env('PING_NONCE', BigInt(Date.now()));

const dubhe = new Dubhe({
  networkType: runtime.network,
  fullnodeUrls: [runtime.rpcUrl],
  secretKey: privateKey
});

const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::extension_system::ping`,
  arguments: [tx.object(dappHubId), tx.pure.u64(nonce)]
});

const result = await dubhe.signAndSendTxn({ tx });
const status = result.effects?.status.status;

console.log(`network: ${runtime.network}`);
console.log(`rpc: ${runtime.rpcUrl}`);
console.log(`sender: ${dubhe.getAddress()}`);
console.log(`target: ${packageId}::extension_system::ping`);
console.log(`nonce: ${nonce.toString()}`);
console.log(`digest: ${result.digest}`);
console.log(`status: ${status}`);

if (status !== 'success') {
  throw new Error(`Transaction failed: ${result.effects?.status.error ?? 'unknown error'}`);
}
