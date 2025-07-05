import { DubheConfig } from '../../types';
import { rmdirSync, existsSync } from 'fs';
import { deleteFolderRecursive } from './common';
import { generateToml } from './generateToml';
import { generateSchemaData, generateSchemaStructure } from './generateSchema';
import { generateDeployHook, generateMigrate } from './generateScript';
import { generateDappKey } from './generateDappKey';
import { generateSchemaEvent } from './generateEvent';
import { generateSystemsAndTests } from './generateSystem';
import { generateSchemaHub } from './generateSchemaHub';
import { generateSchemaError } from './generateError';
import { generateDefaultSchema } from './generateDefaultSchema';
import { generateInitTest } from './generateInitTest';
import { generateComponents } from './generateComponents';
import { generateGenesis } from './generateGenesis';
import { generateEnums } from './generateEnums';
import { generateResources } from './generateResources';
import path from 'node:path';

export async function schemaGen(
  rootDir: string,
  config: DubheConfig,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
) {
  console.log('\n🚀 Starting Schema Generation Process...');
  console.log('📋 Project Configuration:');
  console.log(`     └─ Name: ${config.name}`);
  console.log(`     └─ Description: ${config.description || 'No description provided'}`);
  console.log(`     └─ Network: ${network || 'testnet'}`);

  console.log(rootDir)
  const projectDir = path.join(rootDir, 'src', config.name);

  if (existsSync(`${projectDir}`)) {
    deleteFolderRecursive(`${projectDir}/sources/codegen`);
  }

  if (!existsSync(`${projectDir}/Move.toml`)) {
    await generateToml(config, rootDir);
  }

  const genesisPath = path.join(projectDir, 'sources', 'codegen', 'genesis.move');
  if (!existsSync(genesisPath)) {
    await generateGenesis(config, genesisPath);
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
    await generateDeployHook(config, deployHookPath);
  }

  const componentsPath = path.join(projectDir, 'sources', 'codegen', 'components');
  if (!existsSync(componentsPath)) {
    await generateComponents(config, componentsPath);
  } else {
    await generateComponents(config, componentsPath);
  }

  const resourcesPath = path.join(projectDir, 'sources', 'codegen', 'resources');
  if (!existsSync(resourcesPath)) {
    await generateResources(config, resourcesPath);
  } else {
    await generateResources(config, resourcesPath);
  }

  const enumsPath = path.join(projectDir, 'sources', 'codegen', 'enums');
  if (!existsSync(enumsPath)) {
    await generateEnums(config, enumsPath);
  }

  if (config.errors) {
    await generateSchemaError(config.name, config.errors, rootDir);
  }

  // await generateDefaultSchema(config, rootDir);
  // await generateInit(config, rootDir);
  await generateSystemsAndTests(config, rootDir);
  await generateMigrate(config, rootDir);
  console.log('\n✅  Schema Generation Process Complete!\n');
}
