  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module test_project::resource10 {

  use sui::bcs::{to_bytes};

  use std::ascii::{string, String, into_bytes};

  use dubhe::table_id;

  use dubhe::dapp_service::{Self, DappHub};

  use dubhe::dapp_system;

  use test_project::dapp_key;

  use test_project::dapp_key::DappKey;

  const TABLE_NAME: vector<u8> = b"resource10";

  const TABLE_TYPE: vector<u8> = b"Resource";

  const OFFCHAIN: bool = false;

  public struct Resource10 has copy, drop, store {
    player: address,
    value: String,
  }

  public fun new(player: address, value: String): Resource10 {
    Resource10 {
            player,
            value,
        }
  }

  public fun player(self: &Resource10): address {
    self.player
  }

  public fun value(self: &Resource10): String {
    self.value
  }

  public fun update_player(self: &mut Resource10, player: address) {
    self.player = player
  }

  public fun update_value(self: &mut Resource10, value: String) {
    self.value = value
  }

  public fun get_table_id(): String {
    string(TABLE_NAME)
  }

  public fun get_key_schemas(): vector<String> {
    vector[
    string(b"String")
    ]
  }

  public fun get_value_schemas(): vector<String> {
    vector[string(b"address"),
    string(b"String")
    ]
  }

  public fun get_key_names(): vector<String> {
    vector[
    string(b"name")
    ]
  }

  public fun get_value_names(): vector<String> {
    vector[string(b"player"),
    string(b"value")
    ]
  }

  public(package) fun register_table(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
    let dapp_key = dapp_key::new();
    dapp_system::register_table(
            dapp_hub,
             dapp_key,
            string(TABLE_TYPE),
            get_table_id(), 
            get_key_schemas(), 
            get_key_names(), 
            get_value_schemas(), 
            get_value_names(), 
            OFFCHAIN,
            ctx
        );
  }

  public fun has(dapp_hub: &DappHub, name: String): bool {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    dapp_system::has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public fun ensure_has(dapp_hub: &DappHub, name: String) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    dapp_system::ensure_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public fun ensure_not_has(dapp_hub: &DappHub, name: String) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    dapp_system::ensure_not_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public(package) fun delete(dapp_hub: &mut DappHub, name: String) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    dapp_system::delete_record<DappKey>(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, OFFCHAIN);
  }

  public fun get_player(dapp_hub: &DappHub, name: String): address {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value = dapp_system::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 0);
    let mut bsc_type = sui::bcs::new(value);
    let player = sui::bcs::peel_address(&mut bsc_type);
    player
  }

  public(package) fun set_player(dapp_hub: &mut DappHub, name: String, player: address) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value = to_bytes(&player);
    dapp_system::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, 0, value, OFFCHAIN);
  }

  public fun get_value(dapp_hub: &DappHub, name: String): String {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value = dapp_system::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 1);
    let mut bsc_type = sui::bcs::new(value);
    let value = dubhe::bcs::peel_string(&mut bsc_type);
    value
  }

  public(package) fun set_value(dapp_hub: &mut DappHub, name: String, value: String) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value = to_bytes(&into_bytes(value));
    dapp_system::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, 1, value, OFFCHAIN);
  }

  public fun get(dapp_hub: &DappHub, name: String): (address, String) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value_tuple = dapp_system::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
    let mut bsc_type = sui::bcs::new(value_tuple);
    let player = sui::bcs::peel_address(&mut bsc_type);
    let value = dubhe::bcs::peel_string(&mut bsc_type);
    (player, value)
  }

  public(package) fun set(dapp_hub: &mut DappHub, name: String, player: address, value: String) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value_tuple = encode(player, value);
    dapp_system::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
  }

  public fun get_struct(dapp_hub: &DappHub, name: String): Resource10 {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value_tuple = dapp_system::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
    decode(value_tuple)
  }

  public(package) fun set_struct(dapp_hub: &mut DappHub, name: String, resource10: Resource10) {
    let mut key_tuple = vector::empty();
    key_tuple.push_back(to_bytes(&name));
    let value_tuple = encode_struct(resource10);
    dapp_system::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
  }

  public fun encode(player: address, value: String): vector<vector<u8>> {
    let mut value_tuple = vector::empty();
    value_tuple.push_back(to_bytes(&player));
    value_tuple.push_back(to_bytes(&into_bytes(value)));
    value_tuple
  }

  public fun encode_struct(resource10: Resource10): vector<vector<u8>> {
    encode(resource10.player, resource10.value)
  }

  public fun decode(data: vector<u8>): Resource10 {
    let mut bsc_type = sui::bcs::new(data);
    let player = sui::bcs::peel_address(&mut bsc_type);
    let value = string(sui::bcs::peel_vec_u8(&mut bsc_type));
    Resource10 {
            player,
            value,
        }
  }
}
