module harvest::season_system {
    use sui::clock::Clock;
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_service;
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::error;
    use harvest::season_config;
    use harvest::season_stats;
    use harvest::trophy;
    use harvest::profile;

    #[error]
    const ENotAdmin: vector<u8> = b"Caller is not the DApp admin";

    /// Admin: start a new season with a bonus crop type.
    public entry fun start_season(
        dapp_storage: &mut DappStorage,
        bonus_crop:   u8,
        duration_ms:  u64,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        assert!(ctx.sender() == dapp_service::dapp_admin(dapp_storage), ENotAdmin);

        let now = sui::clock::timestamp_ms(clock);
        let current_id = season_config::get_season_id(dapp_storage);
        season_config::set(dapp_storage, current_id + 1, now + duration_ms, bonus_crop);
    }

    /// Admin: end the current season early.
    public entry fun end_season(
        dapp_storage: &mut DappStorage,
        ctx:          &TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        assert!(ctx.sender() == dapp_service::dapp_admin(dapp_storage), ENotAdmin);

        let season_id  = season_config::get_season_id(dapp_storage);
        let bonus_crop = season_config::get_bonus_crop(dapp_storage);
        season_config::set(dapp_storage, season_id, 0, bonus_crop);
    }

    /// Admin: mint a season trophy for a top-ranked player.
    public entry fun award_trophy(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        rank:         u32,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        assert!(ctx.sender() == dapp_service::dapp_admin(dapp_storage), ENotAdmin);
        error::not_registered(profile::has(user_storage));

        let season_id = season_config::get_season_id(dapp_storage);
        let earned = if (season_stats::has(user_storage)) {
            season_stats::get(user_storage)
        } else {
            0
        };

        trophy::set(user_storage, season_id, rank, earned, ctx);

        if (season_stats::has(user_storage)) {
            season_stats::set(user_storage, 0, ctx);
        };
    }
}
