/// Multiplayer brawl (1vN) built on an open-invite ScenePermit: anyone can
/// join the room until it is full, the pot collects every entry fee, and the
/// last player standing takes it (minus the arena rake).
///
/// Lifecycle:
///   create_brawl   host opens a room with an entry fee and a player cap
///   join_brawl     anyone joins while the room is open (pays the fee)
///   leave_brawl    leave an open room and get the fee back
///   cancel_brawl   host closes an open room once everyone else has left
///   start_brawl    host starts the match with 2+ players
///   brawl_attack   attack any alive player on your turn (cards are reusable)
///   brawl_defend   heal / shield yourself on your turn
///   brawl_surrender / brawl_timeout_kick   leave or remove stalling players
///   finish_brawl   last player standing collects the pot
///   leave_finished_brawl / cleanup_brawl   post-match hygiene
module card_duel::brawl_system {
    use sui::clock::Clock;
    use dubhe::dapp_service::{Self, DappStorage, UserStorage, ScenePermit, SceneStorage, ObjectStorage};
    use dubhe::dapp_system;
    use card_duel::dapp_key;
    use card_duel::dapp_key::DappKey;
    use card_duel::migrate;
    use card_duel::error;
    use card_duel::gold;
    use card_duel::profile;
    use card_duel::battle_state;
    use card_duel::deck;
    use card_duel::card;
    use card_duel::card_system;
    use card_duel::game_config;
    use card_duel::brawl::{Self, Brawl};
    use card_duel::brawl_permit::{Self, BrawlPermit};
    use card_duel::arena::{Self, Arena};

    const RATING_DELTA: u32 = 25;
    const MIN_PLAYERS: u64 = 2;
    const MAX_PLAYERS: u64 = 8;

    const STATE_OPEN:     u8 = 0;
    const STATE_ACTIVE:   u8 = 1;
    const STATE_FINISHED: u8 = 2;

    // ─── Room lifecycle ─────────────────────────────────────────────────────

    /// Open a brawl room. The host pays the entry fee up front; the permit is
    /// open-invite so anyone can join until `max_players` is reached.
    public entry fun create_brawl(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        entry_fee:    u64,
        max_players:  u64,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        // The on-scene player identity is always the canonical owner of
        // user_storage — the transaction itself may be signed by the main
        // wallet or by its active session key.
        let player = dapp_service::canonical_owner(user_storage);
        ensure_ready_for_match(user_storage);
        error::brawl_invalid_max_players(max_players >= MIN_PLAYERS && max_players <= MAX_PLAYERS);
        error::insufficient_gold(gold::get(user_storage) >= entry_fee);

        let now = sui::clock::timestamp_ms(clock);

        // Open-invite permit: the host is the first participant, anyone else
        // can join_brawl_permit until the cap is hit. Never expires.
        let permit = brawl_permit::new_brawl_permit(
            dapp_storage,
            vector[player],
            std::option::none(),
            std::option::some(max_players),
            ctx,
        );

        let mut scene = brawl::new_brawl_with_permit(dapp_storage, &permit, ctx);
        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(&scene));

        brawl::set_host(&permit, &mut scene, user_storage, player, ctx);
        brawl::set_entry_fee(&permit, &mut scene, user_storage, entry_fee, ctx);
        brawl::set_max_players(&permit, &mut scene, user_storage, max_players, ctx);
        brawl::set_state(&permit, &mut scene, user_storage, STATE_OPEN, ctx);
        brawl::set_round(&permit, &mut scene, user_storage, 0, ctx);
        brawl::set_turn_index(&permit, &mut scene, user_storage, 0, ctx);
        brawl::set_players(&permit, &mut scene, user_storage, vector[player], ctx);
        brawl::set_alive(&permit, &mut scene, user_storage, vector::empty(), ctx);
        brawl::set_winner(&permit, &mut scene, user_storage, @0x0, ctx);
        brawl::set_last_action_ms(&permit, &mut scene, user_storage, now, ctx);

        if (entry_fee > 0) {
            gold::transfer_user_to_brawl(&permit, user_storage, &mut scene, entry_fee, ctx);
        };
        let max_hp = game_config::get_max_hp(dapp_storage);
        battle_state::set(user_storage, scene_addr, max_hp, 0, ctx);

        brawl::share_brawl(scene);
        brawl_permit::share_brawl_permit(permit);
    }

    /// Join an open room: become a permit participant and pay the entry fee.
    public entry fun join_brawl(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        // Joining registers the canonical owner of user_storage as the permit
        // participant; the transaction may be session-signed.
        let player = dapp_service::canonical_owner(user_storage);
        ensure_ready_for_match(user_storage);
        ensure_scene_bound(permit, scene);
        error::match_not_waiting(brawl::get_state(scene) == STATE_OPEN);

        let mut players = brawl::get_players(scene);
        error::already_joined(!players.contains(&player));
        error::brawl_full(players.length() < brawl::get_max_players(scene));

        let entry_fee = brawl::get_entry_fee(scene);
        error::insufficient_gold(gold::get(user_storage) >= entry_fee);

        // join_scene_permit also enforces the max_participants cap.
        brawl_permit::join_brawl_permit(permit, user_storage, ctx);
        if (entry_fee > 0) {
            gold::transfer_user_to_brawl(permit, user_storage, scene, entry_fee, ctx);
        };

        players.push_back(player);
        brawl::set_players(permit, scene, user_storage, players, ctx);

        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(scene));
        let max_hp = game_config::get_max_hp(dapp_storage);
        battle_state::set(user_storage, scene_addr, max_hp, 0, ctx);
    }

    /// Leave an open room (non-host): refund the entry fee and exit the permit.
    public entry fun leave_brawl(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);
        error::match_not_waiting(brawl::get_state(scene) == STATE_OPEN);

        let player = dapp_service::canonical_owner(user_storage);
        error::host_cannot_leave(player != brawl::get_host(scene));

        let mut players = brawl::get_players(scene);
        let (found, idx) = players.index_of(&player);
        error::not_in_brawl(found);
        players.remove(idx);

        let entry_fee = brawl::get_entry_fee(scene);
        if (entry_fee > 0) {
            gold::transfer_brawl_to_user(permit, scene, user_storage, entry_fee, ctx);
        };
        brawl::set_players(permit, scene, user_storage, players, ctx);
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        brawl_permit::leave_brawl_permit(permit, user_storage, ctx);
    }

    /// Host closes an open room. Everyone else must have left already.
    public entry fun cancel_brawl(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);
        error::match_not_waiting(brawl::get_state(scene) == STATE_OPEN);

        let player = dapp_service::canonical_owner(user_storage);
        error::brawl_not_host(player == brawl::get_host(scene));

        let players = brawl::get_players(scene);
        error::brawl_too_few_players(players.length() == 1);

        brawl::set_state(permit, scene, user_storage, STATE_FINISHED, ctx);
        brawl::set_players(permit, scene, user_storage, vector::empty(), ctx);
        let pot = brawl::get_gold(scene);
        if (pot > 0) {
            gold::transfer_brawl_to_user(permit, scene, user_storage, pot, ctx);
        };
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        brawl_permit::leave_brawl_permit(permit, user_storage, ctx);
    }

    /// Start the match. Turn order = join order.
    public entry fun start_brawl(
        dapp_storage: &DappStorage,
        user_storage: &UserStorage,
        permit:       &ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        clock:        &Clock,
        ctx:          &TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        ensure_scene_bound(permit, scene);
        error::match_not_waiting(brawl::get_state(scene) == STATE_OPEN);
        error::brawl_not_host(dapp_service::canonical_owner(user_storage) == brawl::get_host(scene));

        let players = brawl::get_players(scene);
        error::brawl_too_few_players(players.length() >= MIN_PLAYERS);

        brawl::set_state(permit, scene, user_storage, STATE_ACTIVE, ctx);
        brawl::set_alive(permit, scene, user_storage, players, ctx);
        brawl::set_turn_index(permit, scene, user_storage, 0, ctx);
        brawl::set_last_action_ms(permit, scene, user_storage, sui::clock::timestamp_ms(clock), ctx);
    }

    // ─── Combat ─────────────────────────────────────────────────────────────

    /// Attack any alive player on your turn. Unlike duels, cards can be
    /// replayed every turn. Eliminating the second-to-last player decides
    /// the brawl immediately.
    public entry fun brawl_attack(
        dapp_storage:     &DappStorage,
        attacker_storage: &mut UserStorage,
        target_storage:   &mut UserStorage,
        permit:           &ScenePermit<BrawlPermit>,
        scene:            &mut SceneStorage<Brawl>,
        card_id:          address,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        ensure_scene_bound(permit, scene);

        // Player identity is the attacker's canonical owner — the transaction
        // may be signed by the main wallet or its active session key.
        let player = dapp_service::canonical_owner(attacker_storage);
        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(scene));
        error::match_not_active(brawl::get_state(scene) == STATE_ACTIVE);

        let alive = brawl::get_alive(scene);
        let turn_index = brawl::get_turn_index(scene);
        error::not_your_turn(*alive.borrow(turn_index) == player);
        error::wrong_match(battle_state::get_match_id(attacker_storage) == scene_addr);
        error::wrong_match(battle_state::get_match_id(target_storage) == scene_addr);

        let target = dapp_service::canonical_owner(target_storage);
        error::cannot_play_self(target != player);
        error::target_not_alive(alive.contains(&target));

        let kind = check_card(attacker_storage, card_id);
        error::invalid_card_kind(card_system::is_attack_kind(kind));

        let dmg = (card::get_power(attacker_storage, card_id) as u64);
        let hp = battle_state::get_hp(target_storage);
        let shield = battle_state::get_shield(target_storage);
        let (new_hp, new_shield) = apply_damage(hp, shield, dmg);

        if (new_hp == 0) {
            battle_state::set_reactive(permit, attacker_storage, target_storage, @0x0, 0, 0, ctx);
            record_loss_reactive(permit, attacker_storage, target_storage, ctx);
            eliminate_and_advance(permit, scene, attacker_storage, target, player, ctx);
        } else {
            battle_state::set_reactive(
                permit, attacker_storage, target_storage, scene_addr, new_hp, new_shield, ctx,
            );
            advance_turn_after(permit, scene, attacker_storage, player, ctx);
        };

        let round = brawl::get_round(scene);
        brawl::set_round(permit, scene, attacker_storage, round + 1, ctx);
        brawl::set_last_action_ms(permit, scene, attacker_storage, sui::clock::timestamp_ms(clock), ctx);
    }

    /// Heal or shield yourself as the turn action.
    public entry fun brawl_defend(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        card_id:      address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(scene));
        error::match_not_active(brawl::get_state(scene) == STATE_ACTIVE);

        let alive = brawl::get_alive(scene);
        let turn_index = brawl::get_turn_index(scene);
        error::not_your_turn(*alive.borrow(turn_index) == player);
        error::wrong_match(battle_state::get_match_id(user_storage) == scene_addr);

        let kind = check_card(user_storage, card_id);
        error::invalid_card_kind(card_system::is_defense_kind(kind));

        let power = (card::get_power(user_storage, card_id) as u64);
        if (kind == card_system::kind_heal()) {
            let max_hp = game_config::get_max_hp(dapp_storage);
            let hp = battle_state::get_hp(user_storage);
            let healed = if (hp + power > max_hp) { max_hp } else { hp + power };
            battle_state::set_hp(user_storage, healed, ctx);
        } else {
            let shield = battle_state::get_shield(user_storage);
            battle_state::set_shield(user_storage, shield + power, ctx);
        };

        advance_turn_after(permit, scene, user_storage, player, ctx);
        let round = brawl::get_round(scene);
        brawl::set_round(permit, scene, user_storage, round + 1, ctx);
        brawl::set_last_action_ms(permit, scene, user_storage, sui::clock::timestamp_ms(clock), ctx);
    }

    /// Drop out of an active brawl. If only one player remains they win.
    public entry fun brawl_surrender(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        error::match_not_active(brawl::get_state(scene) == STATE_ACTIVE);
        error::target_not_alive(brawl::get_alive(scene).contains(&player));

        record_own_loss(user_storage, ctx);
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        eliminate_and_advance(permit, scene, user_storage, player, player, ctx);
        brawl::set_last_action_ms(permit, scene, user_storage, sui::clock::timestamp_ms(clock), ctx);
        brawl_permit::leave_brawl_permit(permit, user_storage, ctx);
    }

    /// Remove the current-turn player once they stall past the turn timeout.
    /// Any alive player can trigger the kick.
    public entry fun brawl_timeout_kick(
        dapp_storage:   &DappStorage,
        kicker_storage: &mut UserStorage,
        target_storage: &mut UserStorage,
        permit:         &ScenePermit<BrawlPermit>,
        scene:          &mut SceneStorage<Brawl>,
        clock:          &Clock,
        ctx:            &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(kicker_storage);
        error::match_not_active(brawl::get_state(scene) == STATE_ACTIVE);
        let alive = brawl::get_alive(scene);
        error::target_not_alive(alive.contains(&player));

        let stalling = *alive.borrow(brawl::get_turn_index(scene));
        error::not_your_turn(stalling != player);
        error::wrong_match(dapp_service::canonical_owner(target_storage) == stalling);

        let now = sui::clock::timestamp_ms(clock);
        let timeout = game_config::get_turn_timeout_ms(dapp_storage);
        error::turn_not_timed_out(now > brawl::get_last_action_ms(scene) + timeout);

        battle_state::set_reactive(permit, kicker_storage, target_storage, @0x0, 0, 0, ctx);
        record_loss_reactive(permit, kicker_storage, target_storage, ctx);
        eliminate_and_advance(permit, scene, kicker_storage, stalling, player, ctx);
        brawl::set_last_action_ms(permit, scene, kicker_storage, now, ctx);
    }

    // ─── Settlement ─────────────────────────────────────────────────────────

    /// Last player standing collects the pot minus the arena rake.
    public entry fun finish_brawl(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<BrawlPermit>,
        scene:        &mut SceneStorage<Brawl>,
        arena:        &mut ObjectStorage<Arena>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        error::match_not_finished(brawl::get_state(scene) == STATE_FINISHED);
        error::not_match_winner(brawl::get_winner(scene) == player);

        let pot = brawl::get_gold(scene);
        let rake = pot * game_config::get_rake_bps(dapp_storage) / 10_000;
        if (rake > 0) {
            arena::transfer_brawl_to_arena_gold(permit, scene, arena, user_storage, rake, ctx);
        };
        if (pot - rake > 0) {
            gold::transfer_brawl_to_user(permit, scene, user_storage, pot - rake, ctx);
        };

        let (wins, losses, rating) = profile::get(user_storage);
        profile::set(user_storage, wins + 1, losses, rating + RATING_DELTA, ctx);
        // Prevent double-claiming the pot.
        brawl::set_winner(permit, scene, user_storage, @0x0, ctx);
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        brawl_permit::leave_brawl_permit(permit, user_storage, ctx);
    }

    /// Eliminated players exit the permit once they are out of the match.
    public entry fun leave_finished_brawl(
        permit:       &mut ScenePermit<BrawlPermit>,
        scene:        &SceneStorage<Brawl>,
        user_storage: &UserStorage,
        ctx:          &TxContext,
    ) {
        ensure_scene_bound(permit, scene);
        let player = dapp_service::canonical_owner(user_storage);
        let out = brawl::get_state(scene) == STATE_FINISHED
            || !brawl::get_alive(scene).contains(&player);
        error::match_not_finished(out);
        brawl_permit::leave_brawl_permit(permit, user_storage, ctx);
    }

    /// Destroy a fully settled brawl (empty pot, no participants left).
    public entry fun cleanup_brawl(
        scene:  SceneStorage<Brawl>,
        permit: ScenePermit<BrawlPermit>,
        _ctx:   &TxContext,
    ) {
        error::match_not_finished(brawl::get_state(&scene) == STATE_FINISHED);
        error::invalid_stake(brawl::get_gold(&scene) == 0);

        let mut scene = scene;
        brawl::remove_host_system_maintenance(&mut scene);
        brawl::remove_entry_fee_system_maintenance(&mut scene);
        brawl::remove_max_players_system_maintenance(&mut scene);
        brawl::remove_state_system_maintenance(&mut scene);
        brawl::remove_round_system_maintenance(&mut scene);
        brawl::remove_turn_index_system_maintenance(&mut scene);
        brawl::remove_players_system_maintenance(&mut scene);
        brawl::remove_alive_system_maintenance(&mut scene);
        brawl::remove_winner_system_maintenance(&mut scene);
        brawl::remove_last_action_ms_system_maintenance(&mut scene);
        if (dapp_system::has_scene_field<Brawl, u64>(&scene, b"gold")) {
            dapp_system::remove_scene_field_system_maintenance<DappKey, Brawl, u64>(
                dapp_key::new(), &mut scene, b"gold",
            );
        };
        brawl::destroy_brawl(scene);

        dapp_system::destroy_scene_permit<DappKey, BrawlPermit>(dapp_key::new(), permit);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    fun ensure_ready_for_match(user_storage: &UserStorage) {
        error::not_registered(profile::has(user_storage));
        error::card_not_in_deck(deck::has(user_storage));
        error::already_in_match(battle_state::get_match_id(user_storage) == @0x0);
    }

    fun ensure_scene_bound(permit: &ScenePermit<BrawlPermit>, scene: &SceneStorage<Brawl>) {
        let bound = dapp_service::scene_storage_authorized_permit_id(scene);
        error::wrong_match(std::option::is_some(bound));
        error::wrong_match(
            *std::option::borrow(bound)
                == sui::object::uid_to_address(dapp_service::scene_permit_id(permit))
        );
    }

    /// Validate the card (owned + in deck) and return its kind.
    /// Brawl cards have no per-match usage limit.
    fun check_card(player_storage: &UserStorage, card_id: address): u8 {
        error::card_not_found(card::has(player_storage, card_id));
        let deck_ids = deck::get(player_storage);
        error::card_not_in_deck(deck_ids.contains(&card_id));
        card::get_kind(player_storage, card_id)
    }

    fun apply_damage(hp: u64, shield: u64, dmg: u64): (u64, u64) {
        if (shield >= dmg) {
            (hp, shield - dmg)
        } else {
            let pierce = dmg - shield;
            if (pierce >= hp) { (0, 0) } else { (hp - pierce, 0) }
        }
    }

    /// Remove `eliminated` from the alive list, fix up the turn pointer so it
    /// lands on the player after `actor`, and decide the match if only one
    /// player remains. `actor_storage` is the acting player's UserStorage,
    /// used to authorize the scene writes.
    fun eliminate_and_advance(
        permit:        &ScenePermit<BrawlPermit>,
        scene:         &mut SceneStorage<Brawl>,
        actor_storage: &UserStorage,
        eliminated:    address,
        actor:         address,
        ctx:           &TxContext,
    ) {
        let mut alive = brawl::get_alive(scene);
        let (found, idx) = alive.index_of(&eliminated);
        error::target_not_alive(found);
        alive.remove(idx);

        if (alive.length() == 1) {
            brawl::set_alive(permit, scene, actor_storage, alive, ctx);
            brawl::set_state(permit, scene, actor_storage, STATE_FINISHED, ctx);
            brawl::set_winner(permit, scene, actor_storage, *alive.borrow(0), ctx);
            brawl::set_turn_index(permit, scene, actor_storage, 0, ctx);
            return
        };

        // Next turn: the player after `actor`; if the actor was the one who
        // left (surrender/kick), the turn passes to the player at the freed slot.
        let (actor_found, actor_idx) = alive.index_of(&actor);
        let next = if (actor_found) {
            (actor_idx + 1) % alive.length()
        } else {
            idx % alive.length()
        };
        brawl::set_alive(permit, scene, actor_storage, alive, ctx);
        brawl::set_turn_index(permit, scene, actor_storage, next, ctx);
    }

    /// Standard turn rotation when nobody was eliminated.
    fun advance_turn_after(
        permit:        &ScenePermit<BrawlPermit>,
        scene:         &mut SceneStorage<Brawl>,
        actor_storage: &UserStorage,
        actor:         address,
        ctx:           &TxContext,
    ) {
        let alive = brawl::get_alive(scene);
        let (_, actor_idx) = alive.index_of(&actor);
        brawl::set_turn_index(permit, scene, actor_storage, (actor_idx + 1) % alive.length(), ctx);
    }

    fun record_own_loss(user_storage: &mut UserStorage, ctx: &mut TxContext) {
        let (wins, losses, rating) = profile::get(user_storage);
        let new_rating = if (rating > RATING_DELTA) { rating - RATING_DELTA } else { 0 };
        profile::set(user_storage, wins, losses + 1, new_rating, ctx);
    }

    fun record_loss_reactive(
        permit: &ScenePermit<BrawlPermit>,
        from:   &mut UserStorage,
        target: &mut UserStorage,
        ctx:    &mut TxContext,
    ) {
        let (wins, losses, rating) = profile::get(target);
        let new_rating = if (rating > RATING_DELTA) { rating - RATING_DELTA } else { 0 };
        profile::set_reactive(permit, from, target, wins, losses + 1, new_rating, ctx);
    }
}
