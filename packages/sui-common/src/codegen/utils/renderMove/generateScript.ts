import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
import { capitalizeAndRemoveUnderscores } from './generateSchema';

import { readFileSync } from 'fs';

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateDeployHook(config: DubheConfig, srcPrefix: string) {
  const path = `${srcPrefix}/contracts/${config.name}/sources/scripts/deploy_hook.move`;
  if (!existsSync(path)) {
    const code = `module ${config.name}::${config.name}_deploy_hook {
			  use ${config.name}::${config.name}_schema::Schema;
        ${config.plugins?.length ? config.plugins.map((plugin) => `use ${plugin}::${plugin}_schema::Schema as ${capitalizeFirstLetter(plugin)}Schema;`).join('\n') : '' }

  public(package) fun run(_schema: &mut Schema, ${config.plugins?.length ? config.plugins.map((plugin) => `_${plugin}_schema: &mut ${capitalizeFirstLetter(plugin)}Schema`).join(', ') + ', ' : ''} _ctx: &mut TxContext) {

  }
}`;
    await formatAndWriteMove(code, path, 'formatAndWriteMove');
  }
}

export async function generateMigrate(config: DubheConfig, srcPrefix: string) {
  if (!existsSync(`${srcPrefix}/contracts/${config.name}/sources/scripts/migrate.move`)) {
    let code = `module ${config.name}::${config.name}_migrate {
    const ON_CHAIN_VERSION: u32 = 1;

    public fun on_chain_version(): u32 {
        ON_CHAIN_VERSION
    }
}
`;
    await formatAndWriteMove(
      code,
      `${srcPrefix}/contracts/${config.name}/sources/scripts/migrate.move`,
      'formatAndWriteMove'
    );
  }
}
