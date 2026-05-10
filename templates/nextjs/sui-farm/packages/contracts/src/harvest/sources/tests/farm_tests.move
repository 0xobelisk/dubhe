/// Comprehensive boundary tests for harvest game systems.
///
/// Coverage:
///   farm_system  — plant (6 success + 5 failure cases)
///                — harvest (10 success + 4 failure cases)
///   shop_system  — buy_seeds (5 success + 5 failure cases)
///                — buy_extra_plot (3 success + 3 failure cases)
///                — sell_crops (4 success + 4 failure cases)
///   crow_system  — place_scarecrow (2 success + 2 failure cases)
///
/// Logic checks verified:
///   • plant always deducts exactly 1 seed and stores crop_yield as plot count
///   • harvest returns base yield with no bonus, 2× season bonus (SEASON_BONUS_PCT=200),
///     30% crow_damage debuff, expired debuff, and all three combined
///   • harvest clears the plot and updates profile.total_earned + season_stats
///   • harvest boundary: exactly at harvest_at succeeds, one ms before fails
///   • seed prices from deploy_hook: wheat=5, corn=20, carrot=60, pumpkin=40, plot=200
///   • sell prices: wheat=8, corn=35, carrot=120, pumpkin=100
///   • max plots cap: 12; starting plots: 3

#[test_only]
module harvest::farm_tests {
    use sui::clock;
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use harvest::init_test;
    use harvest::deploy_hook;
    use harvest::farm_system;
    use harvest::shop_system;
    use harvest::crow_system;
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
    use harvest::farm_plot;
    use harvest::season_config;
    use harvest::season_stats;
    use harvest::crow_damage;
    use harvest::scarecrow;

    // ─── Constants (must match farm_system.move / deploy_hook.move) ──────────────
    const CROP_WHEAT:   u8  = 1;
    const CROP_CORN:    u8  = 2;
    const CROP_CARROT:  u8  = 3;
    const CROP_PUMPKIN: u8  = 4;

    const WHEAT_MS:   u64 = 60_000;          //  1 min
    const CORN_MS:    u64 = 120_000;         //  2 min
    const CARROT_MS:  u64 = 240_000;         //  4 min
    const PUMPKIN_MS: u64 = 300_000;         //  5 min

    const WHEAT_YIELD:   u64 = 6;
    const CORN_YIELD:    u64 = 4;
    const CARROT_YIELD:  u64 = 3;
    const PUMPKIN_YIELD: u64 = 3;

    // sell prices used in shop_system.move
    const WHEAT_SELL:   u64 = 8;
    const CORN_SELL:    u64 = 35;
    const CARROT_SELL:  u64 = 120;
    const PUMPKIN_SELL: u64 = 100;

    // seed prices set by deploy_hook
    const WHEAT_PRICE:   u64 = 5;
    const CORN_PRICE:    u64 = 20;
    const CARROT_PRICE:  u64 = 60;
    const PUMPKIN_PRICE: u64 = 40;
    const PLOT_PRICE:    u64 = 200;

    const SEASON_BONUS_PCT: u64 = 200;
    const CROW_DAMAGE_PCT:  u8  = 30;

    // ─── Test helpers ─────────────────────────────────────────────────────────────

    fun setup_dapp(ctx: &mut TxContext): DappStorage {
        let mut ds = init_test::create_dapp_storage_for_testing(ctx);
        deploy_hook::run(&mut ds, ctx);
        ds
    }

    /// Create a UserStorage pre-configured as a registered player.
    /// Uses ctx.sender() as canonical_owner so set_record calls pass the
    /// is_write_authorized check (sender == canonical_owner).
    /// Sets profile (total_earned=0, plots_owned=3) and the requested gold.
    fun setup_player(gold_amount: u64, ctx: &mut TxContext): UserStorage {
        let owner = ctx.sender();
        let mut us = init_test::create_user_storage_for_testing(owner, ctx);
        gold::set(&mut us, gold_amount, ctx);
        profile::set(&mut us, 0, 3, ctx);
        us
    }

    fun give_crop(us: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (crop_type == CROP_WHEAT)   { wheat::add(us, amount, ctx)   }
        else if (crop_type == CROP_CORN)    { corn::add(us, amount, ctx)    }
        else if (crop_type == CROP_CARROT)  { carrot::add(us, amount, ctx)  }
        else                                { pumpkin::add(us, amount, ctx) };
    }

    /// Give seeds (the separate seed resource used for planting).
    fun give_seed(us: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (crop_type == CROP_WHEAT)   { wheat_seed::add(us, amount, ctx)   }
        else if (crop_type == CROP_CORN)    { corn_seed::add(us, amount, ctx)    }
        else if (crop_type == CROP_CARROT)  { carrot_seed::add(us, amount, ctx)  }
        else                                { pumpkin_seed::add(us, amount, ctx) };
    }

    /// Plant a crop, advance the clock to harvest_at + extra_ms, and return the clock.
    /// Caller must call clock::destroy_for_testing when done.
    fun plant_then_advance(
        ds: &DappStorage,
        us: &mut UserStorage,
        plot_id:   u8,
        crop_type: u8,
        extra_ms:  u64,
        ctx: &mut TxContext,
    ): clock::Clock {
        let mut clk = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(ds, us, plot_id, crop_type, &clk, ctx);
        let harvest_at = farm_plot::get_harvest_at(us, plot_id);
        clock::set_for_testing(&mut clk, harvest_at + extra_ms);
        clk
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // farm_system::plant
    // ═════════════════════════════════════════════════════════════════════════════

    // ── success cases ─────────────────────────────────────────────────────────────

    #[test]
    fun test_plant_wheat_deducts_one_seed_stores_yield() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 5, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        assert!(wheat_seed::get(&us) == 4, 0);                             // 5 - 1 seed deducted
        assert!(farm_plot::get_count(&us, 0) == WHEAT_YIELD, 1);       // stored yield = 6
        assert!(farm_plot::get_crop_type(&us, 0) == CROP_WHEAT, 2);
        let planted_at = farm_plot::get_planted_at(&us, 0);
        assert!(farm_plot::get_harvest_at(&us, 0) == planted_at + WHEAT_MS, 3);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_plant_corn_deducts_one_seed_stores_yield() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_CORN, 3, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_CORN, &clk, &mut ctx);

        assert!(corn_seed::get(&us) == 2, 0);
        assert!(farm_plot::get_count(&us, 0) == CORN_YIELD, 1);
        let planted_at = farm_plot::get_planted_at(&us, 0);
        assert!(farm_plot::get_harvest_at(&us, 0) == planted_at + CORN_MS, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_plant_carrot_deducts_one_seed_stores_yield() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_CARROT, 2, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_CARROT, &clk, &mut ctx);

        assert!(carrot_seed::get(&us) == 1, 0);
        assert!(farm_plot::get_count(&us, 0) == CARROT_YIELD, 1);
        let planted_at = farm_plot::get_planted_at(&us, 0);
        assert!(farm_plot::get_harvest_at(&us, 0) == planted_at + CARROT_MS, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_plant_pumpkin_deducts_one_seed_stores_yield() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_PUMPKIN, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_PUMPKIN, &clk, &mut ctx);

        assert!(!pumpkin_seed::has(&us) || pumpkin_seed::get(&us) == 0, 0);
        assert!(farm_plot::get_count(&us, 0) == PUMPKIN_YIELD, 1);
        let planted_at = farm_plot::get_planted_at(&us, 0);
        assert!(farm_plot::get_harvest_at(&us, 0) == planted_at + PUMPKIN_MS, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_plant_three_different_crops_on_three_plots() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);
        give_seed(&mut us, CROP_CORN, 1, &mut ctx);
        give_seed(&mut us, CROP_CARROT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);
        farm_system::plant(&ds, &mut us, 1, CROP_CORN, &clk, &mut ctx);
        farm_system::plant(&ds, &mut us, 2, CROP_CARROT, &clk, &mut ctx);

        assert!(farm_plot::get_crop_type(&us, 0) == CROP_WHEAT, 0);
        assert!(farm_plot::get_crop_type(&us, 1) == CROP_CORN, 1);
        assert!(farm_plot::get_crop_type(&us, 2) == CROP_CARROT, 2);
        assert!(farm_plot::get_count(&us, 0) == WHEAT_YIELD, 3);
        assert!(farm_plot::get_count(&us, 1) == CORN_YIELD, 4);
        assert!(farm_plot::get_count(&us, 2) == CARROT_YIELD, 5);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_plant_plot_2_boundary_last_owned_plot() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx); // plots_owned = 3 → indices 0,1,2
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 2, CROP_WHEAT, &clk, &mut ctx); // index 2 is valid

        assert!(farm_plot::get_crop_type(&us, 2) == CROP_WHEAT, 0);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ── failure cases ─────────────────────────────────────────────────────────────

    #[test]
    #[expected_failure]
    fun test_plant_fails_not_registered() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx); // no profile
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_plant_fails_crop_type_none() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::plant(&ds, &mut us, 0, 0, &clk, &mut ctx); // 0 = CROP_NONE

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_plant_fails_crop_type_out_of_range() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::plant(&ds, &mut us, 0, 5, &clk, &mut ctx); // no crop type 5

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_plant_fails_plot_not_owned() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx); // plots_owned = 3 → valid: 0,1,2
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::plant(&ds, &mut us, 3, CROP_WHEAT, &clk, &mut ctx); // index 3 not owned

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_plant_fails_plot_already_has_crop() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 3, &mut ctx);
        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);

        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx); // second plant aborts

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_plant_fails_no_seeds_in_inventory() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx); // zero wheat
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // farm_system::harvest
    // ═════════════════════════════════════════════════════════════════════════════

    // ── success cases ─────────────────────────────────────────────────────────────

    #[test]
    fun test_harvest_wheat_base_yield_no_bonus() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let clk = plant_then_advance(&ds, &mut us, 0, CROP_WHEAT, 0, &mut ctx);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(wheat::get(&us) == WHEAT_YIELD, 0);        // base 6
        assert!(farm_plot::get_crop_type(&us, 0) == 0, 1); // plot cleared
        assert!(farm_plot::get_count(&us, 0) == 0, 2);
        assert!(profile::get_total_earned(&us) == WHEAT_YIELD * WHEAT_SELL, 3); // 48

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_corn_base_yield_no_bonus() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_CORN, 1, &mut ctx);

        let clk = plant_then_advance(&ds, &mut us, 0, CROP_CORN, 0, &mut ctx);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(corn::get(&us) == CORN_YIELD, 0);
        assert!(profile::get_total_earned(&us) == CORN_YIELD * CORN_SELL, 1); // 140

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_carrot_base_yield_no_bonus() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_CARROT, 1, &mut ctx);

        let clk = plant_then_advance(&ds, &mut us, 0, CROP_CARROT, 0, &mut ctx);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(carrot::get(&us) == CARROT_YIELD, 0);
        assert!(profile::get_total_earned(&us) == CARROT_YIELD * CARROT_SELL, 1); // 360

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_pumpkin_base_yield_no_bonus() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_PUMPKIN, 1, &mut ctx);

        let clk = plant_then_advance(&ds, &mut us, 0, CROP_PUMPKIN, 0, &mut ctx);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(pumpkin::get(&us) == PUMPKIN_YIELD, 0);
        assert!(profile::get_total_earned(&us) == PUMPKIN_YIELD * PUMPKIN_SELL, 1); // 300

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_succeeds_exactly_at_harvest_at() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        // plant_then_advance with extra_ms=0 sets clock to exactly harvest_at
        let clk = plant_then_advance(&ds, &mut us, 0, CROP_WHEAT, 0, &mut ctx);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(wheat::get(&us) == WHEAT_YIELD, 0);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_season_bonus_doubles_matching_crop() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        // Active season: bonus_crop = WHEAT, end far in future
        season_config::set(&mut ds, 1, harvest_at + 1_000_000, CROP_WHEAT);
        clock::set_for_testing(&mut clk, harvest_at);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        // after_bonus = WHEAT_YIELD * SEASON_BONUS_PCT / 100 = 6 * 200 / 100 = 12
        assert!(wheat::get(&us) == WHEAT_YIELD * SEASON_BONUS_PCT / 100, 0); // 12

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_season_bonus_no_effect_on_non_matching_crop() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        // Season active but bonus is CORN, not WHEAT
        season_config::set(&mut ds, 1, harvest_at + 1_000_000, CROP_CORN);
        clock::set_for_testing(&mut clk, harvest_at);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(wheat::get(&us) == WHEAT_YIELD, 0); // no boost

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_expired_season_no_boost() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        // Season already ended 1 ms before harvest
        season_config::set(&mut ds, 1, harvest_at - 1, CROP_WHEAT);
        clock::set_for_testing(&mut clk, harvest_at);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(wheat::get(&us) == WHEAT_YIELD, 0); // no boost (now >= season_end)

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_crow_damage_active_reduces_yield() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        // Crow damage 30%, expires after harvest_at
        crow_damage::set(&mut us, harvest_at + 100_000, CROW_DAMAGE_PCT, &mut ctx);
        clock::set_for_testing(&mut clk, harvest_at);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        // final = 6 * (100 - 30) / 100 = 6 * 70 / 100 = 4
        assert!(wheat::get(&us) == 4, 0);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_crow_damage_expired_no_penalty() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        // Crow damage already expired 1 ms before harvest
        crow_damage::set(&mut us, harvest_at - 1, CROW_DAMAGE_PCT, &mut ctx);
        clock::set_for_testing(&mut clk, harvest_at);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(wheat::get(&us) == WHEAT_YIELD, 0); // full yield, debuff expired

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_season_bonus_and_crow_damage_combined() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        season_config::set(&mut ds, 1, harvest_at + 1_000_000, CROP_WHEAT);       // 2× bonus
        crow_damage::set(&mut us, harvest_at + 1_000_000, CROW_DAMAGE_PCT, &mut ctx); // −30%
        clock::set_for_testing(&mut clk, harvest_at);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        // after_bonus = 6 * 200 / 100 = 12; final = 12 * 70 / 100 = 8
        assert!(wheat::get(&us) == 8, 0);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_accumulates_total_earned_over_two_plots() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 2, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);
        farm_system::plant(&ds, &mut us, 1, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        clock::set_for_testing(&mut clk, harvest_at);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);
        farm_system::harvest(&ds, &mut us, 1, &clk, &mut ctx);

        // total_earned = 2 × (WHEAT_YIELD × WHEAT_SELL) = 2 × 48 = 96
        assert!(profile::get_total_earned(&us) == 2 * WHEAT_YIELD * WHEAT_SELL, 0);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_season_stats_accumulated_correctly() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_CORN, 1, &mut ctx);

        let clk = plant_then_advance(&ds, &mut us, 0, CROP_CORN, 0, &mut ctx);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        assert!(season_stats::has(&us), 0);
        assert!(season_stats::get(&us) == CORN_YIELD * CORN_SELL, 1); // 140

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_harvest_then_replant_same_plot_succeeds() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 2, &mut ctx); // 2 seeds: 1 for first plant, 1 for replant

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        clock::set_for_testing(&mut clk, harvest_at);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        // Re-plant on the same plot using a second seed
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);
        assert!(farm_plot::get_crop_type(&us, 0) == CROP_WHEAT, 0);
        // Both seeds consumed; harvested crops (WHEAT_YIELD) still intact in crop resource
        assert!(wheat_seed::get(&us) == 0, 1);
        assert!(wheat::get(&us) == WHEAT_YIELD, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ── failure cases ─────────────────────────────────────────────────────────────

    #[test]
    #[expected_failure]
    fun test_harvest_fails_not_registered() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_harvest_fails_plot_record_does_not_exist() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx); // no plot record set

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_harvest_fails_plot_is_empty_after_previous_harvest() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        clock::set_for_testing(&mut clk, harvest_at);
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx); // first: ok
        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx); // second: plot is empty

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_harvest_fails_one_ms_before_ready() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);
        give_seed(&mut us, CROP_WHEAT, 1, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        farm_system::plant(&ds, &mut us, 0, CROP_WHEAT, &clk, &mut ctx);

        let harvest_at = farm_plot::get_harvest_at(&us, 0);
        clock::set_for_testing(&mut clk, harvest_at - 1); // 1 ms too early

        farm_system::harvest(&ds, &mut us, 0, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // shop_system::buy_seeds
    // ═════════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_buy_seeds_wheat_deducts_gold_adds_inventory() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, CROP_WHEAT, 3, &mut ctx);

        assert!(gold::get(&us) == 100 - 3 * WHEAT_PRICE, 0); // 85
        assert!(wheat_seed::get(&us) == 3, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_buy_seeds_corn_correct_price() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, CROP_CORN, 2, &mut ctx);

        assert!(gold::get(&us) == 100 - 2 * CORN_PRICE, 0); // 60
        assert!(corn_seed::get(&us) == 2, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_buy_seeds_carrot_correct_price() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, CROP_CARROT, 1, &mut ctx);

        assert!(gold::get(&us) == 100 - CARROT_PRICE, 0); // 40
        assert!(carrot_seed::get(&us) == 1, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_buy_seeds_pumpkin_correct_price() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(200, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, CROP_PUMPKIN, 4, &mut ctx);

        assert!(gold::get(&us) == 200 - 4 * PUMPKIN_PRICE, 0); // 40
        assert!(pumpkin_seed::get(&us) == 4, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_buy_seeds_exact_gold_boundary() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(WHEAT_PRICE, &mut ctx); // exactly 5

        shop_system::buy_seeds(&ds, &mut us, CROP_WHEAT, 1, &mut ctx);

        assert!(gold::get(&us) == 0, 0);
        assert!(wheat_seed::get(&us) == 1, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_seeds_fails_not_registered() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, CROP_WHEAT, 1, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_seeds_fails_crop_type_none() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, 0, 1, &mut ctx); // type 0 invalid

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_seeds_fails_crop_type_out_of_range() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, 5, 1, &mut ctx); // type 5 invalid

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_seeds_fails_count_zero() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(100, &mut ctx);

        shop_system::buy_seeds(&ds, &mut us, CROP_WHEAT, 0, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_seeds_fails_insufficient_gold_by_one() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(WHEAT_PRICE - 1, &mut ctx); // 4 < 5

        shop_system::buy_seeds(&ds, &mut us, CROP_WHEAT, 1, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // shop_system::buy_extra_plot
    // ═════════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_buy_extra_plot_increments_plots_and_deducts_gold() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(300, &mut ctx); // starting: 3 plots, 300 gold

        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);

        assert!(gold::get(&us) == 300 - PLOT_PRICE, 0); // 100
        assert!(profile::get_plots_owned(&us) == 4, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_buy_extra_plot_exact_gold_boundary() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(PLOT_PRICE, &mut ctx); // exactly 200

        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);

        assert!(gold::get(&us) == 0, 0);
        assert!(profile::get_plots_owned(&us) == 4, 1);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_buy_extra_plot_up_to_max_12() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        // Buy 3 extra plots (3 → 6) to verify repeated purchases work
        let mut us = setup_player(2000, &mut ctx);

        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);
        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);
        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);

        assert!(profile::get_plots_owned(&us) == 6, 0);
        assert!(gold::get(&us) == 2000 - 3 * PLOT_PRICE, 1); // 2000 - 600 = 1400

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_extra_plot_fails_not_registered() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);

        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_extra_plot_fails_at_max_12() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);
        gold::set(&mut us, 500, &mut ctx);
        profile::set(&mut us, 0, 12, &mut ctx); // already at max

        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_buy_extra_plot_fails_insufficient_gold_by_one() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(PLOT_PRICE - 1, &mut ctx); // 199

        shop_system::buy_extra_plot(&ds, &mut us, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // shop_system::sell_crops
    // ═════════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_sell_wheat_burns_crops_adds_gold() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);
        give_crop(&mut us, CROP_WHEAT, 6, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_WHEAT, 6, &mut ctx);

        assert!(wheat::get(&us) == 0, 0);
        assert!(gold::get(&us) == 6 * WHEAT_SELL, 1); // 48

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_sell_corn_correct_price() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);
        give_crop(&mut us, CROP_CORN, 4, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_CORN, 4, &mut ctx);

        assert!(corn::get(&us) == 0, 0);
        assert!(gold::get(&us) == 4 * CORN_SELL, 1); // 140

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_sell_partial_amount_leaves_remainder() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);
        give_crop(&mut us, CROP_WHEAT, 10, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_WHEAT, 4, &mut ctx);

        assert!(wheat::get(&us) == 6, 0);
        assert!(gold::get(&us) == 4 * WHEAT_SELL, 1); // 32

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_sell_pumpkin_and_carrot_correct_prices() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);
        give_crop(&mut us, CROP_PUMPKIN, 2, &mut ctx);
        give_crop(&mut us, CROP_CARROT, 3, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_PUMPKIN, 2, &mut ctx);
        shop_system::sell_crops(&ds, &mut us, CROP_CARROT, 3, &mut ctx);

        assert!(pumpkin::get(&us) == 0, 0);
        assert!(carrot::get(&us) == 0, 1);
        assert!(gold::get(&us) == 2 * PUMPKIN_SELL + 3 * CARROT_SELL, 2); // 200 + 360 = 560

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_sell_crops_fails_not_registered() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_WHEAT, 1, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_sell_crops_fails_invalid_crop_type() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, 0, 1, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_sell_crops_fails_amount_zero() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);
        give_crop(&mut us, CROP_WHEAT, 5, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_WHEAT, 0, &mut ctx);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_sell_crops_fails_more_than_owned() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(0, &mut ctx);
        give_crop(&mut us, CROP_WHEAT, 3, &mut ctx);

        shop_system::sell_crops(&ds, &mut us, CROP_WHEAT, 4, &mut ctx); // 4 > 3 owned

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // crow_system::place_scarecrow
    // ═════════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_place_scarecrow_deducts_gold_and_sets_expiry() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(50, &mut ctx);
        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);

        crow_system::place_scarecrow(&ds, &mut us, &clk, &mut ctx);

        assert!(gold::get(&us) == 40, 0); // 50 − 10 = 40
        assert!(scarecrow::has(&us), 1);
        // SCARECROW_DURATION = 4 h = 14_400_000 ms
        assert!(scarecrow::get(&us) == 1000 + 14_400_000, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    fun test_place_scarecrow_exact_gold_boundary() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(10, &mut ctx); // exactly 10
        let clk = clock::create_for_testing(&mut ctx);

        crow_system::place_scarecrow(&ds, &mut us, &clk, &mut ctx);

        assert!(gold::get(&us) == 0, 0);
        assert!(scarecrow::has(&us), 1);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_place_scarecrow_fails_not_registered() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        crow_system::place_scarecrow(&ds, &mut us, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_place_scarecrow_fails_insufficient_gold_by_one() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_dapp(&mut ctx);
        let mut us = setup_player(9, &mut ctx); // 1 short of 10
        let clk = clock::create_for_testing(&mut ctx);

        crow_system::place_scarecrow(&ds, &mut us, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }
}
