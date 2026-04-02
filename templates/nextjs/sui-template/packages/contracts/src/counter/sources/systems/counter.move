module counter::counter_system {
    use dubhe::dapp_service::UserStorage;
    use counter::counter1;
    use counter::errors::invalid_increment_error;

    public entry fun inc(user_storage: &mut UserStorage, number: u32, ctx: &mut TxContext) {
        invalid_increment_error(number > 0);
        let val = if (counter1::has(user_storage)) { counter1::get(user_storage) } else { 0u32 };
        counter1::set(user_storage, val + number, ctx);
    }
}
