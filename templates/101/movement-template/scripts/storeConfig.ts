import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { exit } from 'process';
import { dubheConfig } from '../dubhe.config';
import { dirname } from 'path';

type DeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'local' | 'movementtestnet' | 'movementdevnet' | 'movementlocal';
  packageId: string;
  version: number;
};

async function getDeploymentJson(projectPath: string, network: string) {
  try {
    const data = await fsAsync.readFile(`${projectPath}/.history/aptos_${network}/latest.json`, 'utf8');
    return JSON.parse(data) as DeploymentJsonType;
  } catch {
    console.log('store config failed.');
    exit;
  }
}

function storeConfig(network: string, packageId: string) {
  let code = `import { NetworkType } from '@0xobelisk/aptos-client';

const NETWORK = '${network}' as NetworkType;

const PACKAGE_ID = '${packageId}';

export { NETWORK, PACKAGE_ID };
`;
  const path = process.cwd();
  writeOutput(code, `${path}/src/chain/config.ts`, 'storeConfig');
}

async function writeOutput(output: string, fullOutputPath: string, logPrefix?: string): Promise<void> {
  mkdirSync(dirname(fullOutputPath), { recursive: true });

  writeFileSync(fullOutputPath, output);
  if (logPrefix !== undefined) {
    console.log(`${logPrefix}: ${fullOutputPath}`);
  }
}

async function main() {
  const path = process.cwd();
  const network = process.argv[2];
  const contractPath = `${path}/contracts/${dubheConfig.name}`;
  const deployment = await getDeploymentJson(contractPath, network);
  storeConfig(deployment.network, deployment.packageId);
}

main();
