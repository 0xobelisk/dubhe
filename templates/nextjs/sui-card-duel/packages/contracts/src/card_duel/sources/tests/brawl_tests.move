/// Tests for the multiplayer brawl (open-invite ScenePermit, dynamic join /
/// leave, elimination order and last-player-standing settlement).
///
/// Economy facts (deploy_hook defaults):
///   starting_gold=500  rake_bps=300 (3%)  max_hp=30  turn_timeout_ms=300_000
/// Starter deck (in order): Strike(12) Strike(12) Strike(12) Fireball(18) Shield(8)
/// Brawl cards are reusable every turn (unlike duels).
#[test_only]
module card_duel::brawl_tests {
    use sui::clock;
    use sui::test_scenario;
    use dubhe::dapp_service::{ScenePermit, SceneStorage, ObjectStorage};
    use card_duel::test_helpers;
    use card_duel::brawl_system;
    use card_duel::gold;
    use card_duel::profile;
    use card_duel::deck;
    use card_duel::battle_state;
    use card_duel::brawl::{Self, Brawl};
    use card_duel::brawl_permit::BrawlPermit;
    use card_duel::arena::{Self, Arena};

    const A: address = @0xA11CE;
    const B: address = @0xB0B;
    const C: address = @0xCA01;
    const D: address = @0xDA4E;

    const FEE: u64 = 50;
    const STARTING_GOLD: u64 = 500;
    const MAX_HP: u64 = 30;
    const TURN_TIMEOUT_MS: u64 = 5 * 60 * 1000;

    // ─── Full happy path ────────────────────────────────────────────────────

    /// host opens room → 2 players join → eliminations → winner takes the pot.
    #[test]
    fun test_brawl_full_flow_three_players() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let mut us_c = test_helpers::new_player(&mut sc, &ds, C);
        let deck_a = deck::get(&us_a);
        let deck_b = deck::get(&us_b);
        let fireball_a = *deck_a.borrow(3);
        let fireball_b = *deck_b.borrow(3);

        // A opens a 3-player room with a 50 gold entry fee.
        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 3, &clk, sc.ctx());
        assert!(gold::get(&us_a) == STARTING_GOLD - FEE, 0);

        // B and C join through the open-invite permit.
        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        sc.next_tx(C);
        brawl_system::join_brawl(&ds, &mut us_c, &mut permit, &mut scene, sc.ctx());
        assert!(brawl::get_players(&scene).length() == 3, 1);
        assert!(brawl::get_gold(&scene) == 3 * FEE, 2);

        // Host starts: turn order = join order [A, B, C].
        sc.next_tx(A);
        brawl_system::start_brawl(&ds, &us_a, &permit, &mut scene, &clk, sc.ctx());
        assert!(brawl::get_state(&scene) == 1, 3);
        assert!(brawl::get_alive(&scene).length() == 3, 4);

        // A fireballs C (18): C 30 → 12. Turn passes to B.
        sc.next_tx(A);
        brawl_system::brawl_attack(&ds, &mut us_a, &mut us_c, &permit, &mut scene, fireball_a, &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_c) == 12, 5);

        // B fireballs C (18 ≥ 12): C eliminated. Alive [A, B], turn back to A.
        sc.next_tx(B);
        brawl_system::brawl_attack(&ds, &mut us_b, &mut us_c, &permit, &mut scene, fireball_b, &clk, sc.ctx());
        assert!(brawl::get_alive(&scene).length() == 2, 6);
        assert!(battle_state::get_match_id(&us_c) == @0x0, 7);
        let (_, c_losses, _) = profile::get(&us_c);
        assert!(c_losses == 1, 8);

        // A and B trade fireballs (cards are reusable in brawls).
        sc.next_tx(A);
        brawl_system::brawl_attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, fireball_a, &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_b) == 12, 9);
        sc.next_tx(B);
        brawl_system::brawl_attack(&ds, &mut us_b, &mut us_a, &permit, &mut scene, fireball_b, &clk, sc.ctx());
        assert!(battle_state::get_hp(&us_a) == 12, 10);

        // A fireballs B (18 ≥ 12): last player standing → match decided.
        sc.next_tx(A);
        brawl_system::brawl_attack(&ds, &mut us_a, &mut us_b, &permit, &mut scene, fireball_a, &clk, sc.ctx());
        assert!(brawl::get_state(&scene) == 2, 11);
        assert!(brawl::get_winner(&scene) == A, 12);

        // Settlement: pot 150, rake 3% = 4 → arena; 146 → winner.
        sc.next_tx(A);
        let mut arena_obj = test_scenario::take_shared<ObjectStorage<Arena>>(&sc);
        brawl_system::finish_brawl(&ds, &mut us_a, &mut permit, &mut scene, &mut arena_obj, sc.ctx());
        assert!(arena::get_gold(&arena_obj) == 4, 13);
        assert!(gold::get(&us_a) == STARTING_GOLD - FEE + 146, 14);
        let (a_wins, _, a_rating) = profile::get(&us_a);
        assert!(a_wins == 1 && a_rating == 1225, 15);
        assert!(brawl::get_gold(&scene) == 0, 16);

        // Eliminated players exit the permit, then the brawl can be destroyed.
        sc.next_tx(B);
        brawl_system::leave_finished_brawl(&mut permit, &scene, &us_b, sc.ctx());
        sc.next_tx(C);
        brawl_system::leave_finished_brawl(&mut permit, &scene, &us_c, sc.ctx());
        sc.next_tx(D);
        brawl_system::cleanup_brawl(scene, permit, sc.ctx());

        test_scenario::return_shared(arena_obj);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        std::unit_test::destroy(us_c);
        sc.end();
    }

    // ─── Room management ────────────────────────────────────────────────────

    #[test]
    fun test_leave_brawl_refunds_entry_fee() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 3, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        assert!(gold::get(&us_b) == STARTING_GOLD - FEE, 0);

        // B changes their mind: fee refunded, slot freed.
        sc.next_tx(B);
        brawl_system::leave_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        assert!(gold::get(&us_b) == STARTING_GOLD, 1);
        assert!(battle_state::get_match_id(&us_b) == @0x0, 2);
        assert!(brawl::get_players(&scene).length() == 1, 3);
        assert!(brawl::get_gold(&scene) == FEE, 4);

        // Host closes the empty room and reclaims their own fee.
        sc.next_tx(A);
        brawl_system::cancel_brawl(&ds, &mut us_a, &mut permit, &mut scene, sc.ctx());
        assert!(gold::get(&us_a) == STARTING_GOLD, 5);

        sc.next_tx(A);
        brawl_system::cleanup_brawl(scene, permit, sc.ctx());

        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_join_brawl_fails_when_room_full() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let mut us_c = test_helpers::new_player(&mut sc, &ds, C);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 2, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        // Room cap is 2 — the third join must abort.
        sc.next_tx(C);
        brawl_system::join_brawl(&ds, &mut us_c, &mut permit, &mut scene, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        std::unit_test::destroy(us_c);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_host_cannot_leave_open_room() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 3, &clk, sc.ctx());

        // The host must cancel_brawl instead of leaving.
        sc.next_tx(A);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::leave_brawl(&ds, &mut us_a, &mut permit, &mut scene, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_start_brawl_fails_with_single_player() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 3, &clk, sc.ctx());

        sc.next_tx(A);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::start_brawl(&ds, &us_a, &permit, &mut scene, &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        sc.end();
    }

    #[test]
    #[expected_failure]
    fun test_start_brawl_fails_for_non_host() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 3, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        // Only the host can start.
        brawl_system::start_brawl(&ds, &us_b, &permit, &mut scene, &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    // ─── Combat boundaries ──────────────────────────────────────────────────

    #[test]
    #[expected_failure]
    fun test_brawl_attack_fails_out_of_turn() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);
        let deck_b = deck::get(&us_b);

        sc.next_tx(A);
        let clk = clock::create_for_testing(sc.ctx());
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 2, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        sc.next_tx(A);
        brawl_system::start_brawl(&ds, &us_a, &permit, &mut scene, &clk, sc.ctx());

        // Turn 0 belongs to A (the host) — B attacking must abort.
        sc.next_tx(B);
        brawl_system::brawl_attack(&ds, &mut us_b, &mut us_a, &permit, &mut scene, *deck_b.borrow(0), &clk, sc.ctx());

        test_scenario::return_shared(scene);
        test_scenario::return_shared(permit);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    fun test_brawl_surrender_decides_two_player_match() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        // Free room: demonstrates a zero-fee brawl (no escrow, no rake).
        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        brawl_system::create_brawl(&ds, &mut us_a, 0, 2, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        sc.next_tx(A);
        brawl_system::start_brawl(&ds, &us_a, &permit, &mut scene, &clk, sc.ctx());

        // B quits: A is the last player standing.
        sc.next_tx(B);
        brawl_system::brawl_surrender(&ds, &mut us_b, &mut permit, &mut scene, &clk, sc.ctx());
        assert!(brawl::get_state(&scene) == 2, 0);
        assert!(brawl::get_winner(&scene) == A, 1);
        let (_, b_losses, _) = profile::get(&us_b);
        assert!(b_losses == 1, 2);

        sc.next_tx(A);
        let mut arena_obj = test_scenario::take_shared<ObjectStorage<Arena>>(&sc);
        brawl_system::finish_brawl(&ds, &mut us_a, &mut permit, &mut scene, &mut arena_obj, sc.ctx());
        assert!(gold::get(&us_a) == STARTING_GOLD, 3);
        let (a_wins, _, _) = profile::get(&us_a);
        assert!(a_wins == 1, 4);

        sc.next_tx(A);
        brawl_system::cleanup_brawl(scene, permit, sc.ctx());

        test_scenario::return_shared(arena_obj);
        clk.destroy_for_testing();
        std::unit_test::destroy(ds);
        std::unit_test::destroy(us_a);
        std::unit_test::destroy(us_b);
        sc.end();
    }

    #[test]
    fun test_brawl_timeout_kick_removes_stalling_player() {
        let (mut sc, ds) = test_helpers::setup();
        let mut us_a = test_helpers::new_player(&mut sc, &ds, A);
        let mut us_b = test_helpers::new_player(&mut sc, &ds, B);

        sc.next_tx(A);
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(1_000);
        brawl_system::create_brawl(&ds, &mut us_a, FEE, 2, &clk, sc.ctx());

        sc.next_tx(B);
        let mut scene = test_scenario::take_shared<SceneStorage<Brawl>>(&sc);
        let mut permit = test_scenario::take_shared<ScenePermit<BrawlPermit>>(&sc);
        brawl_system::join_brawl(&ds, &mut us_b, &mut permit, &mut scene, sc.ctx());
        sc.next_tx(A);
        brawl_system::start_brawl(&ds, &us_a, &permit, &mut scene, &clk, sc.ctx());

        // It is A's turn; A stalls, so B kicks them after the timeout.
        let started_at = brawl::get_last_action_ms(&scene);
        clk.set_for_testing(started_at + TURN_TIMEOUT_MS + 1);
        sc.next_tx(B);
        brawl_system::brawl_timeout_kick(&ds, &mut us_b, &mut us_a, &permit, &mut scene, &clk, sc.ctx());
        assert!(brawl::get_state(&scene) == 2, 0);
        assert!(brawl::get_winner(&scene) == B, 1);
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
}
