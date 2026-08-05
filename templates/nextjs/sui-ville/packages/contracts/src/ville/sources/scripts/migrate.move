module ville::migrate {
    const ON_CHAIN_VERSION: u32 = 1;

    public fun on_chain_version(): u32 {
        ON_CHAIN_VERSION
    }

    public entry fun migrate_to_v2(
        dapp_hub: &mut dubhe::dapp_service::DappHub,
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        new_package_id: address,
        ctx: &mut TxContext
    ) {
        let new_version = ville::migrate::on_chain_version();
        dubhe::dapp_system::upgrade_dapp<ville::dapp_key::DappKey>(
            dapp_hub, dapp_storage, new_package_id, new_version, ctx
        );
        ville::genesis::migrate(dapp_hub, dapp_storage, ctx);
    }
}
