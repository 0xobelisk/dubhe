/// Daily-life actions: moving around town, working, eating, sleeping.
///
/// Time is lazy — there is no global tick driving agents. Energy decays from
/// `last_action_ms` and is settled at the start of every action; wages,
/// cooldowns and buffs are all computed from the shared Clock.
///
/// Map positions are event-only (`agent_position` is an offchain resource):
/// the chain orders and publishes every movement but stores no state for it,
/// keeping the high-frequency wandering of a whole town affordable. Gameplay
/// checks use the coarse on-chain `location` (a BuildingKind) instead.
module ville::life_system {
    use sui::clock::Clock;
    use sui::random::{Self, Random};
    use dubhe::dapp_service::{DappStorage, UserStorage, ObjectStorage};
    use dubhe::dapp_system;
    use ville::dapp_key::DappKey;
    use ville::migrate;
    use ville::error;
    use ville::gold;
    use ville::profile;
    use ville::agent;
    use ville::agent_position;
    use ville::item;
    use ville::town_config;
    use ville::town_event;
    use ville::building::{Self, Building};
    use ville::agent_system;

    // BuildingKind constants (mirror the BuildingKind enum in dubhe.config.ts)
    const KIND_FARM:     u8 = 2;
    const KIND_CAFE:     u8 = 3;
    const KIND_DOCK:     u8 = 4;
    const KIND_WORKSHOP: u8 = 5;
    const KIND_TAVERN:   u8 = 6;

    // Occupation constants (mirror the Occupation enum)
    const OCC_FARMER:  u8 = 1;
    const OCC_BARISTA: u8 = 2;
    const OCC_FISHER:  u8 = 3;

    // ItemKind constants (mirror the ItemKind enum)
    const ITEM_BREAD:     u8 = 1;
    const ITEM_COFFEE:    u8 = 2;
    const ITEM_FISH:      u8 = 3;
    const ITEM_CRAFTWORK: u8 = 4;

    // Work tuning (demo timescale)
    const WORK_ENERGY_COST: u64 = 20;
    const WORK_MOOD_COST:   u64 = 5;
    const WORK_COOLDOWN_MS: u64 = 60_000;          // one shift per minute
    const WORK_RANDOM_BONUS_MAX: u8 = 4;           // + 0..4 gold per shift
    const CRAFT_CHANCE_PCT: u8 = 20;               // 20% chance to craft an item
    const MOOD_BONUS_THRESHOLD: u64 = 70;          // happy agents earn +20%
    const MOOD_BONUS_PCT: u64 = 120;
    const FESTIVAL_WAGE_PCT: u64 = 200;            // festivals double wages

    // EventKind constants (mirror the EventKind enum)
    const EVENT_MARKET_DAY: u8 = 1;
    const EVENT_STORM: u8 = 2;
    const EVENT_MERCHANT: u8 = 3;

    // Eat / sleep tuning
    const EAT_ENERGY_GAIN: u64 = 40;
    const EAT_MOOD_GAIN:   u64 = 5;
    const SLEEP_COOLDOWN_MS: u64 = 600_000;        // one nap per 10 minutes
    const SLEEP_MOOD_GAIN: u64 = 2;

    /// Move to a location on the town map. `location` is the BuildingKind the
    /// agent ends up in (0 = outdoors) and gates work/eat actions; `x`/`y` and
    /// `activity` are event-only data for spectators and other agents' brains.
    public entry fun move_to(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        agent_id:     address,
        location:     u8,
        x:            u64,
        y:            u64,
        activity:     u8,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, agent_id));
        error::not_at_location(location <= KIND_TAVERN);

        let now = sui::clock::timestamp_ms(clock);
        agent_system::settle_energy(user_storage, agent_id, now, ctx);
        agent::set_location(user_storage, agent_id, location, ctx);
        agent::set_last_action_ms(user_storage, agent_id, now, ctx);

        agent_position::set(user_storage, agent_id, x, y, activity, ctx);
    }

    /// Work one shift at the agent's workplace. The wage is boosted by high
    /// mood and active festivals, plus a small random bonus; there is a
    /// CRAFT_CHANCE_PCT chance of producing a giftable/tradeable item.
    public entry fun work(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        building:     &ObjectStorage<Building>,
        agent_id:     address,
        rng:          &Random,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, agent_id));

        let occupation = agent::get_occupation(user_storage, agent_id);
        let kind = building::get_kind(building);
        error::wrong_building(kind == workplace_of(occupation));
        error::not_at_location(agent::get_location(user_storage, agent_id) == kind);

        let now = sui::clock::timestamp_ms(clock);
        let last_work = agent::get_last_work_ms(user_storage, agent_id);
        error::work_cooldown_active(last_work == 0 || now >= last_work + WORK_COOLDOWN_MS);

        // An active Storm closes the outdoor workplaces.
        error::storm_blocks_work(
            !(event_active(dapp_storage, EVENT_STORM, now)
                && (kind == KIND_FARM || kind == KIND_DOCK))
        );

        let energy = agent_system::settle_energy(user_storage, agent_id, now, ctx);
        error::insufficient_energy(energy >= WORK_ENERGY_COST);
        agent::set_energy(user_storage, agent_id, energy - WORK_ENERGY_COST, ctx);

        // Wage = building wage × mood bonus × festival bonus + random tip.
        let mut wage = building::get_wage(building);
        if (agent::get_mood(user_storage, agent_id) >= MOOD_BONUS_THRESHOLD) {
            wage = wage * MOOD_BONUS_PCT / 100;
        };
        if (now < town_config::get_festival_until(dapp_storage)) {
            wage = wage * FESTIVAL_WAGE_PCT / 100;
        };
        if (event_active(dapp_storage, EVENT_MARKET_DAY, now)) {
            wage = wage * town_event::get_magnitude(dapp_storage) / 100;
        };
        let mut gen = random::new_generator(rng, ctx);
        wage = wage + (random::generate_u8_in_range(&mut gen, 0, WORK_RANDOM_BONUS_MAX) as u64);

        gold::add(user_storage, wage, ctx);
        let earned = profile::get_total_earned(user_storage);
        profile::set_total_earned(user_storage, earned + wage, ctx);

        // Occasionally craft an occupational item (quality 1..100).
        if (random::generate_u8_in_range(&mut gen, 0, 99) < CRAFT_CHANCE_PCT) {
            let item_id = ctx.fresh_object_address();
            let quality = random::generate_u8_in_range(&mut gen, 1, 100);
            item::mint(user_storage, item_id, item_of(occupation), quality, ctx);
        };

        agent_system::sub_mood(user_storage, agent_id, WORK_MOOD_COST, ctx);
        agent::set_last_work_ms(user_storage, agent_id, now, ctx);
        agent::set_last_action_ms(user_storage, agent_id, now, ctx);
    }

    /// Buy a meal at the cafe or tavern. The payment flows into the building's
    /// treasury — the main gold sink balancing the wage faucet.
    public entry fun eat(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        building:     &mut ObjectStorage<Building>,
        agent_id:     address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, agent_id));

        let kind = building::get_kind(building);
        error::wrong_building(kind == KIND_CAFE || kind == KIND_TAVERN);
        error::not_at_location(agent::get_location(user_storage, agent_id) == kind);

        let now = sui::clock::timestamp_ms(clock);

        // The traveling Merchant undercuts the local kitchens.
        let mut price = building::get_meal_price(building);
        if (event_active(dapp_storage, EVENT_MERCHANT, now)) {
            price = price * town_event::get_magnitude(dapp_storage) / 100;
        };
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::transfer_user_to_building(user_storage, building, price, ctx);
        let energy = agent_system::settle_energy(user_storage, agent_id, now, ctx);
        agent_system::add_energy(user_storage, agent_id, energy, EAT_ENERGY_GAIN, ctx);
        agent_system::add_mood(user_storage, agent_id, EAT_MOOD_GAIN, ctx);
        agent::set_last_action_ms(user_storage, agent_id, now, ctx);
    }

    /// Take a nap: restores energy to full. Rate-limited by SLEEP_COOLDOWN_MS.
    public entry fun sleep(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        agent_id:     address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, agent_id));

        let now = sui::clock::timestamp_ms(clock);
        let last_sleep = agent::get_last_sleep_ms(user_storage, agent_id);
        error::sleep_cooldown_active(last_sleep == 0 || now >= last_sleep + SLEEP_COOLDOWN_MS);

        agent::set_energy(user_storage, agent_id, agent_system::max_energy(), ctx);
        agent_system::add_mood(user_storage, agent_id, SLEEP_MOOD_GAIN, ctx);
        agent::set_last_sleep_ms(user_storage, agent_id, now, ctx);
        agent::set_last_action_ms(user_storage, agent_id, now, ctx);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    /// `has` guard keeps this upgrade-safe: after adding town_event to an
    /// already-deployed dapp the record only exists once the next tick rolls.
    fun event_active(dapp_storage: &DappStorage, event_kind: u8, now: u64): bool {
        town_event::has(dapp_storage)
            && town_event::get_kind(dapp_storage) == event_kind
            && now < town_event::get_until(dapp_storage)
    }

    fun workplace_of(occupation: u8): u8 {
        if      (occupation == OCC_FARMER)  { KIND_FARM }
        else if (occupation == OCC_BARISTA) { KIND_CAFE }
        else if (occupation == OCC_FISHER)  { KIND_DOCK }
        else                                { KIND_WORKSHOP }
    }

    fun item_of(occupation: u8): u8 {
        if      (occupation == OCC_FARMER)  { ITEM_BREAD }
        else if (occupation == OCC_BARISTA) { ITEM_COFFEE }
        else if (occupation == OCC_FISHER)  { ITEM_FISH }
        else                                { ITEM_CRAFTWORK }
    }
}
