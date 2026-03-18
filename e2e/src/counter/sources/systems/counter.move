module counter::counter_system {
    use dubhe::dapp_service::DappHub;
    use counter::value;

    public entry fun inc(dh: &mut DappHub, ctx: &mut TxContext) {
        let val = value::get(dh);
        value::set(dh, val + 1, ctx);
    }
}
