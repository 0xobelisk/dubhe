module dubhe::dubhe_gov_system;

use dubhe::dubhe_dapp_key;
use dubhe::dubhe_schema::Schema;
use dubhe::dubhe_dapp_system::ensure_dapp_admin_sign;
use dubhe::dubhe_bridge_config;
use std::ascii::String;
use dubhe::dubhe_wrapper_system;
use dubhe::dubhe_errors::{asset_not_found_error, no_permission_error, invalid_metadata_error};
public entry fun force_register<T>(schema: &mut Schema, name: String, symbol: String, description: String, decimals: u8, url: String, info: String, ctx: &mut TxContext) {
      ensure_dapp_admin_sign(schema, dubhe_dapp_key::new(), ctx);
      dubhe_wrapper_system::do_register<T>(
            schema, 
            name, 
            symbol, 
            description, 
            decimals, 
            url, 
            info
      );
}

public entry fun force_set_asset_metadata(schema: &mut Schema, asset_id: u256, name: String, symbol: String, description: String, icon_url: String, ctx: &mut TxContext) {
      ensure_dapp_admin_sign(schema, dubhe_dapp_key::new(), ctx);
      asset_not_found_error(schema.asset_metadata().contains(asset_id));
      let mut asset_metadata = schema.asset_metadata()[asset_id];
      invalid_metadata_error(!name.is_empty() && !symbol.is_empty() && !description.is_empty() && !icon_url.is_empty());

      asset_metadata.set_name(name);
      asset_metadata.set_symbol(symbol);
      asset_metadata.set_description(description);
      asset_metadata.set_icon_url(icon_url);
      schema.asset_metadata().set(asset_id, asset_metadata);
}

public entry fun set_bridge(schema: &mut Schema, chain: String, min_amount: u256,  fee: u256, opened: bool, ctx: &TxContext) {
      ensure_dapp_admin_sign(schema, dubhe_dapp_key::new(), ctx);
      schema.bridge().set(chain, dubhe_bridge_config::new(min_amount, fee, opened));
}

public entry fun set_dapp_per_set_fee(schema: &mut Schema, package_id: address, per_set_fee: u256, ctx: &TxContext) {
    ensure_dapp_admin_sign(schema, dubhe_dapp_key::new(), ctx);
    let mut dapp_stats = schema.dapp_stats()[package_id];
    dapp_stats.set_per_set_fee(per_set_fee);
    schema.dapp_stats().set(package_id, dapp_stats);
  }

public entry fun set_dapp_remaining_set_count(schema: &mut Schema, package_id: address, remaining_set_count: u256, ctx: &TxContext) {
    ensure_dapp_admin_sign(schema, dubhe_dapp_key::new(), ctx);
    let mut dapp_stats = schema.dapp_stats()[package_id];
    dapp_stats.set_remaining_set_count(remaining_set_count);
    schema.dapp_stats().set(package_id, dapp_stats);
}