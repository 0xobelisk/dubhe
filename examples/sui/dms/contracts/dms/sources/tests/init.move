#[test_only]module dms::dms_init_test {

  use dms::dms_dapp_schema::Dapp;

  use sui::clock;

  use sui::test_scenario;

  use sui::test_scenario::Scenario;

  public fun deploy_dapp_for_testing(sender: address): (Scenario, Dapp) {
    let mut scenario = test_scenario::begin(sender);
    let ctx = test_scenario::ctx(&mut scenario);
    let clock = clock::create_for_testing(ctx);
    dms::dms_genesis::run(&clock, ctx);
    clock::destroy_for_testing(clock);
    test_scenario::next_tx(&mut scenario,sender);
    let dapp = test_scenario::take_shared<Dapp>(&scenario);
    (scenario, dapp)
  }
}
