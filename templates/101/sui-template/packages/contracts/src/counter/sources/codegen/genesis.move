#[allow(lint(share_owned))]module counter::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::{Self, DappHub};

  use counter::dapp_key;

  use counter::counter0;

  use counter::counter1;

  use counter::counter2;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"counter", b"counter contract", clock, ctx);
    // Register tables
    counter0::register_table(dapp_hub, ctx);
    counter1::register_table(dapp_hub, ctx);
    counter2::register_table(dapp_hub, ctx);
    // Logic that needs to be automated once the contract is deployed
    counter::deploy_hook::run(dapp_hub, ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, _ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_service::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version);
    // Register new tables
    // ==========================================
    // ==========================================
  }
}
