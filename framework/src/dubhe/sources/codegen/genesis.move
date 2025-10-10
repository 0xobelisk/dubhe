#[allow(lint(share_owned))]module dubhe::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::DappHub;

  use dubhe::dapp_key;

  use dubhe::dapp_system;

  use std::ascii::string;

  use dubhe::dubhe_asset_id;

  use dubhe::sui_asset_id;

  use dubhe::dubhe_config;

  use dubhe::asset_metadata;

  use dubhe::asset_supply;

  use dubhe::asset_holder;

  use dubhe::asset_account;

  use dubhe::asset_pool;

  use dubhe::asset_wrapper;

  use dubhe::dapp_metadata;

  use dubhe::dapp_fee_config;

  use dubhe::dapp_fee_state;

  use dubhe::dapp_proxy;

  use dubhe::asset_transfer;

  use dubhe::asset_wrap;

  use dubhe::asset_unwrap;

  use dubhe::asset_swap;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"dubhe"), string(b"Dubhe Protocol"), clock, ctx);
    // Register tables
    dubhe_asset_id::register_table(dapp_hub, ctx);
    sui_asset_id::register_table(dapp_hub, ctx);
    dubhe_config::register_table(dapp_hub, ctx);
    asset_metadata::register_table(dapp_hub, ctx);
    asset_supply::register_table(dapp_hub, ctx);
    asset_holder::register_table(dapp_hub, ctx);
    asset_account::register_table(dapp_hub, ctx);
    asset_pool::register_table(dapp_hub, ctx);
    asset_wrapper::register_table(dapp_hub, ctx);
    dapp_metadata::register_table(dapp_hub, ctx);
    dapp_fee_config::register_table(dapp_hub, ctx);
    dapp_fee_state::register_table(dapp_hub, ctx);
    dapp_proxy::register_table(dapp_hub, ctx);
    asset_transfer::register_table(dapp_hub, ctx);
    asset_wrap::register_table(dapp_hub, ctx);
    asset_unwrap::register_table(dapp_hub, ctx);
    asset_swap::register_table(dapp_hub, ctx);
    // Logic that needs to be automated once the contract is deployed
    dubhe::deploy_hook::run(dapp_hub, ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_system::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version, ctx);
    // Register new tables
    // ==========================================
    // ==========================================
  }
}
