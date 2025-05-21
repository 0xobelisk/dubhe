#[test_only]module dubhe::dubhe_init_test {

  use sui::clock;

  use sui::test_scenario;

  use sui::test_scenario::Scenario;

  use dubhe::dubhe_schema::Schema as DubheSchema;

  public fun deploy_dapp_for_testing(scenario: &mut Scenario): DubheSchema {
    let ctx = test_scenario::ctx(scenario);
    let clock = clock::create_for_testing(ctx);
    dubhe::dubhe_genesis::run(&clock, ctx);
    clock::destroy_for_testing(clock);
    test_scenario::next_tx(scenario, ctx.sender());
    test_scenario::take_shared<DubheSchema>(scenario)
  }

  public fun create_dubhe_schema_for_other_contract(scenario: &mut Scenario): DubheSchema {
    let ctx = test_scenario::ctx(scenario);
    let mut schema = dubhe::dubhe_schema::create(ctx);
    dubhe::dubhe_deploy_hook::run(&mut schema, ctx);
    sui::transfer::public_share_object(schema);
    test_scenario::next_tx(scenario, ctx.sender());
    test_scenario::take_shared<DubheSchema>(scenario)
  }
}
