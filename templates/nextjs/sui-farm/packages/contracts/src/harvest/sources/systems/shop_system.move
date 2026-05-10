module harvest::shop_system {
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::error;
    use harvest::gold;
    use harvest::wheat_seed;
    use harvest::corn_seed;
    use harvest::carrot_seed;
    use harvest::pumpkin_seed;
    use harvest::wheat;
    use harvest::corn;
    use harvest::carrot;
    use harvest::pumpkin;
    use harvest::profile;
    use harvest::shop_config;

    const CROP_WHEAT:   u8 = 1;
    const CROP_CORN:    u8 = 2;
    const CROP_CARROT:  u8 = 3;
    const CROP_PUMPKIN: u8 = 4;

    /// Buy `count` seeds of `crop_type` from the system shop using gold.
    /// Seeds are stored in the dedicated *_seed resource (separate from harvested crops).
    public entry fun buy_seeds(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        crop_type:    u8,
        count:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::invalid_crop_type(crop_type >= CROP_WHEAT && crop_type <= CROP_PUMPKIN);
        error::insufficient_crops(count > 0);

        let price_per_seed = seed_price(dapp_storage, crop_type);
        let total_cost = price_per_seed * count;
        error::insufficient_gold(gold::get(user_storage) >= total_cost);
        gold::sub(user_storage, total_cost, ctx);
        mint_seeds(user_storage, crop_type, count, ctx);
    }

    /// Purchase an additional farm plot (up to 12 total).
    public entry fun buy_extra_plot(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));

        let plots_owned = profile::get_plots_owned(user_storage);
        error::max_plots_reached(plots_owned < 12);

        let price = shop_config::get_extra_plot_price(dapp_storage);
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::sub(user_storage, price, ctx);
        profile::set_plots_owned(user_storage, plots_owned + 1, ctx);
    }

    /// Sell harvested crops back to the system at the base gold rate.
    /// Only crop resources (not seeds) can be sold.
    public entry fun sell_crops(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        crop_type:    u8,
        amount:       u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::invalid_crop_type(crop_type >= CROP_WHEAT && crop_type <= CROP_PUMPKIN);
        error::insufficient_crops(amount > 0);

        burn_crops(user_storage, crop_type, amount, ctx);
        gold::add(user_storage, sell_price(crop_type) * amount, ctx);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    fun seed_price(dapp_storage: &DappStorage, crop_type: u8): u64 {
        if      (crop_type == CROP_WHEAT)   { shop_config::get_wheat_seed_price(dapp_storage)   }
        else if (crop_type == CROP_CORN)    { shop_config::get_corn_seed_price(dapp_storage)    }
        else if (crop_type == CROP_CARROT)  { shop_config::get_carrot_seed_price(dapp_storage)  }
        else                                { shop_config::get_pumpkin_seed_price(dapp_storage) }
    }

    fun sell_price(crop_type: u8): u64 {
        if      (crop_type == CROP_WHEAT)   { 8   }
        else if (crop_type == CROP_CORN)    { 35  }
        else if (crop_type == CROP_CARROT)  { 120 }
        else                                { 100 }
    }

    /// Mint seeds into the dedicated seed resource (not the crop resource).
    fun mint_seeds(user_storage: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (crop_type == CROP_WHEAT)   { wheat_seed::add(user_storage, amount, ctx)   }
        else if (crop_type == CROP_CORN)    { corn_seed::add(user_storage, amount, ctx)    }
        else if (crop_type == CROP_CARROT)  { carrot_seed::add(user_storage, amount, ctx)  }
        else                                { pumpkin_seed::add(user_storage, amount, ctx) }
    }

    /// Burn harvested crops (crop resource, not seeds).
    fun burn_crops(user_storage: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (crop_type == CROP_WHEAT)   { wheat::sub(user_storage, amount, ctx)   }
        else if (crop_type == CROP_CORN)    { corn::sub(user_storage, amount, ctx)    }
        else if (crop_type == CROP_CARROT)  { carrot::sub(user_storage, amount, ctx)  }
        else                                { pumpkin::sub(user_storage, amount, ctx) }
    }
}
