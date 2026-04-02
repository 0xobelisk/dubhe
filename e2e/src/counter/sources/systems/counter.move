module counter::counter_system {
    use dubhe::dapp_service::DappStorage;
    use counter::value;

    public entry fun inc(dapp_storage: &mut DappStorage, ctx: &mut TxContext) {
        let val = value::get(dapp_storage);
        value::set(dapp_storage, val + 1, ctx);
    }
}
