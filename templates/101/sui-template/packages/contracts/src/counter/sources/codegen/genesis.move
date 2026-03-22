#[allow(lint(share_owned))]module counter::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::DappHub;
      use counter::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"counter"), string(b"counter contract"), clock, ctx);

    // Logic that needs to be automated once the contract is deployed
    counter::deploy_hook::run(dapp_hub, ctx);
  }

  // Called during contract upgrades to register newly added resource tables.
  // The region between the separator comments is rewritten by `dubhe upgrade`
  // when new resources are detected, so do not manually edit that block.
  public(package) fun migrate(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
    // ==========================================
    // ==========================================
  }
}
