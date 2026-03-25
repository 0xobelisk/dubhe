module dubhe::dapp_system;
use dubhe::dapp_service::DappHub;
use dubhe::dapp_service;
use dubhe::type_info;
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
  dapp_not_been_delegated_error,
  dapp_already_delegated_error,
  dapp_already_initialized_error,
};
use dubhe::dapp_fee_state;
use dubhe::dapp_fee_config;
use std::ascii::String;
use std::ascii::string;
use std::type_name;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::transfer;

/// Set a record
public fun set_record<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  key: vector<vector<u8>>,
  value: vector<vector<u8>>,
  resource_address: String,
  offchain: bool,
  ctx: &mut TxContext
) {
  dapp_service::set_record<DappKey>(
    dh, 
    dapp_key,  
    key, 
    value, 
    resource_address,
    offchain,
    ctx
  );
  let dapp_key = type_info::get_type_name_string<DappKey>();
//   let (_, enabled) = dapp_proxy::get(dh, dapp_key);
  // dapp_already_delegated_error(!enabled);
  charge_fee(dh, dapp_key, key, value, 1, ctx);
}

/// Set a field
public fun set_field<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  resource_address: String,
  key: vector<vector<u8>>,
  field_index: u8,
  value: vector<u8>,
  ctx: &mut TxContext
) {
  dapp_service::set_field(
    dh,
    dapp_key,
    resource_address,
    key,
    field_index,
    value,
    ctx,
  );
  let dapp_key = type_info::get_type_name_string<DappKey>();
//   let (_, enabled) = dapp_proxy::get(dh, dapp_key);
  // dapp_already_delegated_error(!enabled);
  charge_fee(dh, dapp_key, key, vector[value], 1, ctx);
}

public fun delete_record<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  key: vector<vector<u8>>,
  resource_address: String,
) {
  dapp_service::delete_record(
    dh, 
    dapp_key, 
    key, 
    resource_address, 
  );
  let dapp_key = type_info::get_type_name_string<DappKey>();
}

/// Get a record
public fun get_record<DappKey: copy + drop>(
  dh: &DappHub,
  resource_address: String,
  key: vector<vector<u8>>
): vector<u8> {
  dapp_service::get_record<DappKey>(dh, resource_address, key)
}

/// Get a field
public fun get_field<DappKey: copy + drop>(
  dh: &DappHub,
  resource_address: String,
  key: vector<vector<u8>>,
  field_index: u8
): vector<u8> {
  dapp_service::get_field<DappKey>(dh, resource_address, key, field_index)
}


public fun has_record<DappKey: copy + drop>(
  dh: &DappHub,
  resource_address: String,
  key: vector<vector<u8>>
): bool {
  dapp_service::has_record<DappKey>(dh, resource_address, key)
}

public fun ensure_has_record<DappKey: copy + drop>(
  dh: &DappHub,
  resource_address: String,
  key: vector<vector<u8>>
) {
  dapp_service::ensure_has_record<DappKey>(dh, resource_address, key)
}

public fun ensure_has_not_record<DappKey: copy + drop>(
  dh: &DappHub,
  resource_address: String,
  key: vector<vector<u8>>
) {
  dapp_service::ensure_has_not_record<DappKey>(dh, resource_address, key)
}

// public fun get_mut_dapp_objects<DappKey: copy + drop>(
//     dh: &mut DappHub,
//     dapp_key: DappKey,
// ): &mut Bag {
//     dapp_service::get_mut_dapp_objects(dh, dapp_key)
// }

public fun create_dapp<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  name: String,
  description: String,
  clock: &Clock,
  ctx: &mut TxContext
) { 
  let dubhe_dapp_key = dapp_key::new();
  if(!dapp_key::eq(&dapp_key, &dubhe_dapp_key)) {
    // Idempotency guard: abort if this DApp has already been registered.
    let dapp_key_str = type_info::get_type_name_string<DappKey>();
    dapp_already_initialized_error(!dapp_metadata::has(dh, dapp_key_str));
    initialize_metadata<DappKey>(dh, name, description, clock, ctx);
    initialize_fee_state<DappKey>(dh, ctx);
  };
  // The Dubhe framework's own metadata (and admin address) is initialised
  // separately by deploy_hook::run, which is the single authoritative
  // bootstrap entry-point for all framework-level state.
}

public(package) fun initialize_metadata<DappKey: copy + drop>(
  dh: &mut DappHub,
  name: String,
  description: String,
  clock: &Clock,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  let created_at = clock::timestamp_ms(clock);
  let admin = ctx.sender();
  let version = 1;
  let pausable = false;
  let package_ids = vector[type_info::get_package_id<DappKey>()];
  let cover_url = vector::empty();
  let website_url = string(b"");
  let partners = vector::empty();
  dapp_metadata::set(
    dh, 
    dapp_key, 
    name, 
    description, 
    website_url, 
    cover_url, 
    partners, 
    package_ids, 
    created_at, 
    admin, 
    version, 
    pausable,
    ctx
  );
}

public(package) fun initialize_fee_state<DappKey: copy + drop>(
  dh: &mut DappHub,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  let (free_credit, base_fee, byte_fee, _) = dapp_fee_config::get(dh);
  dapp_fee_state::set(
    dh, 
    dapp_key, 
    base_fee,
    byte_fee,
    free_credit,
    0,
    0,
    0,
    0,
    ctx
  );
}

public(package) fun initialize_dapp_proxy<DappKey: copy + drop>(
  dh: &mut DappHub,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
//   dapp_proxy::set(dh, dapp_key, @0x0, false);
}

public(package) fun upgrade_dapp<DappKey: copy + drop>(
    dh: &mut DappHub,
    new_package_id: address,
    new_version: u32,
    ctx: &mut TxContext
) {
    let dapp_key = type_info::get_type_name_string<DappKey>();
    dapp_metadata::ensure_has(dh, dapp_key);
    no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
    let mut package_ids = dapp_metadata::get_package_ids(dh, dapp_key);
    invalid_package_id_error(!package_ids.contains(&new_package_id));
    package_ids.push_back(new_package_id);
    invalid_version_error(new_version > dapp_metadata::get_version(dh, dapp_key));
    dapp_metadata::set_package_ids(dh, dapp_key, package_ids, ctx);
    dapp_metadata::set_version(dh, dapp_key, new_version, ctx);
} 

public fun set_pausable(
    dh: &mut DappHub,
    dapp_key: String,
    pausable: bool,
    ctx: &mut TxContext
) {
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  dapp_metadata::set_pausable(dh, dapp_key, pausable, ctx);
}

public fun transfer_ownership(
    dh: &mut DappHub,
    dapp_key: String,
    new_admin: address,
    ctx: &mut TxContext
) {
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
  dapp_metadata::set_admin(dh, dapp_key, new_admin, ctx);
}

/// Recharge a DApp's storage credit by paying SUI.
///
/// Only the DApp admin can call this function.
/// The `payment` Coin<SUI> is transferred to the Dubhe framework admin
/// (the address that deployed the framework) as the protocol fee recipient.
/// Credits are added at a 1:1 rate with MIST: 1 MIST = 1 credit unit.
/// Any account may call this — there is no admin restriction. Sponsors,
/// community members, or the DApp admin itself can all top up a DApp's credits.
public fun recharge_credit<DappKey: copy + drop>(
    dh: &mut DappHub,
    _dapp_key: DappKey,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
  let dapp_key_str = type_info::get_type_name_string<DappKey>();
  dapp_metadata::ensure_has(dh, dapp_key_str);
  let mist_amount = coin::value(&payment) as u256;
  // Transfer payment to the Dubhe framework admin (fee recipient).
  let fee_recipient = dapp_fee_config::get_admin(dh);
  transfer::public_transfer(payment, fee_recipient);
  // Update credit ledger: 1 MIST = 1 credit unit.
  let mut fee_state = dapp_fee_state::get_struct(dh, dapp_key_str);
  let new_total = fee_state.total_recharged() + mist_amount;
  fee_state.update_total_recharged(new_total);
  dapp_fee_state::set_struct(dh, dapp_key_str, fee_state, ctx);
}

/// Framework admin: grant or adjust the free credit quota for any registered DApp.
///
/// Set `amount` to 0 to revoke all free credits (e.g., after a trial period ends).
/// Set `amount` to a non-zero value to grant promotional credits for partnerships.
/// Only the Dubhe framework admin (the genesis deployer address) can call this.
public fun set_dapp_free_credit(
    dh: &mut DappHub,
    target_dapp_key: String,
    amount: u256,
    ctx: &mut TxContext
) {
  dapp_fee_config::ensure_has(dh);
  no_permission_error(dapp_fee_config::get_admin(dh) == ctx.sender());
  dapp_metadata::ensure_has(dh, target_dapp_key);
  let mut fee_state = dapp_fee_state::get_struct(dh, target_dapp_key);
  fee_state.update_free_credit(amount);
  dapp_fee_state::set_struct(dh, target_dapp_key, fee_state, ctx);
}

public fun set_metadata(
    dh: &mut DappHub,
    dapp_key: String,
    name: String,
    description: String,
    website_url: String,
    cover_url: vector<String>,
    partners: vector<String>,
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
  dapp_metadata::set_struct(dh, dapp_key, dapp_metadata, ctx);
}

public(package) fun calculate_bytes_size_and_fee(dh: &DappHub, dapp_key: String, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>, count: u256): (u256, u256) {
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

    // total_bytes_size_u256: total bytes written across all records (for stats)
    let total_bytes_size_u256 = (total_bytes_size as u256) * count;
    // Linear fee: (bytes_per_record * byte_fee + base_fee) * count
    // Previously this was quadratic: (bytes_per_record * count * byte_fee + base_fee) * count
    let fee_per_record = (total_bytes_size as u256) * fee_state.byte_fee() + fee_state.base_fee();
    let total_fee = fee_per_record * count;

    (total_bytes_size_u256, total_fee)
}

public(package) fun charge_fee(dh: &mut DappHub, dapp_key: String, key: vector<vector<u8>>, value: vector<vector<u8>>, count: u256, ctx: &mut TxContext) {
   let (bytes_size, fee) = calculate_bytes_size_and_fee(dh, dapp_key, key, value, count);
   let mut fee_state = dapp_fee_state::get_struct(dh, dapp_key);
   let total_bytes_size = fee_state.total_bytes_size();
   let total_paid = fee_state.total_paid();
   let total_recharged = fee_state.total_recharged();
   let free_credit = fee_state.free_credit();
   let total_set_count = fee_state.total_set_count();
   if (free_credit >= fee) {
     // free_credit alone covers the fee.
     fee_state.update_free_credit(free_credit - fee);
   } else {
     // Consume all remaining free_credit first, then deduct the rest from total_recharged.
     let remaining = fee - free_credit;
     insufficient_credit_error(total_recharged >= remaining);
     fee_state.update_free_credit(0);
     fee_state.update_total_recharged(total_recharged - remaining);
   };
   fee_state.update_total_bytes_size(total_bytes_size + bytes_size);
   fee_state.update_total_paid(total_paid + fee);
   fee_state.update_total_set_count(total_set_count + count);
   dapp_fee_state::set_struct(dh, dapp_key, fee_state, ctx);
}

public fun ensure_dapp_admin<DappKey: copy + drop>(
    dh: &DappHub,
    admin: address
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == admin);
}

public fun ensure_latest_version<DappKey: copy + drop>(
    dh: &DappHub,
    version: u32
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  dapp_metadata::ensure_has(dh, dapp_key);
  not_latest_version_error(dapp_metadata::get_version(dh, dapp_key) == version);
}

public fun ensure_not_pausable<DappKey: copy + drop>(
    dh: &DappHub
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  dapp_metadata::ensure_has(dh, dapp_key);
  dapp_already_paused_error(!dapp_metadata::get_pausable(dh, dapp_key));
}

public fun delegate<DappKey: copy + drop>(
  dh: &mut DappHub,
  delegator: address,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
//   dapp_proxy::set(dh, dapp_key, delegator, true);
}

public fun undelegate<DappKey: copy + drop>(
  dh: &mut DappHub,
  ctx: &mut TxContext
) {
  let dapp_key = type_info::get_type_name_string<DappKey>();
  dapp_metadata::ensure_has(dh, dapp_key);
  no_permission_error(dapp_metadata::get_admin(dh, dapp_key) == ctx.sender());
//   dapp_proxy::set(dh, dapp_key, @0x0, false);
}

public fun is_delegated<DappKey: copy + drop>(
  dh: &DappHub
): bool {
  let dapp_key = type_info::get_type_name_string<DappKey>();
//   dapp_proxy::get_enabled(dh, dapp_key)
  false
}

/// set_storage is not yet implemented.
/// Use set_record for on-chain writes.  This function aborts immediately to
/// prevent silent data-loss from callers that assume it writes to storage.
const E_SET_STORAGE_NOT_IMPLEMENTED: u64 = 100;

public fun set_storage<DappKey: copy + drop>(
  _dh: &mut DappHub,
  _table_id: String,
  _key_tuple: vector<vector<u8>>,
  _value_tuple: vector<vector<u8>>,
  _count: u256,
  _ctx: &mut TxContext
) {
    abort E_SET_STORAGE_NOT_IMPLEMENTED
}

public fun dapp_key<DappKey: copy + drop>(): String {
  type_name::get<DappKey>().into_string()
}

#[test_only]
public fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
  dapp_service::create_dapp_hub_for_testing(ctx)
}

#[test_only]
public fun destroy(dh: DappHub) {
  dapp_service::destroy(dh)
}