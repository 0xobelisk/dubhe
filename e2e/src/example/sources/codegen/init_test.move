#[test_only]module example::init_test {
  use sui::clock;
  use sui::test_scenario;
  use sui::test_scenario::Scenario;
  use dubhe::dapp_service::{DappHub, DappStorage};
  use dubhe::dapp_system;
  use example::dapp_key::DappKey;
  use example::deploy_hook;

  /// Deploy the DApp for testing.
  /// Returns both DappHub (framework registry) and DappStorage (per-DApp state).
  /// Calls deploy_hook::run to initialize default resource values, matching genesis::run behavior.
  public fun deploy_dapp_for_testing(scenario: &mut Scenario): (DappHub, DappStorage) {
    let ctx = test_scenario::ctx(scenario);
    let clock = clock::create_for_testing(ctx);
    let dapp_hub = dapp_system::create_dapp_hub_for_testing(ctx);
    let mut dapp_storage = dapp_system::create_dapp_storage_for_testing<DappKey>(ctx);
    deploy_hook::run(&mut dapp_storage, ctx);
    clock::destroy_for_testing(clock);
    test_scenario::next_tx(scenario, ctx.sender());
    (dapp_hub, dapp_storage)
  }
}
