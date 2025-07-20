#[allow(lint(share_owned))]module dubhe::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::{Self, DappHub};

  use dubhe::dapp_key;

  use dubhe::dubhe_asset_id;

  use dubhe::dubhe_config;

  use dubhe::asset_metadata;

  use dubhe::asset_account;

  use dubhe::asset_pools;

  use dubhe::bridge_config;

  use dubhe::bridge_withdraw;

  use dubhe::bridge_deposit;

  use dubhe::wrapper_assets;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"dubhe", b"Dubhe Protocol", clock, ctx);
    // Register tables
    dubhe_asset_id::register_table(dapp_hub, ctx);
    dubhe_config::register_table(dapp_hub, ctx);
    asset_metadata::register_table(dapp_hub, ctx);
    asset_account::register_table(dapp_hub, ctx);
    asset_pools::register_table(dapp_hub, ctx);
    bridge_config::register_table(dapp_hub, ctx);
    bridge_withdraw::register_table(dapp_hub, ctx);
    bridge_deposit::register_table(dapp_hub, ctx);
    wrapper_assets::register_table(dapp_hub, ctx);
    // Logic that needs to be automated once the contract is deployed
    dubhe::deploy_hook::run(dapp_hub, ctx);
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
