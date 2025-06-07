#[test_only]module counter::counter_init_test {

  use sui::clock;

  use sui::test_scenario;

  use sui::test_scenario::Scenario;

  use dubhe::dubhe_schema::Schema as DubheSchema;

  use counter::counter_schema::Schema;

  public fun deploy_dapp_for_testing(scenario: &mut Scenario): (DubheSchema, Schema) {
    let mut dubhe_schema = dubhe::dubhe_init_test::create_dubhe_schema_for_other_contract(scenario);
    let ctx = test_scenario::ctx(scenario);
    let clock = clock::create_for_testing(ctx);
    counter::counter_genesis::run(&mut dubhe_schema,&clock, ctx);
    clock::destroy_for_testing(clock);
    test_scenario::next_tx(scenario, ctx.sender());
    let schema = test_scenario::take_shared<Schema>(scenario);
    (dubhe_schema, schema)
  }
}
