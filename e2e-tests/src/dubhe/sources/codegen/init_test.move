#[test_only]module dubhe::init_test {

  use sui::clock;

  use sui::test_scenario;

  use sui::test_scenario::Scenario;

  use dubhe::dapp_service::{Self, DappHub};

  public fun deploy_dapp_for_testing(scenario: &mut Scenario): DappHub {
    let ctx = test_scenario::ctx(scenario);
    let clock = clock::create_for_testing(ctx);
    let mut dapp_hub = dapp_service::create_dapp_hub_for_testing(ctx);
    dubhe::genesis::run(&mut dapp_hub, &clock, ctx);
    clock::destroy_for_testing(clock);
    test_scenario::next_tx(scenario, ctx.sender());
    dapp_hub
  }
}
