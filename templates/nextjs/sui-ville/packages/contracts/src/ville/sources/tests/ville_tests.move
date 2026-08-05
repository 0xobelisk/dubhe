/// Boundary tests for the Ville town systems.
///
/// Coverage:
///   world_system   — register (success + duplicate failure)
///   agent_system   — mint_agent (fee flow, field init, caps, bad input)
///   life_system    — move_to / work / eat / sleep (+ lazy energy decay)
///   social_system  — talk / gift_item (both relationship edges, reactive)
///   town_system    — tick / nominate / vote / close_election / start_festival
///
/// Tests that need shared objects (buildings, Random) run inside
/// test_scenario; pure UserStorage/DappStorage tests use a dummy TxContext
/// (canonical_owner == ctx.sender() so set_record write-auth passes).
#[test_only]
module ville::ville_tests {
    use std::ascii::string;
    use sui::clock;
    use sui::random::{Self, Random};
    use sui::test_scenario::{Self, Scenario};
    use dubhe::dapp_service::{DappStorage, UserStorage, ObjectStorage};
    use ville::init_test;
    use ville::world_system;
    use ville::agent_system;
    use ville::life_system;
    use ville::social_system;
    use ville::town_system;
    use ville::gold;
    use ville::profile;
    use ville::agent;
    use ville::memory_digest;
    use ville::relationship;
    use ville::item;
    use ville::vote_record;
    use ville::town_config;
    use ville::town_event;
    use ville::election_state;
    use ville::world;
    use ville::building::{Self, Building};

    // ─── Constants (must match the system modules) ────────────────────────────
    const ADMIN: address = @0xAD;

    const STARTING_GOLD: u64 = 300;
    const MINT_COST: u64 = 100;

    const KIND_TOWN_HALL: u8 = 1;
    const KIND_FARM:      u8 = 2;
    const KIND_CAFE:      u8 = 3;

    const OCC_FARMER:  u8 = 1;
    const OCC_BARISTA: u8 = 2;

    const DAY_LENGTH_MS: u64 = 600_000;

    const WORK_ENERGY_COST: u64 = 20;
    const WORK_RANDOM_BONUS_MAX: u64 = 4;
    const EAT_ENERGY_GAIN: u64 = 40;
    const SLEEP_COOLDOWN_MS: u64 = 600_000;
    const TALK_ENERGY_COST: u64 = 5;
    const TALK_AFFINITY_GAIN: u64 = 2;
    const GIFT_AFFINITY_GAIN: u64 = 6;
    const BASE_AFFINITY: u64 = 50;
    const ENERGY_DECAY_MS: u64 = 30_000;
    const NOMINATION_FEE: u64 = 20;
    const FESTIVAL_COST: u64 = 50;

    const EVENT_MARKET_DAY: u8 = 1;
    const EVENT_STORM: u8 = 2;
    const EVENT_MERCHANT: u8 = 3;

    // ─── Helpers (dummy-ctx path) ─────────────────────────────────────────────

    /// DappStorage with town defaults, without running deploy_hook (which
    /// would share building objects a dummy-ctx test cannot retrieve).
    fun setup_town(ctx: &mut TxContext): DappStorage {
        let mut ds = init_test::create_dapp_storage_for_testing(ctx);
        town_config::set(&mut ds, 1, 0, DAY_LENGTH_MS, 0, @0x0, @0x0, 0);
        election_state::set(&mut ds, 0, 0, @0x0, @0x0, 0, 0);
        town_event::set(&mut ds, 0, 0, 0, 0);
        ds
    }

    /// A registered player owned by `owner` with the given gold.
    fun setup_player(owner: address, gold_amount: u64, ctx: &mut TxContext): UserStorage {
        let mut us = init_test::create_user_storage_for_testing(owner, ctx);
        gold::set(&mut us, gold_amount, ctx);
        profile::set(&mut us, 0, 0, ctx);
        us
    }

    /// Mint an agent record directly (bypassing the TownHall fee flow) so
    /// dummy-ctx tests do not need a shared building object.
    fun spawn_agent(us: &mut UserStorage, occupation: u8, now: u64, ctx: &mut TxContext): address {
        let agent_id = ctx.fresh_object_address();
        agent::mint(
            us, agent_id,
            string(b"Alice"), string(b"cheerful farmer"),
            occupation, 100, 60, 0, now, 0, 0, now, ctx,
        );
        agent_id
    }

    // ─── Helpers (test_scenario path, for shared buildings / Random) ─────────

    /// Begin a scenario: creates the shared Random object (as @0x0), then
    /// switches to ADMIN and creates DappStorage with town defaults.
    fun begin_town(): (Scenario, DappStorage) {
        let mut sc = test_scenario::begin(@0x0);
        random::create_for_testing(sc.ctx());
        sc.next_tx(ADMIN);
        let ds = setup_town(sc.ctx());
        (sc, ds)
    }

    /// Create + configure one shared building, and advance the scenario so it
    /// can be taken. Returns the retrieved shared ObjectStorage.
    fun make_building(
        sc:   &mut Scenario,
        ds:   &mut DappStorage,
        id:   vector<u8>,
        kind: u8,
        wage: u64,
        meal_price: u64,
    ): ObjectStorage<Building> {
        building::create_building(ds, id, sc.ctx());
        sc.next_tx(ADMIN);
        let mut b = sc.take_shared<ObjectStorage<Building>>();
        town_system::configure_building(ds, &mut b, kind, string(b"B"), wage, meal_price, sc.ctx());
        b
    }

    // ═════════════════════════════════════════════════════════════════════════
    // world_system::register
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_register_grants_starting_state() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);
        let mut permit = world::new_world(
            &ds, vector::empty(), std::option::none(), std::option::none(), &mut ctx,
        );

        world_system::register(&ds, &mut us, &mut permit, &mut ctx);

        assert!(gold::get(&us) == STARTING_GOLD, 0);
        assert!(profile::get_agents_minted(&us) == 0, 1);
        assert!(world::is_participant(&permit, ctx.sender()), 2);

        std::unit_test::destroy(permit);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_register_twice_fails() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = init_test::create_user_storage_for_testing(ctx.sender(), &mut ctx);
        let mut permit = world::new_world(
            &ds, vector::empty(), std::option::none(), std::option::none(), &mut ctx,
        );

        world_system::register(&ds, &mut us, &mut permit, &mut ctx);
        world_system::register(&ds, &mut us, &mut permit, &mut ctx);

        std::unit_test::destroy(permit);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // agent_system::mint_agent
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_mint_agent_pays_fee_and_initializes() {
        let (mut sc, mut ds) = begin_town();
        let mut hall = make_building(&mut sc, &mut ds, b"town_hall", KIND_TOWN_HALL, 0, 0);
        let mut us = setup_player(ADMIN, STARTING_GOLD, sc.ctx());
        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);

        agent_system::mint_agent(
            &mut ds, &mut us, &mut hall,
            string(b"Momo"), string(b"a curious baker who loves gossip"),
            OCC_FARMER, &clk, sc.ctx(),
        );

        assert!(gold::get(&us) == STARTING_GOLD - MINT_COST, 0);
        assert!(building::get_gold(&hall) == MINT_COST, 1);
        assert!(profile::get_agents_minted(&us) == 1, 2);
        assert!(town_config::get_population(&ds) == 1, 3);

        // The agent id is not returned; a freshly minted player has exactly
        // one agent — verify its fields via the position event side channel
        // is impossible here, so re-derive: mint used fresh_object_address,
        // which we cannot predict. Instead spawn a known agent and compare
        // defaults through the direct helper below.
        clock::destroy_for_testing(clk);
        test_scenario::return_shared(hall);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    fun test_spawned_agent_default_fields() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);

        let id = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);

        assert!(agent::has(&us, id), 0);
        assert!(agent::get_energy(&us, id) == 100, 1);
        assert!(agent::get_mood(&us, id) == 60, 2);
        assert!(agent::get_occupation(&us, id) == OCC_FARMER, 3);
        assert!(agent::get_location(&us, id) == 0, 4);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_mint_agent_fails_invalid_occupation() {
        let (mut sc, mut ds) = begin_town();
        let mut hall = make_building(&mut sc, &mut ds, b"town_hall", KIND_TOWN_HALL, 0, 0);
        let mut us = setup_player(ADMIN, STARTING_GOLD, sc.ctx());
        let clk = clock::create_for_testing(sc.ctx());

        agent_system::mint_agent(
            &mut ds, &mut us, &mut hall,
            string(b"X"), string(b"y"), 0, &clk, sc.ctx(),
        );

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(hall);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_mint_agent_fails_insufficient_gold() {
        let (mut sc, mut ds) = begin_town();
        let mut hall = make_building(&mut sc, &mut ds, b"town_hall", KIND_TOWN_HALL, 0, 0);
        let mut us = setup_player(ADMIN, MINT_COST - 1, sc.ctx());
        let clk = clock::create_for_testing(sc.ctx());

        agent_system::mint_agent(
            &mut ds, &mut us, &mut hall,
            string(b"X"), string(b"y"), OCC_FARMER, &clk, sc.ctx(),
        );

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(hall);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_mint_agent_fails_beyond_max_agents() {
        let (mut sc, mut ds) = begin_town();
        let mut hall = make_building(&mut sc, &mut ds, b"town_hall", KIND_TOWN_HALL, 0, 0);
        let mut us = setup_player(ADMIN, 1000, sc.ctx());
        let clk = clock::create_for_testing(sc.ctx());

        agent_system::mint_agent(&mut ds, &mut us, &mut hall, string(b"A"), string(b"p"), OCC_FARMER, &clk, sc.ctx());
        agent_system::mint_agent(&mut ds, &mut us, &mut hall, string(b"B"), string(b"p"), OCC_FARMER, &clk, sc.ctx());
        agent_system::mint_agent(&mut ds, &mut us, &mut hall, string(b"C"), string(b"p"), OCC_FARMER, &clk, sc.ctx());
        // 4th mint exceeds MAX_AGENTS_PER_PLAYER = 3
        agent_system::mint_agent(&mut ds, &mut us, &mut hall, string(b"D"), string(b"p"), OCC_FARMER, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(hall);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // life_system::move_to + lazy energy decay
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_move_to_updates_location_and_decays_energy() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        // 10 decay periods after last_action_ms=1000 → energy 100 → 90
        clock::set_for_testing(&mut clk, 1000 + 10 * ENERGY_DECAY_MS);
        life_system::move_to(&ds, &mut us, id, KIND_FARM, 12, 34, 5, &clk, &mut ctx);

        assert!(agent::get_location(&us, id) == KIND_FARM, 0);
        assert!(agent::get_energy(&us, id) == 90, 1);
        assert!(agent::get_last_action_ms(&us, id) == 1000 + 10 * ENERGY_DECAY_MS, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_move_to_fails_unknown_location() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);
        let clk = clock::create_for_testing(&mut ctx);

        life_system::move_to(&ds, &mut us, id, 7, 0, 0, 0, &clk, &mut ctx); // no kind 7

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // life_system::work
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_work_pays_wage_and_costs_energy() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000); // no decay since spawn
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        // mood 60 < 70 → no bonus; wage 10 + random tip 0..4
        let earned = gold::get(&us);
        assert!(earned >= 10 && earned <= 10 + WORK_RANDOM_BONUS_MAX, 0);
        assert!(profile::get_total_earned(&us) == earned, 1);
        assert!(agent::get_energy(&us, id) == 100 - WORK_ENERGY_COST, 2);
        assert!(agent::get_mood(&us, id) == 55, 3);        // 60 - 5
        assert!(agent::get_last_work_ms(&us, id) == 1000, 4);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    fun test_work_mood_bonus_boosts_wage() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());
        agent::set_mood(&mut us, id, 80, sc.ctx()); // ≥ 70 → +20%

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        let earned = gold::get(&us); // 10 * 120/100 = 12, + tip 0..4
        assert!(earned >= 12 && earned <= 12 + WORK_RANDOM_BONUS_MAX, 0);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    fun test_work_festival_doubles_wage() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());
        town_config::set_festival_until(&mut ds, 999_999);

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        let earned = gold::get(&us); // 10 * 200/100 = 20, + tip 0..4
        assert!(earned >= 20 && earned <= 20 + WORK_RANDOM_BONUS_MAX, 0);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_work_fails_wrong_building_for_occupation() {
        let (mut sc, mut ds) = begin_town();
        // Barista cannot work at the farm.
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_BARISTA, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());

        let clk = clock::create_for_testing(sc.ctx());
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_work_fails_when_not_at_workplace() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx()); // location = outdoors

        let clk = clock::create_for_testing(sc.ctx());
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_work_fails_during_cooldown() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());
        // Second shift 1 ms later — cooldown (60s) still active.
        clock::set_for_testing(&mut clk, 1001);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_work_fails_exhausted() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());
        agent::set_energy(&mut us, id, WORK_ENERGY_COST - 1, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // life_system::eat
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_eat_pays_building_and_restores_energy() {
        let (mut sc, mut ds) = begin_town();
        let mut cafe = make_building(&mut sc, &mut ds, b"cafe", KIND_CAFE, 12, 5);
        let mut us = setup_player(ADMIN, 100, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_CAFE, sc.ctx());
        agent::set_energy(&mut us, id, 30, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::eat(&ds, &mut us, &mut cafe, id, &clk, sc.ctx());

        assert!(gold::get(&us) == 95, 0);                       // 100 - 5
        assert!(building::get_gold(&cafe) == 5, 1);             // meal price banked
        assert!(agent::get_energy(&us, id) == 30 + EAT_ENERGY_GAIN, 2);
        assert!(agent::get_mood(&us, id) == 65, 3);             // 60 + 5

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(cafe);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    fun test_eat_energy_clamped_at_max() {
        let (mut sc, mut ds) = begin_town();
        let mut cafe = make_building(&mut sc, &mut ds, b"cafe", KIND_CAFE, 12, 5);
        let mut us = setup_player(ADMIN, 100, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_CAFE, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::eat(&ds, &mut us, &mut cafe, id, &clk, sc.ctx());

        assert!(agent::get_energy(&us, id) == 100, 0); // clamped, not 140

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(cafe);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_eat_fails_at_non_restaurant() {
        let (mut sc, mut ds) = begin_town();
        let mut farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 5);
        let mut us = setup_player(ADMIN, 100, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());

        let clk = clock::create_for_testing(sc.ctx());
        life_system::eat(&ds, &mut us, &mut farm, id, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_eat_fails_insufficient_gold() {
        let (mut sc, mut ds) = begin_town();
        let mut cafe = make_building(&mut sc, &mut ds, b"cafe", KIND_CAFE, 12, 5);
        let mut us = setup_player(ADMIN, 4, sc.ctx()); // price is 5
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_CAFE, sc.ctx());

        let clk = clock::create_for_testing(sc.ctx());
        life_system::eat(&ds, &mut us, &mut cafe, id, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(cafe);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // life_system::sleep
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_sleep_restores_full_energy() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);
        agent::set_energy(&mut us, id, 5, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 2000);
        life_system::sleep(&ds, &mut us, id, &clk, &mut ctx);

        assert!(agent::get_energy(&us, id) == 100, 0);
        assert!(agent::get_mood(&us, id) == 62, 1);   // 60 + 2
        assert!(agent::get_last_sleep_ms(&us, id) == 2000, 2);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_sleep_fails_during_cooldown() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 2000);
        life_system::sleep(&ds, &mut us, id, &clk, &mut ctx);
        // One ms before the cooldown expires.
        clock::set_for_testing(&mut clk, 2000 + SLEEP_COOLDOWN_MS - 1);
        life_system::sleep(&ds, &mut us, id, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // social_system::talk (both relationship edges via world permit)
    // ═════════════════════════════════════════════════════════════════════════

    const SPEAKER:  address = @0xA1;
    const LISTENER: address = @0xB2;

    /// Two players inside the world permit, each with one agent. Uses a
    /// scenario because writes to each UserStorage must be signed by its own
    /// canonical owner. Ends with the sender switched back to SPEAKER.
    fun setup_social_pair(): (
        Scenario, DappStorage, UserStorage, UserStorage,
        dubhe::dapp_service::ScenePermit<world::World>, address, address,
    ) {
        let mut sc = test_scenario::begin(SPEAKER);
        let ds = setup_town(sc.ctx());
        let mut speaker_us = setup_player(SPEAKER, STARTING_GOLD, sc.ctx());
        let speaker = spawn_agent(&mut speaker_us, OCC_FARMER, 1000, sc.ctx());
        let permit = world::new_world(
            &ds,
            vector[SPEAKER, LISTENER],
            std::option::none(),
            std::option::none(),
            sc.ctx(),
        );

        sc.next_tx(LISTENER);
        let mut listener_us = setup_player(LISTENER, STARTING_GOLD, sc.ctx());
        let listener = spawn_agent(&mut listener_us, OCC_BARISTA, 1000, sc.ctx());

        sc.next_tx(SPEAKER);
        (sc, ds, speaker_us, listener_us, permit, speaker, listener)
    }

    fun teardown_social_pair(
        sc: Scenario,
        ds: DappStorage,
        s_us: UserStorage,
        l_us: UserStorage,
        permit: dubhe::dapp_service::ScenePermit<world::World>,
    ) {
        std::unit_test::destroy(permit);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(s_us);
        std::unit_test::destroy(l_us);
        sc.end();
    }

    #[test]
    fun test_talk_updates_both_relationship_edges() {
        let (mut sc, ds, mut s_us, mut l_us, permit, speaker, listener) = setup_social_pair();

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        social_system::talk(
            &ds, &mut s_us, &mut l_us, &permit,
            speaker, listener, string(b"hello neighbour!"), &clk, sc.ctx(),
        );

        // Speaker-side edge (own write)
        let (aff_s, int_s) = relationship::get(&s_us, speaker, listener);
        assert!(aff_s == BASE_AFFINITY + TALK_AFFINITY_GAIN, 0);
        assert!(int_s == 1, 1);
        // Listener-side edge (reactive write into the other player's storage)
        let (aff_l, int_l) = relationship::get(&l_us, listener, speaker);
        assert!(aff_l == BASE_AFFINITY + TALK_AFFINITY_GAIN, 2);
        assert!(int_l == 1, 3);
        // Speaker pays energy, gains mood
        assert!(agent::get_energy(&s_us, speaker) == 100 - TALK_ENERGY_COST, 4);
        assert!(agent::get_mood(&s_us, speaker) == 63, 5);

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    #[test]
    fun test_talk_twice_accumulates_affinity() {
        let (mut sc, ds, mut s_us, mut l_us, permit, speaker, listener) = setup_social_pair();

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        social_system::talk(&ds, &mut s_us, &mut l_us, &permit, speaker, listener, string(b"hi"), &clk, sc.ctx());
        social_system::talk(&ds, &mut s_us, &mut l_us, &permit, speaker, listener, string(b"again"), &clk, sc.ctx());

        let (aff_s, int_s) = relationship::get(&s_us, speaker, listener);
        assert!(aff_s == BASE_AFFINITY + 2 * TALK_AFFINITY_GAIN, 0);
        assert!(int_s == 2, 1);

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    #[test]
    #[expected_failure]
    fun test_talk_fails_to_self() {
        let (mut sc, ds, mut s_us, mut l_us, permit, speaker, _listener) = setup_social_pair();

        let clk = clock::create_for_testing(sc.ctx());
        // Same agent id on both sides → cannot_socialize_self (agent lookup in
        // the listener storage fails first, which also aborts).
        social_system::talk(&ds, &mut s_us, &mut l_us, &permit, speaker, speaker, string(b"me"), &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    #[test]
    #[expected_failure]
    fun test_talk_fails_when_not_at_same_location() {
        let (mut sc, ds, mut s_us, mut l_us, permit, speaker, listener) = setup_social_pair();
        // Speaker walks to the cafe while the listener stays outdoors.
        agent::set_location(&mut s_us, speaker, 3, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        social_system::talk(&ds, &mut s_us, &mut l_us, &permit, speaker, listener, string(b"hi?"), &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    #[test]
    #[expected_failure]
    fun test_gift_fails_when_not_at_same_location() {
        let (mut sc, ds, mut s_us, mut l_us, permit, giver, receiver) = setup_social_pair();
        let item_id = sc.ctx().fresh_object_address();
        item::mint(&mut s_us, item_id, 1, 88, sc.ctx());
        agent::set_location(&mut s_us, giver, 4, sc.ctx());

        let clk = clock::create_for_testing(sc.ctx());
        social_system::gift_item(&ds, &mut s_us, &mut l_us, &permit, giver, receiver, item_id, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    #[test]
    #[expected_failure]
    fun test_talk_fails_exhausted_speaker() {
        let (mut sc, ds, mut s_us, mut l_us, permit, speaker, listener) = setup_social_pair();
        agent::set_energy(&mut s_us, speaker, TALK_ENERGY_COST - 1, sc.ctx());

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        social_system::talk(&ds, &mut s_us, &mut l_us, &permit, speaker, listener, string(b"..."), &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // social_system::gift_item
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_gift_item_moves_item_and_boosts_affinity() {
        let (mut sc, ds, mut s_us, mut l_us, permit, giver, receiver) = setup_social_pair();

        let item_id = sc.ctx().fresh_object_address();
        item::mint(&mut s_us, item_id, 1, 88, sc.ctx()); // bread, quality 88

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        social_system::gift_item(
            &ds, &mut s_us, &mut l_us, &permit, giver, receiver, item_id, &clk, sc.ctx(),
        );

        // Item moved across players, preserving its fields.
        assert!(!item::has(&s_us, item_id), 0);
        assert!(item::has(&l_us, item_id), 1);
        let (kind, quality) = item::get(&l_us, item_id);
        assert!(kind == 1 && quality == 88, 2);

        // Affinity boosted on both sides.
        let (aff_s, _) = relationship::get(&s_us, giver, receiver);
        let (aff_l, _) = relationship::get(&l_us, receiver, giver);
        assert!(aff_s == BASE_AFFINITY + GIFT_AFFINITY_GAIN, 3);
        assert!(aff_l == BASE_AFFINITY + GIFT_AFFINITY_GAIN, 4);
        // Giver enjoys giving.
        assert!(agent::get_mood(&s_us, giver) == 64, 5); // 60 + 4

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    #[test]
    #[expected_failure]
    fun test_gift_item_fails_unowned_item() {
        let (mut sc, ds, mut s_us, mut l_us, permit, giver, receiver) = setup_social_pair();

        let clk = clock::create_for_testing(sc.ctx());
        social_system::gift_item(
            &ds, &mut s_us, &mut l_us, &permit, giver, receiver, @0x123, &clk, sc.ctx(),
        );

        clock::destroy_for_testing(clk);
        teardown_social_pair(sc, ds, s_us, l_us, permit);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // town_system::tick
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_tick_advances_day() {
        let (mut sc, mut ds) = begin_town();
        sc.next_tx(ADMIN);
        let rng = sc.take_shared<Random>();

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, DAY_LENGTH_MS + 1);
        town_system::tick(&mut ds, &rng, &clk, sc.ctx());

        assert!(town_config::get_day(&ds) == 2, 0);
        assert!(town_config::get_day_start_ms(&ds) == DAY_LENGTH_MS + 1, 1);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        sc.end();
    }

    #[test]
    fun test_tick_opens_election_every_third_day() {
        let (mut sc, mut ds) = begin_town();
        sc.next_tx(ADMIN);
        let rng = sc.take_shared<Random>();
        let mut clk = clock::create_for_testing(sc.ctx());

        // Advance day 1 → 2 → 3; the day-3 tick opens an election.
        let mut t = DAY_LENGTH_MS + 1;
        clock::set_for_testing(&mut clk, t);
        town_system::tick(&mut ds, &rng, &clk, sc.ctx());
        t = t + DAY_LENGTH_MS;
        clock::set_for_testing(&mut clk, t);
        town_system::tick(&mut ds, &rng, &clk, sc.ctx());

        assert!(town_config::get_day(&ds) == 3, 0);
        assert!(election_state::get_round(&ds) == 1, 1);
        assert!(election_state::get_ends_at(&ds) == t + DAY_LENGTH_MS, 2);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_tick_fails_before_day_end() {
        let (mut sc, mut ds) = begin_town();
        sc.next_tx(ADMIN);
        let rng = sc.take_shared<Random>();

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, DAY_LENGTH_MS + 1);
        town_system::tick(&mut ds, &rng, &clk, sc.ctx());
        // Immediately ticking again must fail: the new day just started.
        town_system::tick(&mut ds, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        sc.end();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // town events (rolled by tick, applied by life_system)
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_tick_rolls_town_event() {
        let (mut sc, mut ds) = begin_town();
        sc.next_tx(ADMIN);
        let rng = sc.take_shared<Random>();

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, DAY_LENGTH_MS + 1);
        town_system::tick(&mut ds, &rng, &clk, sc.ctx());

        // The roll is random, but a record for the new day is always written
        // and its kind is a valid EventKind.
        assert!(town_event::get_started_day(&ds) == 2, 0);
        assert!(town_event::get_kind(&ds) <= EVENT_MERCHANT, 1);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        sc.end();
    }

    #[test]
    fun test_market_day_boosts_wage() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());
        town_event::set(&mut ds, EVENT_MARKET_DAY, 999_999, 150, 1);

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        let earned = gold::get(&us); // 10 * 150/100 = 15, + tip 0..4
        assert!(earned >= 15 && earned <= 15 + WORK_RANDOM_BONUS_MAX, 0);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_storm_blocks_farm_work() {
        let (mut sc, mut ds) = begin_town();
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_FARM, sc.ctx());
        town_event::set(&mut ds, EVENT_STORM, 999_999, 0, 1);

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &farm, id, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    fun test_storm_spares_indoor_work_and_expires() {
        let (mut sc, mut ds) = begin_town();
        let cafe = make_building(&mut sc, &mut ds, b"cafe", KIND_CAFE, 12, 5);
        let farm = make_building(&mut sc, &mut ds, b"farm", KIND_FARM, 10, 0);
        let rng = sc.take_shared<Random>();
        let mut us = setup_player(ADMIN, 0, sc.ctx());

        // The cafe is indoors: a barista works straight through the storm.
        let barista = spawn_agent(&mut us, OCC_BARISTA, 1000, sc.ctx());
        agent::set_location(&mut us, barista, KIND_CAFE, sc.ctx());
        town_event::set(&mut ds, EVENT_STORM, 999_999, 0, 1);
        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::work(&ds, &mut us, &cafe, barista, &rng, &clk, sc.ctx());
        assert!(gold::get(&us) >= 12, 0);

        // Once the storm has passed, the farm reopens.
        let farmer = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, farmer, KIND_FARM, sc.ctx());
        town_event::set(&mut ds, EVENT_STORM, 2000, 0, 1);
        clock::set_for_testing(&mut clk, 2001);
        life_system::work(&ds, &mut us, &farm, farmer, &rng, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(cafe);
        test_scenario::return_shared(farm);
        test_scenario::return_shared(rng);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    fun test_merchant_halves_meal_price() {
        let (mut sc, mut ds) = begin_town();
        let mut cafe = make_building(&mut sc, &mut ds, b"cafe", KIND_CAFE, 12, 10);
        let mut us = setup_player(ADMIN, 100, sc.ctx());
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        agent::set_location(&mut us, id, KIND_CAFE, sc.ctx());
        town_event::set(&mut ds, EVENT_MERCHANT, 999_999, 50, 1);

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        life_system::eat(&ds, &mut us, &mut cafe, id, &clk, sc.ctx());

        assert!(gold::get(&us) == 95, 0);           // 100 - 10*50/100
        assert!(building::get_gold(&cafe) == 5, 1);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(cafe);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // town_system: nominate / vote / close_election / start_festival
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_full_election_cycle_elects_mayor() {
        let (mut sc, mut ds) = begin_town();
        let mut hall = make_building(&mut sc, &mut ds, b"town_hall", KIND_TOWN_HALL, 0, 0);
        let mut us = setup_player(ADMIN, STARTING_GOLD, sc.ctx());
        let candidate = spawn_agent(&mut us, OCC_FARMER, 1000, sc.ctx());
        let voter = spawn_agent(&mut us, OCC_BARISTA, 1000, sc.ctx());

        // Open round 1 directly (tick pathway covered separately).
        election_state::set(&mut ds, 1, 10_000, @0x0, @0x0, 0, 0);

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, 1000);
        town_system::nominate(&mut ds, &mut us, &mut hall, candidate, &clk, sc.ctx());
        assert!(election_state::get_candidate_a(&ds) == candidate, 0);
        assert!(building::get_gold(&hall) == NOMINATION_FEE, 1);
        assert!(gold::get(&us) == STARTING_GOLD - NOMINATION_FEE, 2);

        town_system::vote(&mut ds, &mut us, voter, candidate, &clk, sc.ctx());
        assert!(election_state::get_votes_a(&ds) == 1, 3);
        assert!(vote_record::has(&us, 1, voter), 4);

        // Close after ends_at.
        clock::set_for_testing(&mut clk, 10_000);
        town_system::close_election(&mut ds, &us, &clk, sc.ctx());
        assert!(town_config::get_mayor_agent(&ds) == candidate, 5);
        assert!(town_config::get_mayor_owner(&ds) == ADMIN, 6);
        assert!(election_state::get_ends_at(&ds) == 0, 7);

        // The new mayor throws a festival from the TownHall treasury.
        building::add_gold(&mut hall, 100);
        town_system::start_festival(&mut ds, &us, &mut hall, &clk, sc.ctx());
        assert!(building::get_gold(&hall) == NOMINATION_FEE + 100 - FESTIVAL_COST, 8);
        assert!(town_config::get_festival_until(&ds) > 10_000, 9);

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(hall);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_vote_twice_with_same_agent_fails() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let candidate = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);
        let voter = spawn_agent(&mut us, OCC_BARISTA, 1000, &mut ctx);
        election_state::set(&mut ds, 1, 10_000, candidate, @0x0, 0, 0);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        town_system::vote(&mut ds, &mut us, voter, candidate, &clk, &mut ctx);
        town_system::vote(&mut ds, &mut us, voter, candidate, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_vote_fails_for_non_candidate() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let candidate = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);
        let voter = spawn_agent(&mut us, OCC_BARISTA, 1000, &mut ctx);
        election_state::set(&mut ds, 1, 10_000, candidate, @0x0, 0, 0);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 1000);
        town_system::vote(&mut ds, &mut us, voter, @0x999, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_close_election_fails_while_active() {
        let mut ctx = sui::tx_context::dummy();
        let mut ds = setup_town(&mut ctx);
        let us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        election_state::set(&mut ds, 1, 10_000, @0x0, @0x0, 0, 0);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 9_999); // 1 ms before ends_at
        town_system::close_election(&mut ds, &us, &clk, &mut ctx);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }

    #[test]
    #[expected_failure]
    fun test_start_festival_fails_for_non_mayor() {
        let (mut sc, mut ds) = begin_town();
        let mut hall = make_building(&mut sc, &mut ds, b"town_hall", KIND_TOWN_HALL, 0, 0);
        let us = setup_player(ADMIN, STARTING_GOLD, sc.ctx());
        building::add_gold(&mut hall, 100);

        let clk = clock::create_for_testing(sc.ctx());
        // No mayor has ever been elected (mayor_owner == @0x0).
        town_system::start_festival(&mut ds, &us, &mut hall, &clk, sc.ctx());

        clock::destroy_for_testing(clk);
        test_scenario::return_shared(hall);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // agent_system::update_memory
    // ═════════════════════════════════════════════════════════════════════════

    #[test]
    fun test_update_memory_persists_digest() {
        let mut ctx = sui::tx_context::dummy();
        let ds = setup_town(&mut ctx);
        let mut us = setup_player(ctx.sender(), STARTING_GOLD, &mut ctx);
        let id = spawn_agent(&mut us, OCC_FARMER, 1000, &mut ctx);
        memory_digest::mint(&mut us, id, string(b""), 1000, &mut ctx);

        let mut clk = clock::create_for_testing(&mut ctx);
        clock::set_for_testing(&mut clk, 5000);
        agent_system::update_memory(
            &ds, &mut us, id, string(b"met Bob at the cafe; likes fishing"), &clk, &mut ctx,
        );

        let (digest, updated_at) = memory_digest::get(&us, id);
        assert!(digest == string(b"met Bob at the cafe; likes fishing"), 0);
        assert!(updated_at == 5000, 1);

        clock::destroy_for_testing(clk);
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
    }
}
