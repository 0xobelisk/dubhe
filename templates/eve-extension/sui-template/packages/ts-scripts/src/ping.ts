import { SuiClient } from '@0xobelisk/sui-client';
import { getRuntimeConfig, scriptDir } from './shared';

const runtime = getRuntimeConfig(scriptDir(import.meta.url));
const client = new SuiClient({ url: runtime.rpcUrl });

try {
  const chainIdentifier = await client.getChainIdentifier();
  console.log(`Connected to ${runtime.network} (${chainIdentifier}) via ${runtime.rpcUrl}`);
  if (runtime.envPath) {
    console.log(`Loaded env file: ${runtime.envPath}`);
  }
} catch (error) {
  console.error(`Failed to connect to Sui RPC: ${runtime.rpcUrl}`);
  console.error(error);
  process.exit(1);
}
