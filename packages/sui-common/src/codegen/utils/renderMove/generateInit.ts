import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
import { capitalizeAndRemoveUnderscores } from './generateSchema';

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateInit(config: DubheConfig, srcPrefix: string) {
  let init_test_code = `module ${config.name}::${config.name}_init_test {
    use sui::clock;
    use sui::test_scenario;
    use sui::test_scenario::Scenario;
    use dubhe::dubhe_schema::Schema as DubheSchema;
    ${config.name !== 'dubhe' ? `use ${config.name}::${config.name}_schema::Schema;` : '' }
    
    public fun deploy_dapp_for_testing(scenario: &mut Scenario): ${config.name !== 'dubhe' ? `(DubheSchema, Schema)` : 'DubheSchema'} {
        ${config.name !== 'dubhe' ? `let mut dubhe_schema = dubhe::dubhe_init_test::create_dubhe_schema_for_other_contract(scenario);` : ''}
        let ctx = test_scenario::ctx(scenario);
        let clock = clock::create_for_testing(ctx);
        ${config.name}::${config.name}_genesis::run(${config.name !== 'dubhe' ? `&mut dubhe_schema,` : ''}&clock, ctx);
        clock::destroy_for_testing(clock);
        test_scenario::next_tx(scenario, ctx.sender());
        ${config.name !== 'dubhe' ? `
          let schema = test_scenario::take_shared<Schema>(scenario);
          (dubhe_schema, schema)
        ` : 'test_scenario::take_shared<DubheSchema>(scenario)'
      }
    }

    ${config.name == 'dubhe' ? `
     public fun create_dubhe_schema_for_other_contract(scenario: &mut Scenario): DubheSchema {
      let ctx = test_scenario::ctx(scenario);
      let mut schema = dubhe::dubhe_schema::create(ctx);
      dubhe::dubhe_deploy_hook::run(&mut schema, ctx);
      sui::transfer::public_share_object(schema);
      test_scenario::next_tx(scenario, ctx.sender());
      test_scenario::take_shared<DubheSchema>(scenario)
  }
    ` : ''}
}
`;
  await formatAndWriteMove(
    init_test_code,
    `${srcPrefix}/src/${config.name}/sources/codegen/core/init_test.move`,
    'formatAndWriteMove'
  );

  let init_code = `module ${config.name}::${config.name}_genesis {
      use std::ascii::string;

  use sui::clock::Clock;

  ${config.name !== 'dubhe' ? `use dubhe::dubhe_schema::Schema as DubheSchema;` : '' }
  public entry fun run(${config.name !== 'dubhe' ? `_dubhe_schema: &mut DubheSchema,` : ''}clock: &Clock, ctx: &mut TxContext) {
    // Create schemas
    let mut schema = ${config.name}::${config.name}_schema::create(ctx);
    // Setup default storage
    dubhe::dubhe_dapp_system::create_dapp(
      ${config.name !== 'dubhe' ? `_dubhe_schema` : '&mut schema'}, 
      ${config.name}::${config.name}_dapp_key::new(), 
      dubhe::dubhe_dapp_metadata::new(string(b"${config.name}"), string(b"${config.description}"), vector[], string(b""), clock.timestamp_ms(), vector[]), 
      ctx
    );
    // Logic that needs to be automated once the contract is deployed
    ${config.name}::${config.name}_deploy_hook::run(${config.name !== 'dubhe' ? `_dubhe_schema,` : ''}&mut schema, ctx);
    // Authorize schemas and public share objects
    sui::transfer::public_share_object(schema);
  }
}
`;
  await formatAndWriteMove(
    init_code,

    `${srcPrefix}/src/${config.name}/sources/codegen/core/genesis.move`,
    'formatAndWriteMove'
  );
}
