import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
// import { capitalizeAndRemoveUnderscores } from // Unused './generateSchema';

// import { readFileSync } from 'fs'; // Unused

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateDeployHook(config: DubheConfig, path: string) {
  if (!existsSync(path)) {
    const code = `module ${config.name}::deploy_hook {
			  use dubhe::dapp_service::DappHub;

  public(package) fun run(_dapp_hub: &mut DappHub, _ctx: &mut TxContext) {

  }
}`;
    await formatAndWriteMove(code, path, 'formatAndWriteMove');
  }
}

export async function generateMigrate(config: DubheConfig, srcPrefix: string) {
  if (!existsSync(`${srcPrefix}/src/${config.name}/sources/scripts/migrate.move`)) {
    let code = `module ${config.name}::migrate {
    const ON_CHAIN_VERSION: u32 = 1;

    public fun on_chain_version(): u32 {
        ON_CHAIN_VERSION
    }
}
`;
    await formatAndWriteMove(
      code,
      `${srcPrefix}/src/${config.name}/sources/scripts/migrate.move`,
      'formatAndWriteMove'
    );
  }
}
