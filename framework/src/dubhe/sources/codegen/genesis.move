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
    let mut ds = dapp_system::create_dapp(dapp_key, dapp_hub, string(b"dubhe"), string(b"Dubhe Protocol"), clock, ctx);

    // Set up initial DApp state (e.g. default resource values).
    dubhe::deploy_hook::run(dapp_hub, ctx);

    // Share DappStorage so every transaction can access it.
    transfer::public_share_object(ds);
  }

  // Called during contract upgrades to register newly added resource tables
  // and run any custom migration logic. `dubhe upgrade` rewrites the region
  // between the separator comments; do not edit that block manually.
  public(package) fun migrate(_dapp_hub: &mut DappHub, _dapp_storage: &mut DappStorage, _ctx: &mut TxContext) {
    // ==========================================
    // Add custom migration logic here (e.g. initialise new resource defaults).
    // migrate_to_vN in migrate.move calls this function automatically.
    // ==========================================
  }
}
