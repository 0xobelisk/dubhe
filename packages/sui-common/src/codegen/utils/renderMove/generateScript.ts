import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
import { capitalizeAndRemoveUnderscores } from './generateSchema';

import { readFileSync } from 'fs';

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateDeployHook(config: DubheConfig, srcPrefix: string) {
  const path = `${srcPrefix}/src/${config.name}/sources/scripts/deploy_hook.move`;
  if (!existsSync(path)) {
    const code = `module ${config.name}::${config.name}_deploy_hook {
			  use ${config.name}::${config.name}_schema::Schema;
        ${config.name !== 'dubhe' ? `use dubhe::dubhe_schema::Schema as DubheSchema;` : '' }

  public(package) fun run(${config.name !== 'dubhe' ? `_dubhe_schema: &mut DubheSchema,` : ''}_schema: &mut Schema,  _ctx: &mut TxContext) {

  }
}`;
    await formatAndWriteMove(code, path, 'formatAndWriteMove');
  }
}

export async function generateMigrate(config: DubheConfig, srcPrefix: string) {
  if (!existsSync(`${srcPrefix}/src/${config.name}/sources/scripts/migrate.move`)) {
    let code = `module ${config.name}::${config.name}_migrate {
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
