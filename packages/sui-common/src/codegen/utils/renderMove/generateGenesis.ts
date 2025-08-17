import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
// import { existsSync } from 'fs'; // Unused
// import { capitalizeAndRemoveUnderscores } from './generateSchema'; // Unused
// import path from 'node:path'; // Unused

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateGenesis(config: DubheConfig, path: string) {
  // Generate register table code
  const componentRegisterCode = Object.keys(config.components || {})
    .map((componentName) => `    ${componentName}::register_table(dapp_hub, ctx);`)
    .join('\n');

  const resourceRegisterCode = Object.keys(config.resources || {})
    .map((resourceName) => `    ${resourceName}::register_table(dapp_hub, ctx);`)
    .join('\n');

  const registerTablesCode = [componentRegisterCode, resourceRegisterCode]
    .filter((code) => code.trim() !== '')
    .join('\n');

  let genesis_code = `module ${config.name}::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::DappHub;
      use ${config.name}::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;
      ${Object.keys(config.components || {})
        .map((componentName) => `use ${config.name}::${componentName};`)
        .join('\n')}
      ${Object.keys(config.resources || {})
        .map((resourceName) => `use ${config.name}::${resourceName};`)
        .join('\n')}

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"${config.name}"), string(b"${
    config.description
  }"), clock, ctx);

    // Register tables
${registerTablesCode}

    // Logic that needs to be automated once the contract is deployed
    ${config.name}::deploy_hook::run(dapp_hub, ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_system::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version, ctx);
    // Register new tables
    // ==========================================

    // ==========================================
  }
}
`;
  await formatAndWriteMove(genesis_code, path, 'formatAndWriteMove');
}
