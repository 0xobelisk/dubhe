module dubhe::dubhe_dapp_system;
use std::ascii::String;
use dubhe::type_info;
use dubhe::dubhe_schema::Schema;
use dubhe::dubhe_dapp_stats;
use dubhe::dubhe_dapp_metadata;
use dubhe::dubhe_dapp_metadata::DappMetadata;
use dubhe::dubhe_errors::{not_dapp_pausable_error, not_dapp_admin_error, not_dapp_latest_version_error, dapp_already_exists_error};

public fun create_dapp<DappKey: copy + drop>(
  schema: &mut Schema,
  _: DappKey,
  dapp_metadata: DappMetadata,
  ctx: &TxContext,
) {
  let package_id = type_info::get_package_id<DappKey>();
  dapp_already_exists_error(schema.dapp_metadata().try_get(package_id) == option::none());
  schema.dapp_admin().set(package_id, ctx.sender());
  schema.dapp_version().set(package_id, 1);
  schema.dapp_metadata().set(package_id, dapp_metadata);
  schema.dapp_package_id().set(package_id, package_id);
  schema.dapp_pausable().set(package_id, false);
  schema.dapp_stats().set(package_id, dubhe_dapp_stats::new(100000, 100000, 0, 0));
}

  public fun upgrade_dapp<DappKey: copy + drop>(schema: &mut Schema, dapp_key: DappKey, new_package_id: address, new_version: u32, ctx: &mut TxContext) {
    ensure_dapp_admin_sign(schema, dapp_key, ctx);
    let package_id = type_info::get_package_id<DappKey>();
    schema.dapp_version().set(package_id, new_version);
    schema.dapp_package_id().set(package_id, new_package_id);
}

public entry fun set_metadata(
  schema: &mut Schema,
  package_id: address,
  name: String,
  description: String,
  cover_url: vector<String>,
  website_url: String,
  partners: vector<String>,
  ctx: &TxContext,
) {
  let admin = schema.dapp_admin().try_get(package_id);
  not_dapp_admin_error(admin == option::some(ctx.sender()));
  let created_at = schema.dapp_metadata().get(package_id).get_created_at();
  schema.dapp_metadata().set(package_id, dubhe_dapp_metadata::new(
              name,
              description,
              cover_url,
              website_url,
              created_at,
              partners
          )
  );
}

public entry fun transfer_ownership(schema: &mut Schema,package_id: address, new_admin: address, ctx: &mut TxContext) {
  let admin = schema.dapp_admin().try_get(package_id);
  not_dapp_admin_error(admin == option::some(ctx.sender()));
  schema.dapp_admin().set(package_id, new_admin);
}

public entry fun set_pausable(schema: &mut Schema, package_id: address, pausable: bool, ctx: &TxContext) {
  let admin = schema.dapp_admin().try_get(package_id);
  not_dapp_admin_error(admin == option::some(ctx.sender()));
  schema.dapp_pausable().set(package_id, pausable);
}

public fun get_dapp_admin<DappKey: copy + drop>(schema: &mut Schema, _: DappKey): address {
  let package_id = type_info::get_package_id<DappKey>();
  schema.dapp_admin()[package_id]
}

public fun ensure_dapp_not_pausable<DappKey: copy + drop>(schema: &mut Schema, _: DappKey) {
  let package_id = type_info::get_package_id<DappKey>();
  let pausable = schema.dapp_pausable().try_get(package_id);
  not_dapp_pausable_error(pausable == option::some(false));
}

public fun ensure_dapp_admin_sign<DappKey: copy + drop>(schema: &mut Schema, _: DappKey, ctx: &TxContext) {
  let package_id = type_info::get_package_id<DappKey>();
  let admin = schema.dapp_admin().try_get(package_id);
  not_dapp_admin_error(admin == option::some(ctx.sender()));
}

public fun ensure_dapp_latest_version<DappKey: copy + drop>(schema: &mut Schema, _: DappKey, on_chain_version: u32) {
  let package_id = type_info::get_package_id<DappKey>();
  let current_version = schema.dapp_version().get(package_id);
  not_dapp_latest_version_error(current_version == on_chain_version);
}
