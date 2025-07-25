  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module dubhe::bridge_deposit {

  use sui::bcs::{to_bytes};

  use std::ascii::{string, String, into_bytes};

  use dubhe::table_id;

  use dubhe::dapp_service::{Self, DappHub};

  use dubhe::dapp_system;

  use dubhe::dapp_key;

  use dubhe::dapp_key::DappKey;

  const TABLE_NAME: vector<u8> = b"bridge_deposit";

  const TABLE_TYPE: vector<u8> = b"Resource";

  const OFFCHAIN: bool = true;

  public struct BridgeDeposit has copy, drop, store {
    from: address,
    to: address,
    from_chain: String,
    amount: u256,
  }

  public fun new(from: address, to: address, from_chain: String, amount: u256): BridgeDeposit {
    BridgeDeposit {
            from,
            to,
            from_chain,
            amount,
        }
  }

  public fun from(self: &BridgeDeposit): address {
    self.from
  }

  public fun to(self: &BridgeDeposit): address {
    self.to
  }

  public fun from_chain(self: &BridgeDeposit): String {
    self.from_chain
  }

  public fun amount(self: &BridgeDeposit): u256 {
    self.amount
  }

  public fun update_from(self: &mut BridgeDeposit, from: address) {
    self.from = from
  }

  public fun update_to(self: &mut BridgeDeposit, to: address) {
    self.to = to
  }

  public fun update_from_chain(self: &mut BridgeDeposit, from_chain: String) {
    self.from_chain = from_chain
  }

  public fun update_amount(self: &mut BridgeDeposit, amount: u256) {
    self.amount = amount
  }

  public fun get_table_id(): String {
    string(TABLE_NAME)
  }

  public fun get_key_schemas(): vector<String> {
    vector[]
  }

  public fun get_value_schemas(): vector<String> {
    vector[string(b"address"), string(b"address"), string(b"String"),
    string(b"u256")
    ]
  }

  public fun get_key_names(): vector<String> {
    vector[]
  }

  public fun get_value_names(): vector<String> {
    vector[string(b"from"), string(b"to"), string(b"from_chain"),
    string(b"amount")
    ]
  }

  public(package) fun register_table(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
    let dapp_key = dapp_key::new();
    dapp_service::register_table(
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

  public fun has(dapp_hub: &DappHub): bool {
    let key_tuple = vector::empty();
    dapp_service::has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public fun ensure_has(dapp_hub: &DappHub) {
    let key_tuple = vector::empty();
    dapp_service::ensure_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public fun ensure_not_has(dapp_hub: &DappHub) {
    let key_tuple = vector::empty();
    dapp_service::ensure_not_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
  }

  public(package) fun delete(dapp_hub: &mut DappHub) {
    let key_tuple = vector::empty();
    dapp_service::delete_record<DappKey>(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, OFFCHAIN);
  }

  public fun get_from(dapp_hub: &DappHub): address {
    let key_tuple = vector::empty();
    let value = dapp_service::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 0);
    let mut bsc_type = sui::bcs::new(value);
    let from = sui::bcs::peel_address(&mut bsc_type);
    from
  }

  public(package) fun set_from(dapp_hub: &mut DappHub, from: address) {
    let key_tuple = vector::empty();
    let value = to_bytes(&from);
    dapp_service::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, 0, value, OFFCHAIN);
  }

  public fun get_to(dapp_hub: &DappHub): address {
    let key_tuple = vector::empty();
    let value = dapp_service::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 1);
    let mut bsc_type = sui::bcs::new(value);
    let to = sui::bcs::peel_address(&mut bsc_type);
    to
  }

  public(package) fun set_to(dapp_hub: &mut DappHub, to: address) {
    let key_tuple = vector::empty();
    let value = to_bytes(&to);
    dapp_service::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, 1, value, OFFCHAIN);
  }

  public fun get_from_chain(dapp_hub: &DappHub): String {
    let key_tuple = vector::empty();
    let value = dapp_service::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 2);
    let mut bsc_type = sui::bcs::new(value);
    let from_chain = dubhe::bcs::peel_string(&mut bsc_type);
    from_chain
  }

  public(package) fun set_from_chain(dapp_hub: &mut DappHub, from_chain: String) {
    let key_tuple = vector::empty();
    let value = to_bytes(&into_bytes(from_chain));
    dapp_service::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, 2, value, OFFCHAIN);
  }

  public fun get_amount(dapp_hub: &DappHub): u256 {
    let key_tuple = vector::empty();
    let value = dapp_service::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 3);
    let mut bsc_type = sui::bcs::new(value);
    let amount = sui::bcs::peel_u256(&mut bsc_type);
    amount
  }

  public(package) fun set_amount(dapp_hub: &mut DappHub, amount: u256) {
    let key_tuple = vector::empty();
    let value = to_bytes(&amount);
    dapp_service::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, 3, value, OFFCHAIN);
  }

  public fun get(dapp_hub: &DappHub): (address, address, String, u256) {
    let key_tuple = vector::empty();
    let value_tuple = dapp_service::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
    let mut bsc_type = sui::bcs::new(value_tuple);
    let from = sui::bcs::peel_address(&mut bsc_type);
    let to = sui::bcs::peel_address(&mut bsc_type);
    let from_chain = dubhe::bcs::peel_string(&mut bsc_type);
    let amount = sui::bcs::peel_u256(&mut bsc_type);
    (from, to, from_chain, amount)
  }

  public(package) fun set(dapp_hub: &mut DappHub, from: address, to: address, from_chain: String, amount: u256) {
    let key_tuple = vector::empty();
    let value_tuple = encode(from, to, from_chain, amount);
    dapp_service::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
  }

  public fun get_struct(dapp_hub: &DappHub): BridgeDeposit {
    let key_tuple = vector::empty();
    let value_tuple = dapp_service::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
    decode(value_tuple)
  }

  public(package) fun set_struct(dapp_hub: &mut DappHub, bridge_deposit: BridgeDeposit) {
    let key_tuple = vector::empty();
    let value_tuple = encode_struct(bridge_deposit);
    dapp_service::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
  }

  public fun encode(from: address, to: address, from_chain: String, amount: u256): vector<vector<u8>> {
    let mut value_tuple = vector::empty();
    value_tuple.push_back(to_bytes(&from));
    value_tuple.push_back(to_bytes(&to));
    value_tuple.push_back(to_bytes(&into_bytes(from_chain)));
    value_tuple.push_back(to_bytes(&amount));
    value_tuple
  }

  public fun encode_struct(bridge_deposit: BridgeDeposit): vector<vector<u8>> {
    encode(bridge_deposit.from, bridge_deposit.to, bridge_deposit.from_chain, bridge_deposit.amount)
  }

  public fun decode(data: vector<u8>): BridgeDeposit {
    let mut bsc_type = sui::bcs::new(data);
    let from = sui::bcs::peel_address(&mut bsc_type);
    let to = sui::bcs::peel_address(&mut bsc_type);
    let from_chain = string(sui::bcs::peel_vec_u8(&mut bsc_type));
    let amount = sui::bcs::peel_u256(&mut bsc_type);
    BridgeDeposit {
            from,
            to,
            from_chain,
            amount,
        }
  }
}
