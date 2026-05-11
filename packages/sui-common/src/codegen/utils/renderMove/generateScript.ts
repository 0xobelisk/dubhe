import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';

export async function generateDeployHook(
  config: DubheConfig,
  path: string,
  initialMode: 0 | 1 = 1
) {
  if (!existsSync(path)) {
    const modeComment =
      initialMode === 1
        ? `// Settlement mode: USER_PAYS — users pay transaction fees at settlement time.
    // The framework admin sets the revenue share via set_dapp_revenue_share.
    // Initialise any DappStorage-level defaults here (e.g. resource starting values).`
        : `// Settlement mode: DAPP_SUBSIDIZES — the DApp pays for user operations.
    // Recharge the credit pool via dapp_system::recharge_credit before users can write.
    // Initialise any DappStorage-level defaults here (e.g. resource starting values).`;

    const code = `module ${config.name}::deploy_hook {
    use dubhe::dapp_service::DappStorage;

    public(package) fun run(_dapp_storage: &mut DappStorage, _ctx: &mut TxContext) {
        ${modeComment}
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
