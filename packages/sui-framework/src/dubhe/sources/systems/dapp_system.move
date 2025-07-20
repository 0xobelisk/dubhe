module dubhe::dapp_system;
use dubhe::dapp_service::DappHub;
use dubhe::dapp_service;
use dubhe::type_info;
use dubhe::dapp_key::DappKey;
use dubhe::dapp_key;
use sui::clock::Clock;
use sui::clock;
use dubhe::dapp_metadata;
use dubhe::errors::{
  no_permission_error, 
  not_latest_version_error, 
  dapp_already_paused_error, 
  invalid_package_id_error, 
  invalid_version_error,
  insufficient_credit_error,
  dapp_not_been_delegated_error
};
use dubhe::dapp_fee_state;
use sui::bag::Bag;
use dubhe::dapp_fee_config;
use dubhe::dapp_fee_config::free_credit;
use dubhe::dapp_proxy;
use std::bcs;

public fun register_table<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  table_id: vector<u8>,
  key_schemas: vector<vector<u8>>,
  key_names: vector<vector<u8>>,
  value_schemas: vector<vector<u8>>,
  value_names: vector<vector<u8>>,
  ctx: &mut TxContext
) {
  dapp_service::register_table(dh, dapp_key, table_id, key_schemas, key_names, value_schemas, value_names, ctx);
}

/// Set a record
public fun set_record<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>,
  value_tuple: vector<vector<u8>>
) {
  dapp_service::set_record<DappKey>(dh, dapp_key, table_id, key_tuple, value_tuple);

   let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  charge_fee(dh, dapp_key, key_tuple, value_tuple);
}


// fun set_record_internal(
//   dh: &mut DappHub,
//   dapp_key: std::ascii::String,
//   table_id: vector<u8>,
//   key_tuple: vector<vector<u8>>,
//   value_tuple: vector<vector<u8>>
// ) {
//   dapp_service::set_record(dh, dapp_key, table_id, key_tuple, value_tuple);

//   let dapp_key = dapp_key.into_bytes();
//   charge_fee(dh, dapp_key, key_tuple, value_tuple);
// }

/// Set a field
public fun set_field<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>,
  field_index: u8,
  value: vector<u8>
) {
  dapp_service::set_field(dh, dapp_key, table_id, key_tuple, field_index, value);

  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  charge_fee(dh, dapp_key, key_tuple, vector[value]);
}

public fun delete_record<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>
) {
  dapp_service::delete_record(dh, dapp_key, table_id, key_tuple);
}

/// Get a record
public fun get_record<DappKey: copy + drop>(
  dh: &DappHub,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>
): vector<u8> {
  dapp_service::get_record<DappKey>(dh, table_id, key_tuple)
}

/// Get a field
public fun get_field<DappKey: copy + drop>(
  dh: &DappHub,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>,
  field_index: u8
): vector<u8> {
  dapp_service::get_field<DappKey>(dh, table_id, key_tuple, field_index)
}


public fun has_record<DappKey: copy + drop>(
  dh: &DappHub,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>
): bool {
  dapp_service::has_record<DappKey>(dh, table_id, key_tuple)
}

public fun ensure_has_record<DappKey: copy + drop>(
  dh: &DappHub,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>
) {
  dapp_service::ensure_has_record<DappKey>(dh, table_id, key_tuple)
}

public fun ensure_not_has_record<DappKey: copy + drop>(
  dh: &DappHub,
  table_id: vector<u8>,
  key_tuple: vector<vector<u8>>
) {
  dapp_service::ensure_not_has_record<DappKey>(dh, table_id, key_tuple)
}

public fun get_mut_dapp_objects<DappKey: copy + drop>(
    dh: &mut DappHub,
    dapp_key: DappKey,
): &mut Bag {
    dapp_service::get_mut_dapp_objects(dh, dapp_key)
}

public fun create_dapp<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  name: vector<u8>,
  description: vector<u8>,
  clock: &Clock,
  ctx: &mut TxContext
) {
  dapp_service::create_dapp(dh, dapp_key, ctx); 
  let dubhe_dapp_key = dapp_key::new();
  if(!dapp_key::eq(&dapp_key, &dubhe_dapp_key)) {
    initialize_metadata(dh, dapp_key, name, description, clock, ctx);
    initialize_fee_state(dh, dapp_key);
  };
}

public fun initialize_metadata<DappKey: copy + drop>(
  dh: &mut DappHub,
  _: DappKey,
  name: vector<u8>,
  description: vector<u8>,
  clock: &Clock,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  let created_at = clock::timestamp_ms(clock);
  let admin = ctx.sender();
  let version = 1;
  let pausable = false;
  let package_ids = vector[type_info::get_package_id<DappKey>()];
  let cover_url = vector::empty<vector<u8>>();
  let website_url = vector::empty<u8>();
  let partners = vector::empty<vector<u8>>();
  dapp_metadata::set(
    dh, 
    dapp_key.into_bytes(), 
    name, 
    description, 
    website_url, 
    cover_url, 
    partners, 
    package_ids, 
    created_at, 
    admin, 
    version, 
    pausable
  );
}

public fun initialize_fee_state<DappKey: copy + drop>(
  dh: &mut DappHub,
  _: DappKey,
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  let (free_credit, base_fee, byte_fee) = dapp_fee_config::get(dh);
  std::debug::print(&dapp_key);
  dapp_fee_state::set(
    dh, 
    dapp_key.into_bytes(), 
    base_fee,
    byte_fee,
    free_credit,
    0,
    0,
    0,
  );
}

public fun upgrade_dapp<DappKey: copy + drop>(
    dh: &mut DappHub,
    _: DappKey,
    new_package_id: address,
    new_version: u32,
    ctx: &mut TxContext
) {
    let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
    dapp_metadata::ensure_has(dh, dapp_key);
    no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
    let mut package_ids = dapp_metadata::get_package_ids(dh, dapp_key);
    invalid_package_id_error(!package_ids.contains(&new_package_id));
    package_ids.push_back(new_package_id);
    invalid_version_error(new_version > dapp_metadata::get_version(dh, dapp_key));
    dapp_metadata::set_package_ids(dh, dapp_key, package_ids);
    dapp_metadata::set_version(dh, dapp_key, new_version);
} 

public fun set_pausable(
    dh: &mut DappHub,
    dapp_key: vector<u8>,
    pausable: bool,
    ctx: &mut TxContext
) {
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  dapp_metadata::set_pausable(dh, dapp_key, pausable);
}

public fun transfer_ownership(
    dh: &mut DappHub,
    dapp_key: vector<u8>,
    new_admin: address,
    ctx: &mut TxContext
) {
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  dapp_metadata::set_admin(dh, dapp_key, new_admin);
}

public fun set_metadata(
    dh: &mut DappHub,
    dapp_key: vector<u8>,
    name: vector<u8>,
    description: vector<u8>,
    website_url: vector<u8>,
    cover_url: vector<vector<u8>>,
    partners: vector<vector<u8>>,
    ctx: &mut TxContext
) {
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  let mut dapp_metadata = dapp_metadata::get_struct(dh, dapp_key);
  dapp_metadata.update_name(name);
  dapp_metadata.update_description(description);
  dapp_metadata.update_website_url(website_url);
  dapp_metadata.update_cover_url(cover_url);
  dapp_metadata.update_partners(partners);
  dapp_metadata::set_struct(dh, dapp_key, dapp_metadata);
}

public(package) fun calculate_bytes_size_and_fee(dh: &DappHub, dapp_key: vector<u8>, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>): (u256, u256) {
  let fee_state = dapp_fee_state::get_struct(dh, dapp_key);
    let mut total_bytes_size = 0;

    let mut i = 0;
    while (i < key_tuple.length()) {
        let key_bytes_size = key_tuple[i].length();
        total_bytes_size = total_bytes_size + key_bytes_size;
        i = i + 1;
    };

    let mut j = 0;
    while (j < value_tuple.length()) {
        let value_bytes_size = value_tuple[j].length();
        total_bytes_size = total_bytes_size + value_bytes_size;
        j = j + 1;
    };

    (total_bytes_size as u256, total_bytes_size as u256 * fee_state.byte_fee() + fee_state.base_fee())
}

public(package) fun charge_fee(dh: &mut DappHub, dapp_key: vector<u8>, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>) {
   let ( bytes_size, fee ) = calculate_bytes_size_and_fee(dh, dapp_key, key_tuple, value_tuple);
   let mut fee_state = dapp_fee_state::get_struct(dh, dapp_key);
   let total_bytes_size = fee_state.total_bytes_size();
   let total_paid = fee_state.total_paid();
   let total_recharged = fee_state.total_recharged();
   let free_credit = fee_state.free_credit();
   if(free_credit >= fee) {
    fee_state.update_free_credit(free_credit - fee);
   } else { 
    insufficient_credit_error(total_recharged >= fee);
    fee_state.update_total_recharged(total_recharged - fee);
   };
   fee_state.update_total_bytes_size(total_bytes_size + bytes_size);
   fee_state.update_total_paid(total_paid + fee);
   dapp_fee_state::set_struct(dh, dapp_key, fee_state);
}

public fun recharge(
  dh: &mut DappHub,
  dapp_key: vector<u8>,
  amount: u256,
  ctx: &mut TxContext
) {
  dapp_metadata::ensure_has(dh, dapp_key);
  // TODO: transfer dubhe to fee receiver
  let total_recharged = dapp_fee_state::get_total_recharged(dh, dapp_key);
  dapp_fee_state::set_total_recharged(dh, dapp_key, total_recharged + amount);
}

public fun ensure_dapp_admin<DappKey: copy + drop>(
    dh: &DappHub,
    admin: address
) {
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == admin);
}

public fun ensure_latest_version<DappKey: copy + drop>(
    dh: &DappHub,
    version: u32
) {
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  dapp_metadata::ensure_has(dh, dapp_key);
  not_latest_version_error(dapp_metadata::get_version(dh, dapp_key) == version);
}

public fun ensure_not_pausable<DappKey: copy + drop>(
    dh: &DappHub
) {
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  dapp_metadata::ensure_has(dh, dapp_key);
  dapp_already_paused_error(!dapp_metadata::get_pausable(dh, dapp_key));
}

public fun delegate<DappKey: copy + drop>(
  dh: &mut DappHub,
  delegator: address,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  dapp_proxy::set(dh, dapp_key, delegator, true);
}

public fun undelegate<DappKey: copy + drop>(
  dh: &mut DappHub,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  dapp_proxy::set(dh, dapp_key, @0x0, false);
}

public fun is_delegated<DappKey: copy + drop>(
  dh: &DappHub,
  dapp_key: vector<u8>
): bool {
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  dapp_proxy::get_enabled(dh, dapp_key)
}

public fun set_storage<DappKey: copy + drop>(
  dh: &mut DappHub,
  value: u32,
  ctx: &mut TxContext
) {
  let table_id = vector[111,110,116,118,97,108,117,101];
  let key_tuple = vector::empty();
  std::debug::print(&key_tuple);
  let mut value_tuple = vector::empty();
  value_tuple.push_back(bcs::to_bytes(&value));
  let dapp_key = type_info::get_type_name_string<DappKey>().into_bytes();
  // dapp_proxy::ensure_has(dh, dapp_key);
  // let (delegator, enabled) = dapp_proxy::get(dh, dapp_key);
  // dapp_not_been_delegated_error(!enabled);
  // no_permission_error(delegator == ctx.sender());
  charge_fee(dh, dapp_key, key_tuple, value_tuple);

  let dapp_key = type_info::get_type_name_string<DappKey>();
  dapp_service::set_record_internal(dh, dapp_key, table_id, key_tuple, value_tuple);
}

#[test_only]
public fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
  dapp_service::create_dapp_hub_for_testing(ctx)
}

#[test_only]
public fun destroy(dh: DappHub) {
  dapp_service::destroy(dh)
}