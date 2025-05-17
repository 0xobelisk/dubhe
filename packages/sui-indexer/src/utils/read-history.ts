import * as fsAsync from 'fs/promises';

export type DeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  packageId: string;
  schemaId: string;
  upgradeCap: string;
  version: number;
  schemas: Record<string, string>;
};

export async function getDeploymentJson(projectPath: string, network: string) {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/.history/sui_${network}/latest.json`,
      'utf8'
    );
    return JSON.parse(data) as DeploymentJsonType;
  } catch {
    throw new Error('Fs read deployment file failed.');
  }
}

export async function getSchemaId(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.schemaId;
}

export async function getPackageId(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.packageId;
}
