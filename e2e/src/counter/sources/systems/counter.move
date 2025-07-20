module counter::counter_system {
    use dubhe::dapp_service::DappHub;
    use counter::value;

    public entry fun inc(dh: &mut DappHub) {
        let value = value::get(dh);
        value::set(dh, value + 1);
    }
}