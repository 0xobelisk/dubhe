#[test_only]
module dubhe::init_test {
  use dubhe::dapp_system;

  /// Create a DappHub for testing without sharing it.
  /// Suitable for unit tests that need a DappHub context.
  public fun create_dapp_hub_for_testing(ctx: &mut TxContext): dubhe::dapp_service::DappHub {
    dapp_system::create_dapp_hub_for_testing(ctx)
  }

}
