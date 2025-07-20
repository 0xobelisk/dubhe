module dubhe::gov_system;

use dubhe::dapp_service::DappHub;
use dubhe::dapp_key::DappKey;
use dubhe::wrapper_system;
use dubhe::errors::{invalid_metadata_error};
use dubhe::asset_metadata;
use dubhe::bridge_config;

public entry fun force_register_wrapped_asset<T>(
      dapp_hub: &mut DappHub, 
      name: vector<u8>, 
      symbol: vector<u8>, 
      description: vector<u8>, 
      decimals: u8, 
      icon_url: vector<u8>, 
      ctx: &mut TxContext
) {
      dapp_hub.ensure_dapp_admin<DappKey>(ctx.sender());
      wrapper_system::do_register<T>(
            dapp_hub, 
            name, 
            symbol, 
            description, 
            decimals, 
            icon_url, 
      );
}

public entry fun force_set_asset_metadata(dapp_hub: &mut DappHub, asset_id: address, name: vector<u8>, symbol: vector<u8>, description: vector<u8>, icon_url: vector<u8>, ctx: &mut TxContext) {
      dapp_hub.ensure_dapp_admin<DappKey>(ctx.sender());
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
      chain: vector<u8>, 
      min_amount: u256, 
      fee: u256, 
      opened: bool, 
      ctx: &mut TxContext
) {
      dapp_hub.ensure_dapp_admin<DappKey>(ctx.sender());
      bridge_config::set(dapp_hub, chain, min_amount, fee, opened);
}