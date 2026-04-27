module counter::counter_system {
    use dubhe::dapp_service::UserStorage;
    use counter::value;

    public entry fun inc(user_storage: &mut UserStorage, ctx: &mut TxContext) {
        let curr = if (value::has(user_storage)) {
            value::get(user_storage)
        } else {
            0u32
        };
        value::set(user_storage, curr + 1, ctx);
    }

    /// Guard-only entry function used for testing ensure_latest_version and
    /// ensure_not_paused enforcement.  It performs no writes and requires no
    /// UserStorage, so it is cheap to call from TypeScript PTBs.
    public entry fun check_version_guard(
        dapp_storage: &dubhe::dapp_service::DappStorage,
        _ctx: &mut TxContext
    ) {
        dubhe::dapp_system::ensure_latest_version<counter::dapp_key::DappKey>(
            dapp_storage,
            counter::migrate::on_chain_version()
        );
        dubhe::dapp_system::ensure_not_paused<counter::dapp_key::DappKey>(dapp_storage);
    }
}
