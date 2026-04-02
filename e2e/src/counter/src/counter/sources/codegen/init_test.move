#[test_only]module counter::init_test {
  use sui::clock;
  use sui::test_scenario;
  use sui::test_scenario::Scenario;
  use dubhe::dapp_service::{DappHub, DappStorage};
  use dubhe::dapp_system;
  use counter::dapp_key::DappKey;

  /// Deploy the DApp for testing.
  /// Returns both DappHub (framework registry) and DappStorage (per-DApp state).
  /// DappStorage is created directly via the testing helper to avoid shared-object
  /// lifecycle complications in unit test scenarios.
  public fun deploy_dapp_for_testing(scenario: &mut Scenario): (DappHub, DappStorage) {
    let ctx = test_scenario::ctx(scenario);
    let clock = clock::create_for_testing(ctx);
    let dapp_hub = dapp_system::create_dapp_hub_for_testing(ctx);
    let dapp_storage = dapp_system::create_dapp_storage_for_testing<DappKey>(ctx);
    clock::destroy_for_testing(clock);
    test_scenario::next_tx(scenario, ctx.sender());
    (dapp_hub, dapp_storage)
  }
}
