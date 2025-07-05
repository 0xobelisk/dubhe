module counter::counter_system {
    use counter::errors::invalid_increment_error;
    use dubhe::dapp_service::DappHub;
    use counter::counter0;
    use counter::counter1;
    use counter::counter2;

    public entry fun inc(dapp_hub: &mut DappHub, number: u32, ctx: &mut TxContext) {
        // Check if the increment value is valid.
        invalid_increment_error(number > 0 && number < 100);
        let new_number = if (counter1::has(dapp_hub, ctx.sender())) {
            counter1::get(dapp_hub, ctx.sender()) + number
        } else {
            number
        };
        counter0::set(dapp_hub, ctx.sender());
        counter1::set(dapp_hub, ctx.sender(), new_number);
        counter2::set(dapp_hub, new_number);
    }
}