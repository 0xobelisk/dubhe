module ville::deploy_hook {
    use dubhe::dapp_service::DappStorage;
    use ville::town_config;
    use ville::town_event;
    use ville::election_state;
    use ville::world;
    use ville::world_permit_id;

    /// One town day (demo timescale: 10 minutes).
    const DAY_LENGTH_MS: u64 = 600_000;

    public(package) fun run(dapp_storage: &mut DappStorage, ctx: &mut TxContext) {
        // day=1, day starts at genesis (0 lets the first tick fire immediately),
        // no festival, no mayor, population 0.
        town_config::set(dapp_storage, 1, 0, DAY_LENGTH_MS, 0, @0x0, @0x0, 0);
        // No election opened yet.
        election_state::set(dapp_storage, 0, 0, @0x0, @0x0, 0, 0);
        // No town event on day one.
        town_event::set(dapp_storage, 0, 0, 0, 0);

        // Create the global World permit (unlimited participants, no expiry),
        // save its ID so clients can locate it, then share it.
        let permit = world::new_world(
            dapp_storage,
            vector::empty(),
            std::option::none(),
            std::option::none(),
            ctx,
        );
        let permit_addr = sui::object::id_address(&permit);
        world_permit_id::set(dapp_storage, permit_addr);
        world::share_world(permit);

        // Town buildings are created and configured post-deploy by the seed
        // script (town_system::create_building + configure_building, admin
        // only) so their shared ObjectIDs can be captured off-chain.
    }
}
