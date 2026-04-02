module counter::counter_system {
    use dubhe::dapp_service::{DappHub, UserStorage};
    use counter::value;

    public entry fun inc(dapp_hub: &DappHub, user_storage: &mut UserStorage, ctx: &mut TxContext) {
        let curr = if (value::has(user_storage)) {
            value::get(user_storage)
        } else {
            0u32
        };
        value::set(dapp_hub, user_storage, curr + 1, ctx);
    }
}
