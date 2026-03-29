module counter::counter_system {
    use dubhe::dapp_service::DappHub;
    use counter::counter1;
    use dubhe::address_system;
    use counter::dapp_key::DappKey;

    public entry fun inc(dapp_hub: &mut DappHub, number: u32, ctx: &mut TxContext) {
        let sender = address_system::ensure_origin<DappKey>(dapp_hub, ctx);
        if (counter1::has(dapp_hub, sender)) {
            let new_number = counter1::get(dapp_hub, sender) + number;
            counter1::set(dapp_hub, sender, new_number, ctx);
        } else {
            counter1::set(dapp_hub, sender, number, ctx);
        }
    }
}
