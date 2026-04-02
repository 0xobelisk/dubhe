#[allow(lint(share_owned))]module counter::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::{DappHub, DappStorage};
      use counter::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;
      use sui::transfer;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create DApp: returns DappStorage so deploy_hook can initialise state.
    let dapp_key = dapp_key::new();
    let mut ds = dapp_system::create_dapp(dapp_key, string(b"counter"), string(b"counter contract"), clock, ctx);

    // Set up initial DApp state (e.g. default resource values).
    counter::deploy_hook::run(&mut ds, ctx);

    // Share DappStorage so every transaction can access it.
    transfer::public_share_object(ds);
  }

  // Called during contract upgrades to bump the on-chain version and register
  // newly added resource tables. `dubhe upgrade` rewrites the region between
  // the separator comments; do not edit that block manually.
  public(package) fun migrate(dapp_hub: &mut DappHub, dapp_storage: &mut DappStorage, ctx: &mut TxContext) {
    // ==========================================
    // ==========================================
  }
}
