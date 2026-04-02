module counter::counter_system {
    use dubhe::dapp_service::UserStorage;
    use counter::value;
    use counter::errors::invalid_increment_error;

    public entry fun inc(user_storage: &mut UserStorage, number: u32, ctx: &mut TxContext) {
        invalid_increment_error(number > 0);
        let val = if (value::has(user_storage)) { value::get(user_storage) } else { 0u32 };
        value::set(user_storage, val + number, ctx);
    }
}
