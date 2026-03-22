import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export async function generateGenesis(config: DubheConfig, path: string) {
  let genesis_code = `module ${config.name}::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::DappHub;
      use ${config.name}::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"${config.name}"), string(b"${config.description}"), clock, ctx);

    // Logic that needs to be automated once the contract is deployed
    ${config.name}::deploy_hook::run(dapp_hub, ctx);
  }
}
`;
  await formatAndWriteMove(genesis_code, path, 'formatAndWriteMove');
}
