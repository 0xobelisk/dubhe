/// Boundary + full-flow tests for player registration, deck management and
/// the 1v1 duel lifecycle (invite → accept → reactive combat → settlement).
///
/// Economy facts (deploy_hook defaults):
///   starting_gold=500  pack_price=100  rake_bps=300 (3%)  max_hp=30
///   turn_timeout_ms=300_000 (5 min)
/// Starter deck (in order): Strike(12) Strike(12) Strike(12) Fireball(18) Shield(8)
#[test_only]
module card_duel::duel_tests {
    use sui::clock;
    use sui::test_scenario;
    use dubhe::dapp_service::{ScenePermit, SceneStorage, ObjectStorage};
    use card_duel::test_helpers;
    use card_duel::init_test;
    use card_duel::player_system;
    use card_duel::card_system;
    use card_duel::duel_system;
    use card_duel::gold;
    use card_duel::profile;
    use card_duel::deck;
    use card_duel::card;
    use card_duel::battle_state;
    use card_duel::duel::{Self, Duel};
    use card_duel::duel_permit::DuelPermit;
    use card_duel::arena::{Self, Arena};

    const A: address = @0xA11CE;
    const B: address = @0xB0B;
    const C: address = @0xCA01;

    const STAKE: u64 = 100;
    const STARTING_GOLD: u64 = 500;
    const MAX_HP: u64 = 30;
    const TURN_TIMEOUT_MS: u64 = 5 * 60 * 1000;

    // ─── Registration ───────────────────────────────────────────────────────

    #[test]
    fun test_register_grants_gold_deck_profile() {
        let (mut sc, ds) = test_helpers::setup();
        let us = test_helpers::new_player(&mut sc, &ds, A);

        assert!(gold::get(&us) == STARTING_GOLD, 0);
        let (wins, losses, rating) = profile::get(&us);
        assert!(wins == 0 && losses == 0 && rating == 1200, 1);
        assert!(battle_state::get_match_id(&us) == @0x0, 2);

        let deck_ids = deck::get(&us);
        assert!(deck_ids.length() == 5, 3);
        // Every deck card must be owned.
        let mut i = 0;
        while (i < 5) {
            assert!(card::has(&us, *deck_ids.borrow(i)), 4);
            i = i + 1;
        };
        // Starter composition: Strike Strike Strike Fireball Shield
        assert!(card::get_kind(&us, *deck_ids.borrow(0)) == 1, 5);
        assert!(card::get_kind(&us, *deck_ids.borrow(3)) == 2, 6);
        assert!(card::get_kind(&us, *deck_ids.borrow(4)) == 4, 7);
        assert!(card::get_power(&us, *deck_ids.borrow(0)) == 12, 8);
        assert!(card::get_power(&us, *deck_ids.borrow(3)) == 18, 9);

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_register_twice_fails() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us = test_helpers::new_player(&mut sc, &ds, A);

        player_system::register(&ds, &mut us, sc.ctx());

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_set_deck_fails_wrong_size() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us = test_helpers::new_player(&mut sc, &ds, A);

        let deck_ids = deck::get(&us);
        let four = vector[
            *deck_ids.borrow(0), *deck_ids.borrow(1), *deck_ids.borrow(2), *deck_ids.borrow(3),
        ];
        card_system::set_deck(&ds, &mut us, four, sc.ctx());

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_set_deck_fails_duplicate_card() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us = test_helpers::new_player(&mut sc, &ds, A);

        let deck_ids = deck::get(&us);
        let first = *deck_ids.borrow(0);
        let dup = vector[
            first, first, *deck_ids.borrow(2), *deck_ids.borrow(3), *deck_ids.borrow(4),
        ];
        card_system::set_deck(&ds, &mut us, dup, sc.ctx());

        std::unit_test::destroy(ds);
        std::unit_test::destroy(us);
        sc.end();
    }

    // ─── Duel: full happy path ──────────────────────────────────────────────

    /// invite → accept → 5 turns of combat → KO → settlement with arena rake.
    #[test]
    fun test_duel_full_flow_with_knockout_and_settlement() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let deck_a = deck::get(&us_a);
        let deck_b = deck::get(&us_b);

        // A invites B with a 100 gold stake.
        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());
        assert!(gold::get(&us_a) == STARTING_GOLD - STAKE, 0);
        assert!(battle_state::get_match_id(&us_a) != @0x0, 1);
        assert!(battle_state::get_hp(&us_a) == MAX_HP, 2);

        // B accepts and matches the stake. Pot is escrowed in the scene bag.
        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());
        assert!(gold::get(&us_b) == STARTING_GOLD - STAKE, 3);
        assert!(duel::get_gold(&scene) == 2 * STAKE, 4);
        assert!(duel::get_state(&scene) == 1, 5);
        assert!(duel::get_turn_addr(&scene) == A, 6);

        // Turn 1 — A strikes (12): B 30 → 18 (reactive cross-user write).
        sc.next_tx(A);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, *deck_a.borrow(0), &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_b) == 18, 7);
        assert!(duel::get_turn_addr(&scene) == B, 8);

        // Turn 2 — B shields (+8).
        sc.next_tx(B);
        duel_system::defend(&ds, &mut us_b, &permit, &mut scene, *deck_b.borrow(4), &clk, sc.ctx());
        assert!(battle_state::get_shield(&us_b) == 8, 9);

        // Turn 3 — A strikes (12): shield absorbs 8, pierce 4 → B 18 → 14.
        sc.next_tx(A);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, *deck_a.borrow(1), &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_b) == 14, 10);
        assert!(battle_state::get_shield(&us_b) == 0, 11);

        // Turn 4 — B strikes (12): A 30 → 18.
        sc.next_tx(B);
        duel_system::attack(&ds, &mut us_b, &mut us_a, &permit, &mut scene, *deck_b.borrow(0), &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_a) == 18, 12);

        // Turn 5 — A fireballs (18 ≥ 14): knockout. Match decided on the spot.
        sc.next_tx(A);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, *deck_a.borrow(3), &clk, sc.ctx());
        assert!(duel::get_state(&scene) == 2, 13);
        assert!(duel::get_winner(&scene) == A, 14);
        // Loser settled reactively: battle reset + loss recorded.
        assert!(battle_state::get_match_id(&us_b) == @0x0, 15);
        let (_, b_losses, b_rating) = profile::get(&us_b);
        assert!(b_losses == 1 && b_rating == 1175, 16);

        // Settlement: pot 200, rake 3% = 6 → arena; 194 → winner.
        sc.next_tx(A);
        let mut arena_obj = test_scenario::take_shared<ObjectStorage<Arena>>(&sc);
        duel_system::finish_duel(&ds, &mut us_a, &mut permit, &mut scene, &mut arena_obj, sc.ctx());
        assert!(arena::get_gold(&arena_obj) == 6, 17);
        assert!(gold::get(&us_a) == STARTING_GOLD - STAKE + 194, 18);
        let (a_wins, _, a_rating) = profile::get(&us_a);
        assert!(a_wins == 1 && a_rating == 1225, 19);
        assert!(battle_state::get_match_id(&us_a) == @0x0, 20);
        assert!(duel::get_gold(&scene) == 0, 21);

        // Loser exits the permit, then anyone can destroy the empty scene+permit.
        sc.next_tx(B);
        duel_system::leave_duel(&mut permit, &scene, &us_b, sc.ctx());
        sc.next_tx(C);
        duel_system::cleanup_duel(scene, permit, sc.ctx());

        test_scenario::return_shared(arena_obj);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    // ─── Duel: session key delegation ───────────────────────────────────────

    /// A session key signs every action for player A; the on-chain identity
    /// (challenger, turn order, winner, permit participant) must always
    /// resolve to the canonical owner A, never to the session address.
    #[test]
    fun test_duel_session_key_plays_for_canonical_owner() {
        let a_session: address = @0x5E55;
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let deck_a = deck::get(&us_a);
        let deck_b = deck::get(&us_b);

        // Bind an active session key to A's storage (test-only shortcut for
        // player_system-level activate_session).
        dubhe::dapp_service::set_session_key_for_testing(&mut us_a, a_session, 999_999_999_999);

        // Session-signed duel creation: challenger must register as A.
        sc.next_tx(a_session);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        assert!(duel::get_challenger(&scene) == A, 0);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());
        // The turn belongs to A (the canonical owner), not the session key.
        assert!(duel::get_turn_addr(&scene) == A, 1);

        // Session-signed fireball (18): B 30 → 12.
        sc.next_tx(a_session);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, *deck_a.borrow(3), &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_b) == 12, 2);
        assert!(duel::get_turn_addr(&scene) == B, 3);

        // B responds from the main wallet: A 30 → 18.
        sc.next_tx(B);
        duel_system::attack(&ds, &mut us_b, &mut us_a, &permit, &mut scene, *deck_b.borrow(0), &clk, sc.ctx());

        // Session-signed strike (12 ≥ 12): knockout — winner is A.
        sc.next_tx(a_session);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, *deck_a.borrow(0), &clk, sc.ctx());
        assert!(duel::get_state(&scene) == 2, 4);
        assert!(duel::get_winner(&scene) == A, 5);

        // Session-signed settlement: the win lands on A's profile.
        sc.next_tx(a_session);
        let mut arena_obj = test_scenario::take_shared<ObjectStorage<Arena>>(&sc);
        duel_system::finish_duel(&ds, &mut us_a, &mut permit, &mut scene, &mut arena_obj, sc.ctx());
        let (a_wins, _, _) = profile::get(&us_a);
        assert!(a_wins == 1, 6);

        sc.next_tx(B);
        duel_system::leave_duel(&mut permit, &scene, &us_b, sc.ctx());
        sc.next_tx(C);
        duel_system::cleanup_duel(scene, permit, sc.ctx());

        test_scenario::return_shared(arena_obj);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    /// A stranger (neither the canonical owner nor the session key of us_a)
    /// must not be able to open a duel on A's behalf.
    #[test]
    #[expected_failure]
    fun test_create_duel_fails_for_unauthorized_signer() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(C);
        let clk = clock::create_for_testing(sc.ctx());
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    // ─── Duel: cancel / surrender / timeout ─────────────────────────────────

    #[test]
    fun test_cancel_duel_refunds_stake() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(A);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::cancel_duel(&ds, &mut us_a, &mut permit, &mut scene, sc.ctx());

        assert!(gold::get(&us_a) == STARTING_GOLD, 0);
        assert!(battle_state::get_match_id(&us_a) == @0x0, 1);
        assert!(duel::get_state(&scene) == 2, 2);

        sc.next_tx(A);
        duel_system::cleanup_duel(scene, permit, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    fun test_surrender_lets_opponent_collect_pot() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());

        // B surrenders without playing a card.
        sc.next_tx(B);
        duel_system::surrender(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        assert!(duel::get_state(&scene) == 2, 0);
        assert!(duel::get_winner(&scene) == A, 1);
        let (_, b_losses, _) = profile::get(&us_b);
        assert!(b_losses == 1, 2);

        sc.next_tx(A);
        let mut arena_obj = test_scenario::take_shared<ObjectStorage<Arena>>(&sc);
        duel_system::finish_duel(&ds, &mut us_a, &mut permit, &mut scene, &mut arena_obj, sc.ctx());
        assert!(gold::get(&us_a) == STARTING_GOLD - STAKE + 194, 3);

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        test_scenario::return_shared(arena_obj);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    fun test_claim_timeout_win_after_stall() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());

        // It is A's turn; A stalls past the timeout, so B claims the win.
        let accepted_at = duel::get_last_action_ms(&scene);
        clk.set_for_testing(accepted_at + TURN_TIMEOUT_MS + 1);
        sc.next_tx(B);
        duel_system::claim_timeout_win(
            &ds, &mut us_b, &mut us_a, &permit, &mut scene, &clk, sc.ctx(),
        );
        assert!(duel::get_state(&scene) == 2, 0);
        assert!(duel::get_winner(&scene) == B, 1);
        // The stalling player is settled reactively.
        assert!(battle_state::get_match_id(&us_a) == @0x0, 2);
        let (_, a_losses, _) = profile::get(&us_a);
        assert!(a_losses == 1, 3);

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_claim_timeout_win_fails_before_timeout() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());

        // Only 1 ms has passed — claim must abort.
        let accepted_at = duel::get_last_action_ms(&scene);
        clk.set_for_testing(accepted_at + 1);
        sc.next_tx(B);
        duel_system::claim_timeout_win(
            &ds, &mut us_b, &mut us_a, &permit, &mut scene, &clk, sc.ctx(),
        );

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    // ─── Duel: failure boundaries ───────────────────────────────────────────

    #[test]
    #[expected_failure]
    fun test_create_duel_fails_against_self() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        duel_system::create_duel(&ds, &mut us_a, A, STAKE, &clk, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_create_duel_fails_zero_stake() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        duel_system::create_duel(&ds, &mut us_a, B, 0, &clk, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_create_duel_fails_insufficient_gold() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        duel_system::create_duel(&ds, &mut us_a, B, STARTING_GOLD + 1, &clk, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_accept_duel_fails_for_uninvited_player() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_c = test_helpers::new_player(&mut sc, &ds, C);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        // C was not invited — accept must abort.
        sc.next_tx(C);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_c, &mut permit, &mut scene, &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_c);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_attack_fails_out_of_turn() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let deck_b = deck::get(&us_b);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());

        // It is A's turn but B attacks — must abort.
        sc.next_tx(B);
        duel_system::attack(&ds, &mut us_b, &mut us_a, &permit, &mut scene, *deck_b.borrow(0), &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_attack_fails_reusing_card_in_same_duel() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let deck_a = deck::get(&us_a);
        let deck_b = deck::get(&us_b);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());

        let strike_a = *deck_a.borrow(0);
        sc.next_tx(A);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, strike_a, &clk, sc.ctx());
        sc.next_tx(B);
        duel_system::attack(&ds, &mut us_b, &mut us_a, &permit, &mut scene, *deck_b.borrow(0), &clk, sc.ctx());
        // A replays the same Strike — must abort (one use per duel).
        sc.next_tx(A);
        duel_system::attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, strike_a, &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_defend_fails_with_attack_card() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let deck_a = deck::get(&us_a);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());

        // Strike is not a defense card — must abort.
        sc.next_tx(A);
        duel_system::defend(&ds, &mut us_a, &permit, &mut scene, *deck_a.borrow(0), &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_create_duel_fails_while_already_in_match() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());
        // Second concurrent duel — must abort (already bound to a match).
        duel_system::create_duel(&ds, &mut us_a, C, STAKE, &clk, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_finish_duel_fails_for_loser() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        duel_system::create_duel(&ds, &mut us_a, B, STAKE, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Duel>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<DuelPermit>>(&sc);
        duel_system::accept_duel(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());
        duel_system::surrender(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());

        // B lost — claiming the pot must abort.
        sc.next_tx(B);
        let mut arena_obj = test_scenario::take_shared<ObjectStorage<Arena>>(&sc);
        duel_system::finish_duel(&ds, &mut us_b, &mut permit, &mut scene, &mut arena_obj, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        test_scenario::return_shared(arena_obj);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }
}
