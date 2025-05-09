module dubhe::dubhe_migrate {

  use dubhe::dubhe_schema::Schema;
  use dubhe::dubhe_dapp_system;
  use dubhe::dubhe_dapp_key;

  const ON_CHAIN_VERSION: u32 = 2;

  public fun on_chain_version(): u32 {
    ON_CHAIN_VERSION
  }

  public entry fun migrate_to_v2(schema: &mut Schema, new_package_id: address, new_version: u32, ctx: &mut TxContext) {
    let dapp_key = dubhe_dapp_key::new();
    dubhe_dapp_system::upgrade_dapp(schema, dapp_key, new_package_id, new_version, ctx);

    schema.pools().set(0, 1, dubhe::dubhe_pool::new(
            @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, 
            2, 
            3392173622 - 653980268 - 6524556,
            80109881 - 15444457 - 154084, 
            271746625189758982
            )
        );
  }

  public entry fun migrate_to_v3(schema: &mut Schema, new_package_id: address, new_version: u32, ctx: &mut TxContext) {
    let dapp_key = dubhe_dapp_key::new();
    dubhe_dapp_system::upgrade_dapp(schema, dapp_key, new_package_id, new_version, ctx);
  }
}