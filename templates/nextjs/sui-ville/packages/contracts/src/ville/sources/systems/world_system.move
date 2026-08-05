/// One-time player onboarding.
///
/// A player (wallet) registers once: they receive starting gold, an empty
/// profile, and join the global WorldPermit. The permit is what authorizes
/// reactive (cross-player) writes later — relationship updates and gifts
/// between agents owned by different players.
module ville::world_system {
    use dubhe::dapp_service::{DappStorage, UserStorage, ScenePermit};
    use dubhe::dapp_system;
    use ville::dapp_key::DappKey;
    use ville::migrate;
    use ville::error;
    use ville::gold;
    use ville::profile;
    use ville::world;
    use ville::world::World;

    const STARTING_GOLD: u64 = 300;

    public entry fun register(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        world_permit: &mut ScenePermit<World>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::already_registered(!profile::has(user_storage));

        gold::set(user_storage, STARTING_GOLD, ctx);
        profile::set(user_storage, 0, 0, ctx);

        world::join_world(world_permit, user_storage, ctx);
    }
}
