module constantinople::dapp_system {

  use std::ascii::String;

  use std::ascii;

  use dubhe::type_info;

  use sui::clock::Clock;

  use constantinople::dapp_schema;

  use constantinople::dapp_metadata;

  use constantinople::dapp_schema::Dapp;

  public struct DappKey has drop {}

  public(package) fun new(): DappKey {
    DappKey {  }
  }

  public(package) fun create(name: String, description: String, clock: &Clock, ctx: &mut TxContext): Dapp {
    let mut dapp = dapp_schema::create(ctx);
    assert!(!dapp.borrow_metadata().contains(), 0);
    dapp.borrow_mut_metadata().set(
            dapp_metadata::new(
                name,
                description,
                ascii::string(b""),
                ascii::string(b""),
                clock.timestamp_ms(),
                vector[]
            )
        );
    let package_id = type_info::current_package_id<DappKey>();
    dapp.borrow_mut_package_id().set(package_id);
    dapp.borrow_mut_admin().set(ctx.sender());
    dapp.borrow_mut_version().set(1);
    dapp.borrow_mut_safe_mode().set(false);
    dapp.borrow_mut_schemas().set(vector[]);
    dapp
  }

  public entry fun set_metadata(
    dapp: &mut Dapp,
    name: String,
    description: String,
    icon_url: String,
    website_url: String,
    partners: vector<String>,
    ctx: &TxContext,
  ) {
    assert!(dapp.borrow_admin().contains(), 0);
    assert!(dapp.borrow_admin().get() == ctx.sender(), 0);
    let created_at = dapp.borrow_mut_metadata().take().get_created_at();
    dapp.borrow_mut_metadata().set(
            dapp_metadata::new(
                name,
                description,
                icon_url,
                website_url,
                created_at,
                partners
            )
        );
  }

  public entry fun transfer_ownership(dapp: &mut Dapp, new_admin: address, ctx: &mut TxContext) {
    assert!(dapp.borrow_admin().contains(), 0);
    assert!(dapp.borrow_admin().get() == ctx.sender(), 0);
    dapp.borrow_mut_admin().set(new_admin);
  }

  public entry fun set_safe_mode(dapp: &mut Dapp, safe_mode: bool, ctx: &TxContext) {
    assert!(dapp.borrow_admin().contains(), 0);
    assert!(dapp.borrow_admin().get() == ctx.sender(), 0);
    dapp.borrow_mut_safe_mode().set(safe_mode);
  }

  public fun ensure_no_safe_mode(dapp: &Dapp) {
    assert!(!dapp.borrow_safe_mode().get(), 0);
  }

  public fun ensure_has_authority(dapp: &Dapp, ctx: &TxContext) {
    assert!(dapp.borrow_admin().get() == ctx.sender(), 0);
  }

  public fun ensure_has_schema<Schema: key + store>(dapp: &Dapp, schema: &Schema) {
    let schema_id = object::id_address(schema);
    assert!(dapp.borrow_schemas().get().contains(&schema_id), 0);
  }
}
