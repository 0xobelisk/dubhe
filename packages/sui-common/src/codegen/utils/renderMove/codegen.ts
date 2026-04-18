import { DubheConfig } from '../../types';
import { existsSync } from 'fs';
import { deleteFolderRecursive } from './common';
import { generateToml } from './generateToml';
import { generateDeployHook, generateMigrate } from './generateScript';
import { generateDappKey } from './generateDappKey';
import { generateSystemsAndTests } from './generateSystem';
import { generateError } from './generateError';
import { generateInitTest } from './generateInitTest';
import { generateGenesis } from './generateGenesis';
import { generateEnums } from './generateEnums';
import { generateResources } from './generateResources';
import { generateUserStorageInit } from './generateUserStorageInit';
import path from 'node:path';

export async function codegen(
  rootDir: string,
  config: DubheConfig,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  initialMode: 0 | 1 = 1
) {
  console.log('\n🚀 Starting Code Generation Process...');
  console.log('📋 Project Configuration:');
  console.log(`     └─ Name: ${config.name}`);
  console.log(`     └─ Description: ${config.description || 'No description provided'}`);
  console.log(`     └─ Network: ${network || 'testnet'}`);
  console.log(`     └─ Settlement Mode: ${initialMode === 1 ? 'USER_PAYS' : 'DAPP_SUBSIDIZES'}`);

  console.log(rootDir);
  const projectDir = path.join(rootDir, 'src', config.name);

  if (existsSync(`${projectDir}`)) {
    deleteFolderRecursive(`${projectDir}/sources/codegen`);
  }

  if (!existsSync(`${projectDir}/Move.toml`)) {
    await generateToml(config, rootDir);
  }

  const genesisPath = path.join(projectDir, 'sources', 'codegen', 'genesis.move');
  if (!existsSync(genesisPath)) {
    await generateGenesis(config, genesisPath, initialMode);
  }

  const initTestPath = path.join(projectDir, 'sources', 'codegen', 'init_test.move');
  if (!existsSync(initTestPath)) {
    await generateInitTest(config, initTestPath);
  }

  const dappKeyPath = path.join(projectDir, 'sources', 'codegen', 'dapp_key.move');
  if (!existsSync(dappKeyPath)) {
    await generateDappKey(config, dappKeyPath);
  }

  const deployHookPath = path.join(projectDir, 'sources', 'scripts', 'deploy_hook.move');
  if (!existsSync(deployHookPath)) {
    await generateDeployHook(config, deployHookPath, initialMode);
  }

  const resourcesPath = path.join(projectDir, 'sources', 'codegen', 'resources');
  await generateResources(config, resourcesPath);

  const enumsPath = path.join(projectDir, 'sources', 'codegen', 'enums');
  if (!existsSync(enumsPath)) {
    await generateEnums(config, enumsPath);
  }

  if (config.errors) {
    await generateError(config.name, config.errors, rootDir);
  }

  const userStorageInitPath = path.join(projectDir, 'sources', 'codegen', 'user_storage_init.move');
  await generateUserStorageInit(config, userStorageInitPath);

  await generateSystemsAndTests(config, rootDir);
  await generateMigrate(config, rootDir);
  console.log('\n✅  Code Generation Complete!\n');
}

/** @deprecated Use `codegen` instead. */
export const schemaGen = codegen;
