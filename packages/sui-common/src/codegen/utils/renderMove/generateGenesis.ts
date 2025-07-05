import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
import { capitalizeAndRemoveUnderscores } from './generateSchema';
import path from 'node:path';

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateGenesis(config: DubheConfig, path: string) {
  // Generate register table code
  const componentRegisterCode = Object.keys(config.components || {})
    .map(componentName => `    ${componentName}::register_table(dapp_hub, ctx);`)
    .join('\n');
    
  const resourceRegisterCode = Object.keys(config.resources || {})
    .map(resourceName => `    ${resourceName}::register_table(dapp_hub, ctx);`)
    .join('\n');

  const registerTablesCode = [componentRegisterCode, resourceRegisterCode]
    .filter(code => code.trim() !== '')
    .join('\n');

  let genesis_code = `module ${config.name}::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::{Self, DappHub};
      use ${config.name}::dapp_key;
      ${Object.keys(config.components || {}).map(componentName => `use ${config.name}::${componentName};`).join('\n')}
      ${Object.keys(config.resources || {}).map(resourceName => `use ${config.name}::${resourceName};`).join('\n')}

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"${config.name}", b"${config.description}", clock, ctx);

    // Register tables
${registerTablesCode}

    // Logic that needs to be automated once the contract is deployed
    ${config.name}::deploy_hook::run(dapp_hub, ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, _ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_service::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version);
    // Register new tables
    // ==========================================

    // ==========================================
  }
}
`;
  await formatAndWriteMove(
    genesis_code,
    path,
    'formatAndWriteMove'
  );
}
