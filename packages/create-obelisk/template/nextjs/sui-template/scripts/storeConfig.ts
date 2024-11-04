import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { exit } from 'process';
import { obeliskConfig } from '../obelisk.config';
import { dirname } from 'path';

export type schema = {
  name: string;
  objectId: string;
};

type DeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  packageId: string;
  schemas: schema[];
  upgradeCap: string;
  version: number;
};

async function getDeploymentJson(projectPath: string, network: string) {
  try {
    const data = await fsAsync.readFile(`${projectPath}/.history/sui_${network}/latest.json`, 'utf8');
    return JSON.parse(data) as DeploymentJsonType;
  } catch {
    console.log('store config failed.');
    exit;
  }
}

function storeConfig(network: string, packageId: string, schemas: schema[]) {
  let code = `type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export const NETWORK: NetworkType = '${network}';

export const PACKAGE_ID = '${packageId}'

${schemas.map(schema => `export const ${schema.name.split('::')[2]}_Object_Id = '${schema.objectId}'`).join('\n')}
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
  const contractPath = `${path}/contracts/${obeliskConfig.name}`;
  const deployment = await getDeploymentJson(contractPath, network);
  storeConfig(deployment.network, deployment.packageId, deployment.schemas);
}

main();
