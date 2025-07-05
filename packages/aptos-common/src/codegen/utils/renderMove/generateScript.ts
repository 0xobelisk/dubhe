import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';

export function generateScript(config: DubheConfig, srcPrefix: string) {
  if (!existsSync(`${srcPrefix}/contracts/${config.name}/sources/script/deploy_hook.move`)) {
    let code = `module ${config.name}::deploy_hook {
    use ${config.name}::world;
    use std::signer::address_of;

    /// Not the right admin for this world
    const ENotAdmin: u64 = 0;

    public entry fun run(deployer: &signer) {
        assert!( address_of(deployer) == world::deployer_address(), ENotAdmin);

        // Logic that needs to be automated once the contract is deployed

    }

    #[test_only]
    public fun deploy_hook_for_testing(deployer: &signer){
        run(deployer)
    }
}
`;
    formatAndWriteMove(
      code,
      `${srcPrefix}/contracts/${config.name}/sources/script/deploy_hook.move`,
      'formatAndWriteMove'
    );
  }
}
