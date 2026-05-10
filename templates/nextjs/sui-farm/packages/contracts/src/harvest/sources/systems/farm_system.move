module harvest::farm_system {
    use sui::clock::Clock;
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::error;
    use harvest::wheat_seed;
    use harvest::corn_seed;
    use harvest::carrot_seed;
    use harvest::pumpkin_seed;
    use harvest::wheat;
    use harvest::corn;
    use harvest::carrot;
    use harvest::pumpkin;
    use harvest::farm_plot;
    use harvest::profile;
    use harvest::season_config;
    use harvest::season_stats;
    use harvest::crow_damage;

    const CROP_NONE:    u8 = 0;
    const CROP_WHEAT:   u8 = 1;
    const CROP_CORN:    u8 = 2;
    const CROP_CARROT:  u8 = 3;
    const CROP_PUMPKIN: u8 = 4;

    // Growth durations
    const WHEAT_MS:   u64 = 1 * 60 * 1000;
    const CORN_MS:    u64 = 2 * 60 * 1000;
    const CARROT_MS:  u64 = 4 * 60 * 1000;
    const PUMPKIN_MS: u64 = 5 * 60 * 1000;

    // Harvest yield per seed planted (cheap crops = more yield, expensive = less)
    const WHEAT_YIELD:   u64 = 6;   // cheap & fast  → 6x
    const CORN_YIELD:    u64 = 4;   // medium        → 4x
    const CARROT_YIELD:  u64 = 3;   // expensive     → 3x
    const PUMPKIN_YIELD: u64 = 3;   // medium-exp    → 3x

    const SEASON_BONUS_PCT: u64 = 200;

    /// Plant seeds on farm plot `plot_id`.
    /// Consumes exactly 1 seed from the dedicated seed inventory.
    /// The stored count equals the crop's yield multiplier,
    /// so harvesting returns yield_per_seed crops.
    public entry fun plant(
        dapp_storage:  &DappStorage,
        user_storage:  &mut UserStorage,
        plot_id:       u8,
        crop_type:     u8,
        clock:         &Clock,
        ctx:           &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::invalid_crop_type(crop_type >= CROP_WHEAT && crop_type <= CROP_PUMPKIN);

        let plots_owned = profile::get_plots_owned(user_storage);
        error::plot_not_found(plot_id < plots_owned);

        if (farm_plot::has(user_storage, plot_id)) {
            let existing_crop = farm_plot::get_crop_type(user_storage, plot_id);
            error::plot_already_planted(existing_crop == CROP_NONE);
        };

        // Check seed balance before deducting
        error::insufficient_seeds(seed_balance(user_storage, crop_type) >= 1);

        // Deduct exactly 1 seed from the seed-specific resource
        deduct_seeds(user_storage, crop_type, 1, ctx);

        let now = sui::clock::timestamp_ms(clock);
        let duration = crop_duration(crop_type);
        // Store the yield amount — harvest will return this many crops
        let harvest_count = crop_yield(crop_type);
        farm_plot::set(user_storage, plot_id, crop_type, harvest_count, now, now + duration, ctx);
    }

    /// Harvest a ready crop from farm plot `plot_id`.
    /// Yields crops (not seeds) into the crop-specific resource.
    public entry fun harvest(
        dapp_storage:  &DappStorage,
        user_storage:  &mut UserStorage,
        plot_id:       u8,
        clock:         &Clock,
        ctx:           &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::plot_not_found(farm_plot::has(user_storage, plot_id));

        let crop_type = farm_plot::get_crop_type(user_storage, plot_id);
        error::plot_is_empty(crop_type != CROP_NONE);

        let now = sui::clock::timestamp_ms(clock);
        let harvest_at = farm_plot::get_harvest_at(user_storage, plot_id);
        error::plot_not_ready(now >= harvest_at);

        let base_count = farm_plot::get_count(user_storage, plot_id);

        // Apply season bonus if the planted crop matches the active bonus crop.
        let season_end  = season_config::get_end_ms(dapp_storage);
        let bonus_crop  = season_config::get_bonus_crop(dapp_storage);
        let season_id   = season_config::get_season_id(dapp_storage);
        let boosted = season_id > 0 && now < season_end && crop_type == bonus_crop;
        let after_bonus = if (boosted) { base_count * SEASON_BONUS_PCT / 100 } else { base_count };

        // Apply crow_damage debuff if active.
        let final_count = if (crow_damage::has(user_storage)) {
            let cd_expires = crow_damage::get_expires_at(user_storage);
            if (now < cd_expires) {
                let dmg_pct = (crow_damage::get_damage_pct(user_storage) as u64);
                after_bonus * (100 - dmg_pct) / 100
            } else {
                after_bonus
            }
        } else {
            after_bonus
        };

        // Yield goes into the crop resource (not seeds)
        mint_crop(user_storage, crop_type, final_count, ctx);

        // Track earnings for season leaderboard.
        let gold_value = crop_gold_value(crop_type) * final_count;
        if (season_stats::has(user_storage)) {
            let prev = season_stats::get(user_storage);
            season_stats::set(user_storage, prev + gold_value, ctx);
        } else {
            season_stats::set(user_storage, gold_value, ctx);
        };
        let prev_total = profile::get_total_earned(user_storage);
        profile::set_total_earned(user_storage, prev_total + gold_value, ctx);

        // Clear the plot.
        farm_plot::set(user_storage, plot_id, CROP_NONE, 0, 0, 0, ctx);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    fun crop_duration(crop_type: u8): u64 {
        if      (crop_type == CROP_WHEAT)   { WHEAT_MS   }
        else if (crop_type == CROP_CORN)    { CORN_MS    }
        else if (crop_type == CROP_CARROT)  { CARROT_MS  }
        else                                { PUMPKIN_MS }
    }

    fun crop_yield(crop_type: u8): u64 {
        if      (crop_type == CROP_WHEAT)   { WHEAT_YIELD   }
        else if (crop_type == CROP_CORN)    { CORN_YIELD    }
        else if (crop_type == CROP_CARROT)  { CARROT_YIELD  }
        else                                { PUMPKIN_YIELD }
    }

    fun crop_gold_value(crop_type: u8): u64 {
        if      (crop_type == CROP_WHEAT)   { 8   }
        else if (crop_type == CROP_CORN)    { 35  }
        else if (crop_type == CROP_CARROT)  { 120 }
        else                                { 100 }
    }

    fun seed_balance(user_storage: &UserStorage, crop_type: u8): u64 {
        if      (crop_type == CROP_WHEAT)   { if (wheat_seed::has(user_storage))   { wheat_seed::get(user_storage) }   else { 0 } }
        else if (crop_type == CROP_CORN)    { if (corn_seed::has(user_storage))    { corn_seed::get(user_storage) }    else { 0 } }
        else if (crop_type == CROP_CARROT)  { if (carrot_seed::has(user_storage))  { carrot_seed::get(user_storage) }  else { 0 } }
        else                                { if (pumpkin_seed::has(user_storage)) { pumpkin_seed::get(user_storage) } else { 0 } }
    }

    fun deduct_seeds(user_storage: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (crop_type == CROP_WHEAT)   { wheat_seed::sub(user_storage, amount, ctx)   }
        else if (crop_type == CROP_CORN)    { corn_seed::sub(user_storage, amount, ctx)    }
        else if (crop_type == CROP_CARROT)  { carrot_seed::sub(user_storage, amount, ctx)  }
        else                                { pumpkin_seed::sub(user_storage, amount, ctx) }
    }

    fun mint_crop(user_storage: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (crop_type == CROP_WHEAT)   { wheat::add(user_storage, amount, ctx)   }
        else if (crop_type == CROP_CORN)    { corn::add(user_storage, amount, ctx)    }
        else if (crop_type == CROP_CARROT)  { carrot::add(user_storage, amount, ctx)  }
        else                                { pumpkin::add(user_storage, amount, ctx) }
    }
}
