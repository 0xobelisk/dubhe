module harvest::deploy_hook {
    use dubhe::dapp_service::DappStorage;
    use harvest::shop_config;
    use harvest::season_config;
    use harvest::pet_config;
    use harvest::world;
    use harvest::world_permit_id;

    public(package) fun run(dapp_storage: &mut DappStorage, ctx: &mut TxContext) {
        // Seed prices (wheat=5, corn=20, carrot=60, pumpkin=40, extra_plot=200)
        shop_config::set(dapp_storage, 5, 20, 60, 40, 200);
        // season_id=0, end_ms=0 (inactive), bonus_crop=0 (None)
        season_config::set(dapp_storage, 0, 0, 0);

        // Pet config:
        //   common_egg=80g    rare_egg=300g   seasonal_egg=500g
        //   common_hatch=5min  rare_hatch=20min  seasonal_hatch=10min
        //   slot2=200g  slot3=500g
        pet_config::set(
            dapp_storage,
            80,                    // common_egg_price
            300,                   // rare_egg_price
            500,                   // seasonal_egg_price
            5  * 60 * 1000,        // common_hatch_ms   (5 minutes)
            20 * 60 * 1000,        // rare_hatch_ms     (20 minutes)
            10 * 60 * 1000,        // seasonal_hatch_ms (10 minutes)
            200,                   // slot2_price
            500,                   // slot3_price
        );

        // Create the global World permit (unlimited participants, no expiry),
        // save its ID so the frontend can locate it, then share it.
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
    }
}

