  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module dubhe::wrapper_assets {

  use sui::bcs::{to_bytes};

  use dubhe::table_id;

  use dubhe::dapp_service::{Self, DappHub};

  use dubhe::dapp_system;

  use dubhe::dapp_key;

  use dubhe::dapp_key::DappKey;

  const TABLE_NAME: vector<u8> = b"wrapper_assets";

  public fun get_table_id(): vector<u8> {
    table_id::encode(table_id::onchain_table_type(), TABLE_NAME)
  }

  public fun get_key_schemas(): vector<vector<u8>> {
    vector[b"vector<u8>"]
  }

  public fun get_value_schemas(): vector<vector<u8>> {
    vector[b"address"]
  }

  public fun get_key_names(): vector<vector<u8>> {
    vector[b"coin_type"]
  }

  public fun get_value_names(): vector<vector<u8>> {
    vector[b"asset_id"]
  }

  public(package) fun register_table(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
    let dapp_key = dapp_key::new();
    dapp_service::register_table(
            dapp_hub, 
            dapp_key,
            get_table_id(), 
            get_key_schemas(), 
            get_key_names(), 
            get_value_schemas(), 
            get_value_names(), 
            ctx
        );
  }

  public fun has(dapp_hub: &DappHub, coin_type: vector<u8>): bool {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&coin_type));
    dapp_service::has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public fun ensure_has(dapp_hub: &DappHub, coin_type: vector<u8>) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&coin_type));
    dapp_service::ensure_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public fun ensure_not_has(dapp_hub: &DappHub, coin_type: vector<u8>) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&coin_type));
    dapp_service::ensure_not_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public(package) fun delete(dapp_hub: &mut DappHub, coin_type: vector<u8>) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&coin_type));
    dapp_service::delete_record<DappKey>(dapp_hub, dapp_key::new(), get_table_id(), key_tuple);
  }

  public fun get(dapp_hub: &DappHub, coin_type: vector<u8>): address {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&coin_type));
    let value = dapp_service::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 0);
    let mut bsc_type = sui::bcs::new(value);
    let value = sui::bcs::peel_address(&mut bsc_type);
    value
  }

  public(package) fun set(dapp_hub: &mut DappHub, coin_type: vector<u8>, value: address) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&coin_type));
    let value_tuple = encode(value);
    dapp_service::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple);
  }

  public fun encode(value: address): vector<vector<u8>> {
    let mut value_tuple = vector::empty();
    value_tuple.push_back(to_bytes(&value));
    value_tuple
  }
}
