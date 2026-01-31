module counter::counter_system {
    use counter::errors::invalid_increment_error;
    use dubhe::dapp_service::DappHub;
    use counter::value;
    use dubhe::address_system;

    public entry fun inc(dapp_hub: &mut DappHub, number: u32, ctx: &mut TxContext) {
        let sender = address_system::ensure_origin(ctx);
        if (value::has(dapp_hub, sender)) {
            let new_number = value::get(dapp_hub, sender) + number;
            value::set(dapp_hub, sender, new_number, ctx);
        } else {
            value::set(dapp_hub, sender, number, ctx);
        }
    }
}