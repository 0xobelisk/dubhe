import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { getRegisterSchema, getUseSchema, capitalizeFirstLetter } from './common';

export function generateInit(config: DubheConfig, srcPrefix: string) {
  let code = `module ${config.name}::init {
    use std::string;
    use ${config.name}::world;
${getUseSchema(config.name, config.schemas).join('\n')}

    fun init_module(deployer: &signer) {
        world::create(deployer, string::utf8(b"${config.name}"), string::utf8(b"${
    config.description
  }"));
        
        // Add Schema
${getRegisterSchema(config.schemas).join('\n')}
    }

    #[test_only]
    public fun init_world_for_test(deployer: &signer){
        init_module(deployer)
    }
}
`;
  formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${config.name}/sources/codegen/init.move`,
    'formatAndWriteMove'
  );
}
