import { AccountAddress, NetworkType } from '@0xobelisk/aptos-client';
import * as fsAsync from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { FsIibError } from './errors';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export type DeploymentJsonType = {
  projectName: string;
  network: NetworkType;
  packageId: string;
  version: number;
};

export function validatePrivateKey(privateKey: string): boolean | string {
  if (privateKey.startsWith('0x')) {
    const strippedPrivateKey = privateKey.slice(2);
    if (strippedPrivateKey.length === 64) {
      return strippedPrivateKey;
    } else {
      return false;
    }
  } else {
    if (privateKey.length === 64) {
      return privateKey;
    } else {
      return false;
    }
  }
}

export async function updateVersionInFile(projectPath: string, newVersion: string) {
  try {
    const filePath = `${projectPath}/sources/codegen/eps/world.move`;
    const data = await fsAsync.readFile(filePath, 'utf8');

    // update version data
    const updatedData = data.replace(
      /const VERSION: u64 = \d+;/,
      `const VERSION: u64 = ${newVersion};`
    );

    // write new version
    writeOutput(updatedData, filePath, 'Update package version');
  } catch {
    throw new FsIibError('Fs update version failed.');
  }
}

async function getDeploymentJson(projectPath: string, network: string) {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/.history/aptos_${network}/latest.json`,
      'utf8'
    );
    return JSON.parse(data) as DeploymentJsonType;
  } catch {
    throw new FsIibError('Fs read deployment file failed.');
  }
}

export async function getVersion(projectPath: string, network: string): Promise<number> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.version;
}

export async function getNetwork(projectPath: string, network: string): Promise<NetworkType> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.network;
}

export async function getOldPackageId(projectPath: string, network: string): Promise<string> {
  const deployment = await getDeploymentJson(projectPath, network);
  return deployment.packageId;
}

export function saveContractData(
  projectName: string,
  network: NetworkType,
  packageId: string,
  version: number
) {
  const DeploymentData: DeploymentJsonType = {
    projectName,
    network,
    packageId,
    version
  };

  const path = process.cwd();
  const storeDeploymentData = JSON.stringify(DeploymentData, null, 2);
  writeOutput(
    storeDeploymentData,
    `${path}/contracts/${projectName}/.history/aptos_${network}/latest.json`,
    'Update deploy log'
  );
}

export async function writeOutput(
  output: string,
  fullOutputPath: string,
  logPrefix?: string
): Promise<void> {
  mkdirSync(dirname(fullOutputPath), { recursive: true });

  writeFileSync(fullOutputPath, output);
  if (logPrefix !== undefined) {
    console.log(`${logPrefix}: ${fullOutputPath}`);
  }
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A convenience function to compile a package locally with the CLI
 * @param packageDir
 * @param outputFile
 * @param namedAddresses
 */
export function compilePackage(
  cliName: string,
  packageDir: string,
  outputFile: string,
  namedAddresses: Array<{ name: string; address: AccountAddress }>
) {
  console.log('In order to run compilation, you must have the `aptos` CLI installed.');
  try {
    execSync(`${cliName} --version`);
  } catch (_e) {
    console.log(
      `${cliName} is not installed. Please install it from the instructions on aptos.dev`
    );
  }

  const addressArg = namedAddresses.map(({ name, address }) => `${name}=${address}`).join(' ');

  // Assume-yes automatically overwrites the previous compiled version, only do this if you are sure you want to overwrite the previous version.
  const compileCommand = `${cliName} move build-publish-payload --json-output-file ${outputFile} --package-dir ${packageDir} --named-addresses ${addressArg} --assume-yes`;
  console.log(
    'Running the compilation locally, in a real situation you may want to compile this ahead of time.'
  );
  console.log(compileCommand);
  execSync(compileCommand);
}

/**
 * A convenience function to get the compiled package metadataBytes and byteCode
 * @param filePath
 */
export function getPackageBytesToPublish(filePath: string) {
  // current working directory - the root folder of this repo
  const cwd = process.cwd();
  // target directory - current working directory + filePath (filePath json file is generated with the previous, compilePackage, cli command)
  const modulePath = path.join(cwd, filePath);

  const jsonData = JSON.parse(fs.readFileSync(modulePath, 'utf8'));

  const metadataBytes = jsonData.args[0].value;
  const byteCode = jsonData.args[1].value;

  return { metadataBytes, byteCode };
}
