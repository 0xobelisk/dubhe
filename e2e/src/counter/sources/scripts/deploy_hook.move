module counter::deploy_hook {
    use dubhe::dapp_service::DappStorage;

    public(package) fun run(_dapp_storage: &mut DappStorage, _ctx: &mut TxContext) {
        // No global state to initialize for a UserStorage-based counter.
        // Each user initializes their own storage via dapp_system::init_user_storage.
    }
}
