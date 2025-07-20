module dubhe::bridge_system;
use std::u64;
use dubhe::dubhe::DUBHE;
use sui::coin::TreasuryCap;
use sui::coin;
use dubhe::wrapper_system;
use dubhe::errors::{
      overflows_error, bridge_not_opened_error, below_min_amount_error
};
use dubhe::assets_functions;
use dubhe::dapp_service::DappHub;
use dubhe::bridge_config;
use dubhe::bridge_withdraw;
use dubhe::bridge_deposit;
use dubhe::dubhe_config;
use dubhe::dubhe_asset_id;
use dubhe::dapp_key;
use dubhe::dapp_key::DappKey;
use dubhe::dubhe::get_treasury_cap_key;

public entry fun withdraw(
      dapp_hub: &mut DappHub, 
      amount: u256, 
      to: address, 
      to_chain: vector<u8>,
      ctx: &mut TxContext
) {
      let dubhe_asset_id = dubhe_asset_id::get(dapp_hub);
      bridge_config::ensure_has(dapp_hub, to_chain);
      let from = ctx.sender();
      let (min_amount, fee, opened) = bridge_config::get(dapp_hub, to_chain);
      below_min_amount_error(amount >= min_amount);
      bridge_not_opened_error(opened);
      let fee_to = dubhe_config::get_fee_to(dapp_hub);
      assets_functions::do_transfer(dapp_hub, dubhe_asset_id, from, fee_to, fee);

      // Burn DUBHE
      let coin = wrapper_system::do_unwrap<DUBHE>(dapp_hub, amount - fee, ctx);
      let dapp_key = dapp_key::new();
      let treasury_cap_key = get_treasury_cap_key();
      let treasury_cap = dapp_hub.get_objects(dapp_key).borrow_mut<address, TreasuryCap<DUBHE>>(treasury_cap_key);
      coin::burn(treasury_cap, coin);

      bridge_withdraw::set(dapp_hub, from, to, to_chain, amount, fee);
}

public entry fun deposit(dapp_hub: &mut DappHub, from: address, to: address, from_chain: vector<u8>, amount: u256, ctx: &mut TxContext) {
      // Ensure admin
      dapp_hub.ensure_dapp_admin<DappKey>(ctx.sender());

      bridge_config::ensure_has(dapp_hub, from_chain);
      overflows_error(amount <= u64::max_value!() as u256);

      // Mint DUBHE
      let dapp_key = dapp_key::new();
      let treasury_cap_key = get_treasury_cap_key();
      let treasury_cap = dapp_hub.get_objects(dapp_key).borrow_mut<address, TreasuryCap<DUBHE>>(treasury_cap_key);
      let coin = coin::mint(treasury_cap, amount as u64, ctx);

      wrapper_system::wrap<DUBHE>(dapp_hub, coin, to);
      bridge_deposit::set(dapp_hub, from, to, from_chain, amount);
}