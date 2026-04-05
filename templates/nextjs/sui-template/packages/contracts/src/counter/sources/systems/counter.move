module counter::counter_system {
    use dubhe::dapp_service::UserStorage;
    use counter::counter1;

    public entry fun inc(user_storage: &mut UserStorage, number: u32, ctx: &mut TxContext) {
        let curr = if (counter1::has(user_storage)) {
            counter1::get(user_storage)
        } else {
            0u32
        };
        counter1::set(user_storage, curr + number, ctx);
    }
}
