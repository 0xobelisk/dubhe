/// Town-level mechanics: day ticks, random festivals, mayoral elections and
/// building administration.
///
/// There is no scheduler on-chain: `tick` is a public settlement utility that
/// ANYONE (players, agent runners, bots) can call once the current town day is
/// over. It advances the day counter, rolls a random festival and periodically
/// opens a two-candidate mayoral election. Sequenced by the chain, driven by
/// whoever shows up — the town keeps running as long as one participant is
/// alive.
module ville::town_system {
    use std::ascii::String;
    use sui::clock::Clock;
    use sui::random::{Self, Random};
    use dubhe::dapp_service::{Self, DappStorage, UserStorage, ObjectStorage};
    use dubhe::dapp_system;
    use ville::dapp_key::DappKey;
    use ville::migrate;
    use ville::error;
    use ville::gold;
    use ville::agent;
    use ville::vote_record;
    use ville::town_config;
    use ville::town_event;
    use ville::election_state;
    use ville::building::{Self, Building};

    const KIND_TOWN_HALL: u8 = 1;

    const FESTIVAL_CHANCE_PCT: u8 = 20;      // rolled on every day tick
    const FESTIVAL_MS: u64 = 600_000;        // festivals last 10 minutes
    const FESTIVAL_COST: u64 = 50;           // paid from the TownHall treasury
    const ELECTION_INTERVAL_DAYS: u64 = 3;   // a new election every 3 town days
    const NOMINATION_FEE: u64 = 20;          // paid into the TownHall treasury

    // EventKind constants (mirror the EventKind enum in dubhe.config.ts)
    const EVENT_NONE: u8 = 0;
    const EVENT_MARKET_DAY: u8 = 1;
    const EVENT_STORM: u8 = 2;
    const EVENT_MERCHANT: u8 = 3;

    // Daily event roll (one d100 per tick, ranges are cumulative)
    const MARKET_DAY_CHANCE_PCT: u8 = 20;    // wages ×1.5 all day
    const STORM_CHANCE_PCT: u8 = 15;         // farm/dock closed for half a day
    const MERCHANT_CHANCE_PCT: u8 = 15;      // meals half price all day
    const MARKET_WAGE_PCT: u64 = 150;
    const MERCHANT_MEAL_PCT: u64 = 50;

    // ─── Day tick ───────────────────────────────────────────────────────────

    /// Advance the town to the next day. Public settlement utility — callable
    /// by anyone once `day_length_ms` has elapsed. Rolls a random festival and
    /// opens a mayoral election every ELECTION_INTERVAL_DAYS.
    public entry fun tick(
        dapp_storage: &mut DappStorage,
        rng:          &Random,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());

        let now = sui::clock::timestamp_ms(clock);
        let day_start = town_config::get_day_start_ms(dapp_storage);
        let day_length = town_config::get_day_length_ms(dapp_storage);
        error::day_not_finished(now >= day_start + day_length);

        let day = town_config::get_day(dapp_storage) + 1;
        town_config::set_day(dapp_storage, day);
        town_config::set_day_start_ms(dapp_storage, now);

        // Random town festival: doubles wages and affinity gains while active.
        let mut gen = random::new_generator(rng, ctx);
        if (random::generate_u8_in_range(&mut gen, 0, 99) < FESTIVAL_CHANCE_PCT) {
            town_config::set_festival_until(dapp_storage, now + FESTIVAL_MS);
        };

        // Roll the event of the day. Events shape everyone's behaviour:
        // MarketDay boosts wages, a Storm closes outdoor workplaces
        // (farm/dock) for half a day, the Merchant halves meal prices.
        let roll = random::generate_u8_in_range(&mut gen, 0, 99);
        if (roll < MARKET_DAY_CHANCE_PCT) {
            town_event::set(dapp_storage, EVENT_MARKET_DAY, now + day_length, MARKET_WAGE_PCT, day);
        } else if (roll < MARKET_DAY_CHANCE_PCT + STORM_CHANCE_PCT) {
            town_event::set(dapp_storage, EVENT_STORM, now + day_length / 2, 0, day);
        } else if (roll < MARKET_DAY_CHANCE_PCT + STORM_CHANCE_PCT + MERCHANT_CHANCE_PCT) {
            town_event::set(dapp_storage, EVENT_MERCHANT, now + day_length, MERCHANT_MEAL_PCT, day);
        } else {
            town_event::set(dapp_storage, EVENT_NONE, 0, 0, day);
        };

        // Periodically open a mayoral election (unless one is still running).
        let election_ends = election_state::get_ends_at(dapp_storage);
        if (day % ELECTION_INTERVAL_DAYS == 0 && now >= election_ends) {
            let round = election_state::get_round(dapp_storage) + 1;
            election_state::set(dapp_storage, round, now + day_length, @0x0, @0x0, 0, 0);
        };
    }

    // ─── Election ───────────────────────────────────────────────────────────

    /// Nominate one of your agents as a mayoral candidate (max two candidates,
    /// first come first served). The fee goes into the TownHall treasury.
    public entry fun nominate(
        dapp_storage: &mut DappStorage,
        user_storage: &mut UserStorage,
        town_hall:    &mut ObjectStorage<Building>,
        agent_id:     address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, agent_id));
        error::wrong_building(building::get_kind(town_hall) == KIND_TOWN_HALL);
        ensure_election_active(dapp_storage, clock);

        let candidate_a = election_state::get_candidate_a(dapp_storage);
        let candidate_b = election_state::get_candidate_b(dapp_storage);
        error::already_nominated(agent_id != candidate_a && agent_id != candidate_b);
        error::candidate_slots_full(candidate_a == @0x0 || candidate_b == @0x0);

        error::insufficient_gold(gold::get(user_storage) >= NOMINATION_FEE);
        gold::transfer_user_to_building(user_storage, town_hall, NOMINATION_FEE, ctx);

        if (candidate_a == @0x0) {
            election_state::set_candidate_a(dapp_storage, agent_id);
        } else {
            election_state::set_candidate_b(dapp_storage, agent_id);
        };
    }

    /// Cast a vote through one of your agents. One vote per agent per round,
    /// enforced by the keyed vote_record (mint aborts on duplicates).
    public entry fun vote(
        dapp_storage: &mut DappStorage,
        user_storage: &mut UserStorage,
        voter_agent:  address,
        candidate:    address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, voter_agent));
        ensure_election_active(dapp_storage, clock);

        let candidate_a = election_state::get_candidate_a(dapp_storage);
        let candidate_b = election_state::get_candidate_b(dapp_storage);
        error::invalid_candidate(
            candidate != @0x0 && (candidate == candidate_a || candidate == candidate_b)
        );

        let round = election_state::get_round(dapp_storage);
        vote_record::mint(user_storage, round, voter_agent, candidate, ctx);

        if (candidate == candidate_a) {
            let votes = election_state::get_votes_a(dapp_storage);
            election_state::set_votes_a(dapp_storage, votes + 1);
        } else {
            let votes = election_state::get_votes_b(dapp_storage);
            election_state::set_votes_b(dapp_storage, votes + 1);
        };
    }

    /// Settle a finished election. Anyone can call after `ends_at`; the caller
    /// must pass the UserStorage that owns the winning agent so the new
    /// mayor's owner address can be recorded on-chain. If nobody was
    /// nominated, the round simply closes and the old mayor stays.
    public entry fun close_election(
        dapp_storage:   &mut DappStorage,
        winner_storage: &UserStorage,
        clock:          &Clock,
        _ctx:           &TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());

        let round = election_state::get_round(dapp_storage);
        error::election_not_opened(round > 0);
        let ends_at = election_state::get_ends_at(dapp_storage);
        error::election_not_active(ends_at != 0);
        let now = sui::clock::timestamp_ms(clock);
        error::election_still_active(now >= ends_at);

        let candidate_a = election_state::get_candidate_a(dapp_storage);
        let candidate_b = election_state::get_candidate_b(dapp_storage);
        let votes_a = election_state::get_votes_a(dapp_storage);
        let votes_b = election_state::get_votes_b(dapp_storage);

        let winner = if (candidate_a != @0x0 && (candidate_b == @0x0 || votes_a >= votes_b)) {
            candidate_a
        } else if (candidate_b != @0x0) {
            candidate_b
        } else {
            @0x0
        };

        if (winner != @0x0) {
            error::not_the_winner(agent::has(winner_storage, winner));
            town_config::set_mayor_agent(dapp_storage, winner);
            town_config::set_mayor_owner(dapp_storage, dapp_service::canonical_owner(winner_storage));
        };

        // ends_at = 0 marks the round as settled (round counter is kept).
        election_state::set_ends_at(dapp_storage, 0);
    }

    /// The mayor throws a festival, paid from the TownHall treasury.
    public entry fun start_festival(
        dapp_storage: &mut DappStorage,
        user_storage: &UserStorage,
        town_hall:    &mut ObjectStorage<Building>,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::wrong_building(building::get_kind(town_hall) == KIND_TOWN_HALL);

        let mayor_owner = town_config::get_mayor_owner(dapp_storage);
        let mayor_agent = town_config::get_mayor_agent(dapp_storage);
        error::not_mayor(mayor_owner != @0x0);
        error::not_mayor(dapp_service::canonical_owner(user_storage) == mayor_owner);
        error::not_mayor(agent::has(user_storage, mayor_agent));

        // sub_gold aborts if the treasury cannot afford the festival.
        building::sub_gold(town_hall, FESTIVAL_COST);
        let now = sui::clock::timestamp_ms(clock);
        town_config::set_festival_until(dapp_storage, now + FESTIVAL_MS);
        let _ = ctx;
    }

    // ─── Building administration (DApp admin only) ──────────────────────────

    /// Create and share a town building. Called by the seed script after
    /// deployment; the shared ObjectID is captured from the transaction
    /// effects and then configured with `configure_building`.
    public entry fun create_building(
        dapp_storage: &mut DappStorage,
        entity_id:    vector<u8>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
        building::create_building(dapp_storage, entity_id, ctx);
    }

    /// Configure a building's metadata. `create_building` shares the object
    /// immediately, so fields are set in a follow-up transaction.
    public entry fun configure_building(
        dapp_storage: &DappStorage,
        building:     &mut ObjectStorage<Building>,
        kind:         u8,
        name:         String,
        wage:         u64,
        meal_price:   u64,
        ctx:          &TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
        building::set_kind(building, kind);
        building::set_name(building, name);
        building::set_wage(building, wage);
        building::set_meal_price(building, meal_price);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    fun ensure_election_active(dapp_storage: &DappStorage, clock: &Clock) {
        let round = election_state::get_round(dapp_storage);
        error::election_not_opened(round > 0);
        let ends_at = election_state::get_ends_at(dapp_storage);
        let now = sui::clock::timestamp_ms(clock);
        error::election_not_active(ends_at != 0 && now < ends_at);
    }
}
