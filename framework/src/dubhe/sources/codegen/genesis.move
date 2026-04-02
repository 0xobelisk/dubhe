#[allow(lint(share_owned))]module dubhe::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::{DappHub, DappStorage};
      use dubhe::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;
      use sui::transfer;

  // The one-shot guard is enforced inside dapp_system::create_dapp, which
  // records the DappKey type in DappHub before returning DappStorage.
  // genesis.move does not need to carry its own guard.
  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // create_dapp aborts with dapp_already_initialized_error on repeated calls.
    let dapp_key = dapp_key::new();
    let ds = dapp_system::create_dapp(dapp_key, dapp_hub, string(b"dubhe"), string(b"Dubhe Protocol"), clock, ctx);
    transfer::public_share_object(ds);

    // Initialise framework-level config (FrameworkFeeConfig in DappHub).
    dubhe::deploy_hook::run(dapp_hub, ctx);
  }

  // Called during contract upgrades to bump the on-chain version and register
  // newly added resource tables. `dubhe upgrade` rewrites the region between
  // the separator comments; do not edit that block manually.
  public(package) fun migrate(dapp_hub: &mut DappHub, _dapp_storage: &mut DappStorage, _ctx: &mut TxContext) {
    // ==========================================
    // Bump DappHub.version so version-gated lifecycle functions in the new
    // package are unlocked; calls from the old package ID will abort if
    // FRAMEWORK_VERSION was incremented in dapp_system.move.
    // This call is idempotent: if FRAMEWORK_VERSION is unchanged the version
    // stays the same and old clients continue to work normally.
    dapp_system::bump_framework_version(dapp_hub);
    // ==========================================
  }
}
