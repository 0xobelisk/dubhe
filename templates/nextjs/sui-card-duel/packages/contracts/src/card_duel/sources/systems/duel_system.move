/// 1v1 duel flow built on ScenePermit (direct invitations) + SceneStorage
/// (stake escrow + turn state) + reactive writes (cross-user combat).
///
/// Lifecycle:
///   create_duel      challenger invites an opponent and escrows the stake
///   accept_duel      opponent accepts the invitation, matches the stake, match starts
///   cancel_duel      challenger reclaims the stake while the invite is pending
///   attack / defend  turn-based card play; damage lands via reactive writes
///   surrender        concede mid-match
///   claim_timeout_win declare victory when the opponent stalls past the timeout
///   finish_duel      winner collects the pot (minus arena rake) and records the win
///   leave_duel       loser exits the permit after the match is decided
///   cleanup_duel     destroy the empty scene + permit (optional hygiene)
module card_duel::duel_system {
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
    use card_duel::duel::{Self, Duel};
    use card_duel::duel_permit::{Self, DuelPermit};
    use card_duel::arena::{Self, Arena};

    /// How long a duel invitation stays open.
    const INVITE_WINDOW_MS: u64 = 24 * 60 * 60 * 1000;
    /// Ladder points exchanged per match.
    const RATING_DELTA: u32 = 25;

    const STATE_WAITING:  u8 = 0;
    const STATE_ACTIVE:   u8 = 1;
    const STATE_FINISHED: u8 = 2;

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /// Challenge `opponent` for `stake` gold. Creates a direct-invitation
    /// ScenePermit (only the opponent can accept) plus the duel SceneStorage,
    /// escrows the challenger's stake and shares both objects.
    public entry fun create_duel(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        opponent:     address,
        stake:        u64,
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
        error::cannot_play_self(opponent != player);
        error::invalid_stake(stake > 0);
        error::insufficient_gold(gold::get(user_storage) >= stake);

        let now = sui::clock::timestamp_ms(clock);

        // Direct invitation: only `opponent` may accept; capacity 2; the
        // permit itself never expires (the invite window does).
        let mut permit = duel_permit::new_duel_permit_with_invitations(
            dapp_storage,
            vector[opponent],
            std::option::some(now + INVITE_WINDOW_MS),
            std::option::none(),
            std::option::some(2),
            ctx,
        );
        // The challenger joins as the first confirmed participant.
        duel_permit::join_duel_permit(&mut permit, user_storage, ctx);

        let mut scene = duel::new_duel_with_permit(dapp_storage, &permit, ctx);
        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(&scene));

        duel::set_challenger(&permit, &mut scene, user_storage, player, ctx);
        duel::set_opponent(&permit, &mut scene, user_storage, opponent, ctx);
        duel::set_stake(&permit, &mut scene, user_storage, stake, ctx);
        duel::set_state(&permit, &mut scene, user_storage, STATE_WAITING, ctx);
        duel::set_turn_addr(&permit, &mut scene, user_storage, @0x0, ctx);
        duel::set_round(&permit, &mut scene, user_storage, 0, ctx);
        duel::set_winner(&permit, &mut scene, user_storage, @0x0, ctx);
        duel::set_used_cards_a(&permit, &mut scene, user_storage, vector::empty(), ctx);
        duel::set_used_cards_b(&permit, &mut scene, user_storage, vector::empty(), ctx);
        duel::set_last_action_ms(&permit, &mut scene, user_storage, now, ctx);

        // Escrow the challenger's stake inside the scene bag.
        gold::transfer_user_to_duel(&permit, user_storage, &mut scene, stake, ctx);

        let max_hp = game_config::get_max_hp(dapp_storage);
        battle_state::set(user_storage, scene_addr, max_hp, 0, ctx);

        duel::share_duel(scene);
        duel_permit::share_duel_permit(permit);
    }

    /// Accept a pending duel invitation: join the permit, match the stake and
    /// start the match. The challenger moves first.
    public entry fun accept_duel(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<DuelPermit>,
        scene:        &mut SceneStorage<Duel>,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        // The invited player is identified by the canonical owner of
        // user_storage; the transaction may be session-signed.
        let player = dapp_service::canonical_owner(user_storage);
        ensure_ready_for_match(user_storage);
        ensure_scene_bound(permit, scene);
        error::match_not_waiting(duel::get_state(scene) == STATE_WAITING);
        error::not_invited(duel::get_opponent(scene) == player);

        // Moves the canonical owner from the invitee list to confirmed participants.
        duel_permit::accept_duel_permit(permit, user_storage, ctx);

        let stake = duel::get_stake(scene);
        error::insufficient_gold(gold::get(user_storage) >= stake);
        gold::transfer_user_to_duel(permit, user_storage, scene, stake, ctx);

        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(scene));
        let max_hp = game_config::get_max_hp(dapp_storage);
        battle_state::set(user_storage, scene_addr, max_hp, 0, ctx);

        let now = sui::clock::timestamp_ms(clock);
        let challenger = duel::get_challenger(scene);
        duel::set_state(permit, scene, user_storage, STATE_ACTIVE, ctx);
        duel::set_turn_addr(permit, scene, user_storage, challenger, ctx);
        duel::set_last_action_ms(permit, scene, user_storage, now, ctx);
    }

    /// Cancel a duel that nobody accepted: the challenger reclaims the stake.
    public entry fun cancel_duel(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<DuelPermit>,
        scene:        &mut SceneStorage<Duel>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);
        error::match_not_waiting(duel::get_state(scene) == STATE_WAITING);
        error::not_challenger(duel::get_challenger(scene) == dapp_service::canonical_owner(user_storage));

        let pot = duel::get_gold(scene);
        duel::set_state(permit, scene, user_storage, STATE_FINISHED, ctx);
        gold::transfer_duel_to_user(permit, scene, user_storage, pot, ctx);
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        duel_permit::leave_duel_permit(permit, user_storage, ctx);
    }

    // ─── Combat ─────────────────────────────────────────────────────────────

    /// Play an attack card (Strike / Fireball) against the opponent. Damage is
    /// written to the opponent's UserStorage through the ScenePermit — the
    /// framework verifies both players are scene participants (reactive write).
    /// A killing blow decides the match on the spot.
    public entry fun attack(
        dapp_storage:     &DappStorage,
        attacker_storage: &mut UserStorage,
        target_storage:   &mut UserStorage,
        permit:           &ScenePermit<DuelPermit>,
        scene:            &mut SceneStorage<Duel>,
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
        error::match_not_active(duel::get_state(scene) == STATE_ACTIVE);
        error::not_your_turn(duel::get_turn_addr(scene) == player);
        error::wrong_match(battle_state::get_match_id(attacker_storage) == scene_addr);
        error::wrong_match(battle_state::get_match_id(target_storage) == scene_addr);

        // The opponent's storage must belong to the other duel player.
        let expected_target = other_player(scene, player);
        error::wrong_match(dapp_service::canonical_owner(target_storage) == expected_target);

        let kind = take_card_for_turn(attacker_storage, permit, scene, player, card_id, ctx);
        error::invalid_card_kind(card_system::is_attack_kind(kind));

        let dmg = (card::get_power(attacker_storage, card_id) as u64);
        let hp = battle_state::get_hp(target_storage);
        let shield = battle_state::get_shield(target_storage);
        let (new_hp, new_shield) = apply_damage(hp, shield, dmg);

        if (new_hp == 0) {
            // Killing blow: decide the match and settle the loser's records
            // while they are still a scene participant.
            duel::set_state(permit, scene, attacker_storage, STATE_FINISHED, ctx);
            duel::set_winner(permit, scene, attacker_storage, player, ctx);
            duel::set_turn_addr(permit, scene, attacker_storage, @0x0, ctx);
            battle_state::set_reactive(permit, attacker_storage, target_storage, @0x0, 0, 0, ctx);
            record_loss_reactive(permit, attacker_storage, target_storage, ctx);
        } else {
            battle_state::set_reactive(
                permit, attacker_storage, target_storage, scene_addr, new_hp, new_shield, ctx,
            );
            duel::set_turn_addr(permit, scene, attacker_storage, expected_target, ctx);
        };

        let round = duel::get_round(scene);
        duel::set_round(permit, scene, attacker_storage, round + 1, ctx);
        duel::set_last_action_ms(permit, scene, attacker_storage, sui::clock::timestamp_ms(clock), ctx);
    }

    /// Play a self-targeted card (Heal / Shield) as the turn action.
    public entry fun defend(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &ScenePermit<DuelPermit>,
        scene:        &mut SceneStorage<Duel>,
        card_id:      address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        let scene_addr = sui::object::uid_to_address(dapp_service::scene_storage_id(scene));
        error::match_not_active(duel::get_state(scene) == STATE_ACTIVE);
        error::not_your_turn(duel::get_turn_addr(scene) == player);
        error::wrong_match(battle_state::get_match_id(user_storage) == scene_addr);

        let kind = take_card_for_turn(user_storage, permit, scene, player, card_id, ctx);
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

        let next_turn = other_player(scene, player);
        let round = duel::get_round(scene);
        duel::set_turn_addr(permit, scene, user_storage, next_turn, ctx);
        duel::set_round(permit, scene, user_storage, round + 1, ctx);
        duel::set_last_action_ms(permit, scene, user_storage, sui::clock::timestamp_ms(clock), ctx);
    }

    /// Concede the match. The opponent becomes the winner and can collect the
    /// pot with finish_duel.
    public entry fun surrender(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<DuelPermit>,
        scene:        &mut SceneStorage<Duel>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        error::match_not_active(duel::get_state(scene) == STATE_ACTIVE);
        error::not_in_match(is_duel_player(scene, player));

        let winner = other_player(scene, player);
        duel::set_state(permit, scene, user_storage, STATE_FINISHED, ctx);
        duel::set_winner(permit, scene, user_storage, winner, ctx);
        duel::set_turn_addr(permit, scene, user_storage, @0x0, ctx);

        record_own_loss(user_storage, ctx);
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        duel_permit::leave_duel_permit(permit, user_storage, ctx);
    }

    /// Declare victory when the opponent has stalled past the turn timeout,
    /// or immediately when they have exhausted every card in their deck
    /// (each card can only be played once per duel).
    public entry fun claim_timeout_win(
        dapp_storage:     &DappStorage,
        user_storage:     &mut UserStorage,
        opponent_storage: &mut UserStorage,
        permit:           &ScenePermit<DuelPermit>,
        scene:            &mut SceneStorage<Duel>,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        error::match_not_active(duel::get_state(scene) == STATE_ACTIVE);
        error::not_in_match(is_duel_player(scene, player));
        // It must be the opponent's turn for them to be the one stalling.
        let stalling = duel::get_turn_addr(scene);
        error::not_your_turn(stalling != player);
        error::wrong_match(dapp_service::canonical_owner(opponent_storage) == stalling);

        let now = sui::clock::timestamp_ms(clock);
        let timeout = game_config::get_turn_timeout_ms(dapp_storage);
        let timed_out = now > duel::get_last_action_ms(scene) + timeout;
        error::turn_not_timed_out(timed_out || is_exhausted(opponent_storage, scene, stalling));

        duel::set_state(permit, scene, user_storage, STATE_FINISHED, ctx);
        duel::set_winner(permit, scene, user_storage, player, ctx);
        duel::set_turn_addr(permit, scene, user_storage, @0x0, ctx);
        battle_state::set_reactive(permit, user_storage, opponent_storage, @0x0, 0, 0, ctx);
        record_loss_reactive(permit, user_storage, opponent_storage, ctx);
        duel::set_last_action_ms(permit, scene, user_storage, now, ctx);
    }

    // ─── Settlement ─────────────────────────────────────────────────────────

    /// Winner collects the pot: stake x2 minus the arena rake, then exits the
    /// permit. Demonstrates Scene → User and Scene → Object gold transfers.
    public entry fun finish_duel(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        permit:       &mut ScenePermit<DuelPermit>,
        scene:        &mut SceneStorage<Duel>,
        arena:        &mut ObjectStorage<Arena>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        ensure_scene_bound(permit, scene);

        let player = dapp_service::canonical_owner(user_storage);
        error::match_not_finished(duel::get_state(scene) == STATE_FINISHED);
        error::not_match_winner(duel::get_winner(scene) == player);

        let pot = duel::get_gold(scene);
        let rake = pot * game_config::get_rake_bps(dapp_storage) / 10_000;
        if (rake > 0) {
            arena::transfer_duel_to_arena_gold(permit, scene, arena, user_storage, rake, ctx);
        };
        gold::transfer_duel_to_user(permit, scene, user_storage, pot - rake, ctx);

        // Mark the win and clear the winner's match binding.
        let (wins, losses, rating) = profile::get(user_storage);
        profile::set(user_storage, wins + 1, losses, rating + RATING_DELTA, ctx);
        // Prevent double-claiming the pot.
        duel::set_winner(permit, scene, user_storage, @0x0, ctx);
        battle_state::set(user_storage, @0x0, 0, 0, ctx);
        duel_permit::leave_duel_permit(permit, user_storage, ctx);
    }

    /// Exit the permit after the match has been decided (loser-side cleanup).
    public entry fun leave_duel(
        permit:       &mut ScenePermit<DuelPermit>,
        scene:        &SceneStorage<Duel>,
        user_storage: &UserStorage,
        ctx:          &TxContext,
    ) {
        ensure_scene_bound(permit, scene);
        // Leaving mid-match would break reactive combat writes.
        error::match_not_finished(duel::get_state(scene) == STATE_FINISHED);
        duel_permit::leave_duel_permit(permit, user_storage, ctx);
    }

    /// Destroy a fully settled duel (empty pot, no participants left).
    /// Anyone can call — this is on-chain hygiene, not access-controlled.
    public entry fun cleanup_duel(
        scene:  SceneStorage<Duel>,
        permit: ScenePermit<DuelPermit>,
        _ctx:   &TxContext,
    ) {
        error::match_not_finished(duel::get_state(&scene) == STATE_FINISHED);
        error::invalid_stake(duel::get_gold(&scene) == 0);

        let mut scene = scene;
        // The scene bag must be empty before destroy_typed_scene.
        duel::remove_challenger_system_maintenance(&mut scene);
        duel::remove_opponent_system_maintenance(&mut scene);
        duel::remove_stake_system_maintenance(&mut scene);
        duel::remove_state_system_maintenance(&mut scene);
        duel::remove_turn_addr_system_maintenance(&mut scene);
        duel::remove_round_system_maintenance(&mut scene);
        duel::remove_winner_system_maintenance(&mut scene);
        duel::remove_used_cards_a_system_maintenance(&mut scene);
        duel::remove_used_cards_b_system_maintenance(&mut scene);
        duel::remove_last_action_ms_system_maintenance(&mut scene);
        if (dapp_system::has_scene_field<Duel, u64>(&scene, b"gold")) {
            dapp_system::remove_scene_field_system_maintenance<DappKey, Duel, u64>(
                dapp_key::new(), &mut scene, b"gold",
            );
        };
        duel::destroy_duel(scene);

        // Aborts unless every participant has left.
        dapp_system::destroy_scene_permit<DappKey, DuelPermit>(dapp_key::new(), permit);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    fun ensure_ready_for_match(user_storage: &UserStorage) {
        error::not_registered(profile::has(user_storage));
        error::card_not_in_deck(deck::has(user_storage));
        error::already_in_match(battle_state::get_match_id(user_storage) == @0x0);
    }

    fun ensure_scene_bound(permit: &ScenePermit<DuelPermit>, scene: &SceneStorage<Duel>) {
        let bound = dapp_service::scene_storage_authorized_permit_id(scene);
        error::wrong_match(std::option::is_some(bound));
        error::wrong_match(
            *std::option::borrow(bound)
                == sui::object::uid_to_address(dapp_service::scene_permit_id(permit))
        );
    }

    fun is_duel_player(scene: &SceneStorage<Duel>, addr: address): bool {
        addr == duel::get_challenger(scene) || addr == duel::get_opponent(scene)
    }

    fun other_player(scene: &SceneStorage<Duel>, addr: address): address {
        if (addr == duel::get_challenger(scene)) {
            duel::get_opponent(scene)
        } else {
            duel::get_challenger(scene)
        }
    }

    /// Validate the card for this turn (owned, in deck, unused) and mark it
    /// used on the player's side. Returns the card kind.
    fun take_card_for_turn(
        player_storage: &UserStorage,
        permit:         &ScenePermit<DuelPermit>,
        scene:          &mut SceneStorage<Duel>,
        player:         address,
        card_id:        address,
        ctx:            &TxContext,
    ): u8 {
        error::card_not_found(card::has(player_storage, card_id));
        let deck_ids = deck::get(player_storage);
        error::card_not_in_deck(deck_ids.contains(&card_id));

        let is_challenger = player == duel::get_challenger(scene);
        let mut used = if (is_challenger) {
            duel::get_used_cards_a(scene)
        } else {
            duel::get_used_cards_b(scene)
        };
        error::card_already_used(!used.contains(&card_id));
        used.push_back(card_id);
        if (is_challenger) {
            duel::set_used_cards_a(permit, scene, player_storage, used, ctx);
        } else {
            duel::set_used_cards_b(permit, scene, player_storage, used, ctx);
        };

        card::get_kind(player_storage, card_id)
    }

    /// True if `player` has already used every card of their battle deck in
    /// this duel — they cannot take any further turn action.
    fun is_exhausted(
        player_storage: &UserStorage,
        scene:          &SceneStorage<Duel>,
        player:         address,
    ): bool {
        let used = if (player == duel::get_challenger(scene)) {
            duel::get_used_cards_a(scene)
        } else {
            duel::get_used_cards_b(scene)
        };
        let deck_ids = deck::get(player_storage);
        let mut i = 0;
        while (i < deck_ids.length()) {
            if (!used.contains(deck_ids.borrow(i))) { return false };
            i = i + 1;
        };
        true
    }

    fun apply_damage(hp: u64, shield: u64, dmg: u64): (u64, u64) {
        if (shield >= dmg) {
            (hp, shield - dmg)
        } else {
            let pierce = dmg - shield;
            if (pierce >= hp) { (0, 0) } else { (hp - pierce, 0) }
        }
    }

    fun record_own_loss(user_storage: &mut UserStorage, ctx: &mut TxContext) {
        let (wins, losses, rating) = profile::get(user_storage);
        let new_rating = if (rating > RATING_DELTA) { rating - RATING_DELTA } else { 0 };
        profile::set(user_storage, wins, losses + 1, new_rating, ctx);
    }

    /// Record a loss on the defeated player's profile via reactive write.
    fun record_loss_reactive(
        permit: &ScenePermit<DuelPermit>,
        from:   &mut UserStorage,
        target: &mut UserStorage,
        ctx:    &mut TxContext,
    ) {
        let (wins, losses, rating) = profile::get(target);
        let new_rating = if (rating > RATING_DELTA) { rating - RATING_DELTA } else { 0 };
        profile::set_reactive(permit, from, target, wins, losses + 1, new_rating, ctx);
    }
}
