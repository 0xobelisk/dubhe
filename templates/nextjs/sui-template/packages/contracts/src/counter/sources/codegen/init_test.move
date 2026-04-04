#[test_only]

module counter::init_test {
  use dubhe::dapp_system;

  /// Create a DappHub for testing without sharing it.
  /// Suitable for unit tests that need a DappHub context.
  public fun create_dapp_hub_for_testing(ctx: &mut TxContext): dubhe::dapp_service::DappHub {
    dapp_system::create_dapp_hub_for_testing(ctx)
  }

  /// Create a DappStorage for this DApp without sharing it.
  /// Suitable for unit tests that exercise global-resource functions.
  public fun create_dapp_storage_for_testing(ctx: &mut TxContext): dubhe::dapp_service::DappStorage {
    dubhe::dapp_system::create_dapp_storage_for_testing<counter::dapp_key::DappKey>(ctx)
  }

  /// Create a UserStorage for `owner` without sharing it.
  /// Suitable for unit tests that exercise user-level resource functions.
  public fun create_user_storage_for_testing(owner: address, ctx: &mut TxContext): dubhe::dapp_service::UserStorage {
    dubhe::dapp_system::create_user_storage_for_testing<counter::dapp_key::DappKey>(owner, ctx)
  }
}
