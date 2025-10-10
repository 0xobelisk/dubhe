module dubhe::gov_system;

use dubhe::dapp_service::DappHub;
use dubhe::dapp_key::DappKey;
use dubhe::wrapper_system;
use dubhe::errors::{invalid_metadata_error};
use dubhe::asset_metadata;
use dubhe::bridge_config;
use dubhe::dapp_system;
use std::ascii::String;
use dubhe::dubhe_asset_id;
use sui::coin::TreasuryCap;
use dubhe::dapp_key;
use dubhe::utils::get_treasury_cap_key_address;

public entry fun force_register_wrapped_asset<T>(
      dapp_hub: &mut DappHub, 
      name: String, 
      symbol: String, 
      description: String, 
      decimals: u8, 
      icon_url: String, 
      ctx: &mut TxContext
) {
      dapp_system::ensure_dapp_admin<DappKey>(dapp_hub, ctx.sender());
      wrapper_system::do_register<T>(
            dapp_hub, 
            name, 
            symbol, 
            description, 
            decimals, 
            icon_url, 
      );
}

public entry fun force_set_asset_metadata(dapp_hub: &mut DappHub, asset_id: address, name: String, symbol: String, description: String, icon_url: String, ctx: &mut TxContext) {
      dapp_system::ensure_dapp_admin<DappKey>(dapp_hub, ctx.sender());
      asset_metadata::ensure_has(dapp_hub, asset_id);

      let mut asset_metadata = asset_metadata::get_struct(dapp_hub, asset_id);
      invalid_metadata_error(!name.is_empty() && !symbol.is_empty() && !description.is_empty() && !icon_url.is_empty());

      asset_metadata.update_name(name);
      asset_metadata.update_symbol(symbol);
      asset_metadata.update_description(description);
      asset_metadata.update_icon_url(icon_url);
      asset_metadata::set_struct(dapp_hub, asset_id, asset_metadata);
}

public entry fun set_bridge(dapp_hub: &mut DappHub, 
      chain: String, 
      min_amount: u256, 
      fee: u256, 
      opened: bool, 
      ctx: &mut TxContext
) {
      dapp_system::ensure_dapp_admin<DappKey>(dapp_hub, ctx.sender());
      bridge_config::set(dapp_hub, chain, min_amount, fee, opened);
}

public entry fun set_dubhe_asset_id(dapp_hub: &mut DappHub, asset_id: address, ctx: &mut TxContext) {
      dapp_system::ensure_dapp_admin<DappKey>(dapp_hub, ctx.sender());
      dubhe_asset_id::set(dapp_hub, asset_id);
}

public entry fun deposit_treasury_cap<CoinType>(
    dapp_hub: &mut DappHub,
    treasury_cap: TreasuryCap<CoinType>,
    ctx: &mut TxContext
) {
    dapp_system::ensure_dapp_admin<DappKey>(dapp_hub, ctx.sender());
    let dapp_key = dapp_key::new();
    let treasury_cap_key = get_treasury_cap_key_address<CoinType>();
    dapp_system::get_mut_dapp_objects(dapp_hub, dapp_key).add<address, TreasuryCap<CoinType>>(treasury_cap_key, treasury_cap);
}

public entry fun withdraw_treasury_cap<CoinType>(
    dapp_hub: &mut DappHub,
    ctx: &mut TxContext
) {
    dapp_system::ensure_dapp_admin<DappKey>(dapp_hub, ctx.sender());
    let dapp_key = dapp_key::new();
    let treasury_cap_key = get_treasury_cap_key_address<CoinType>();
    let treasury_cap = dapp_system::get_mut_dapp_objects(dapp_hub, dapp_key).remove<address, TreasuryCap<CoinType>>(treasury_cap_key);
    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
}