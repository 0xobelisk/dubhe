module counter::counter_system {
    use dubhe::dapp_service::DappHub;
    use dubhe::address_system;
    // use counter::counter0;
    use counter::counter1;
    use counter::counter2;

    public entry fun inc(dapp_hub: &mut DappHub, number: u32, ctx: &mut TxContext) {
        let sender = address_system::ensure_origin(ctx);

        if (counter1::has(dapp_hub, sender)) {
            let new_number = counter1::get(dapp_hub, sender) + number;
            counter1::set(dapp_hub, sender, new_number, ctx);
        } else {
            counter1::set(dapp_hub, sender, number, ctx);
        };

        let data_key = (number as u64);
        if (counter2::has(dapp_hub, sender, data_key)) {
            let new_number = counter2::get(dapp_hub, sender, data_key) + number;
            counter2::set(dapp_hub, sender, data_key, new_number, ctx);
        } else {
            counter2::set(dapp_hub, sender, data_key, number, ctx);
        };
    }
}