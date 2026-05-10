module harvest::world_system {
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::error;
    use harvest::gold;
    use harvest::profile;
    use harvest::crow_charges;
    use harvest::world;
    use harvest::world::World;

    const STARTING_GOLD:   u64 = 100;
    const STARTING_PLOTS:  u8  = 3;
    const MAX_CROW_CHARGES: u8 = 3;

    /// One-time player registration.  Creates the player's initial state and
    /// joins the global WorldPermit so they can be targeted by reactive writes.
    public entry fun register(
        dapp_storage:  &DappStorage,
        user_storage:  &mut UserStorage,
        world_permit:  &mut dubhe::dapp_service::ScenePermit<World>,
        ctx:           &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::already_registered(!profile::has(user_storage));

        gold::set(user_storage, STARTING_GOLD, ctx);
        profile::set(user_storage, 0, STARTING_PLOTS, ctx);
        crow_charges::set(user_storage, MAX_CROW_CHARGES, 0, ctx);

        world::join_world(world_permit, ctx);
    }
}
