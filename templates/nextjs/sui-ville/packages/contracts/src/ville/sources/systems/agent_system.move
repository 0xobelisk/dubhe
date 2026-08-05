/// Agent lifecycle: minting AI citizens and syncing their compressed memory.
///
/// An agent is a keyed record inside the owner's UserStorage — the player
/// always owns their agents' assets. The `personality` string is the on-chain
/// prompt for the off-chain LLM brain; `memory_digest` lets a brand-new brain
/// instance rebuild its long-term memory purely from chain state.
///
/// This module also hosts the shared lazy-settlement helpers (energy decays
/// over wall-clock time; mood is clamped to 0..100) used by the other systems.
module ville::agent_system {
    use std::ascii::{string, String};
    use sui::clock::Clock;
    use dubhe::dapp_service::{DappStorage, UserStorage, ObjectStorage};
    use dubhe::dapp_system;
    use ville::dapp_key::DappKey;
    use ville::migrate;
    use ville::error;
    use ville::gold;
    use ville::profile;
    use ville::agent;
    use ville::memory_digest;
    use ville::town_config;
    use ville::building::{Self, Building};

    const MAX_AGENTS_PER_PLAYER: u32 = 3;
    /// Mint fee flows into the TownHall treasury (spent later on festivals).
    const MINT_COST: u64 = 100;

    const STARTING_ENERGY: u64 = 100;
    const STARTING_MOOD:   u64 = 60;
    const MAX_ENERGY: u64 = 100;
    const MAX_MOOD:   u64 = 100;
    /// 1 energy point decays per 30 seconds of wall-clock time (demo scale).
    const ENERGY_DECAY_MS: u64 = 30_000;

    // BuildingKind constants (mirror the BuildingKind enum in dubhe.config.ts)
    const KIND_TOWN_HALL: u8 = 1;

    // Occupation constants (mirror the Occupation enum)
    const OCC_FARMER:  u8 = 1;
    const OCC_ARTISAN: u8 = 4;

    /// Mint a new AI citizen. The fee is paid into the TownHall treasury.
    /// `personality` is the free-form prompt that will drive the agent's
    /// off-chain brain (visible to everyone — this is a fully public world).
    public entry fun mint_agent(
        dapp_storage: &mut DappStorage,
        user_storage: &mut UserStorage,
        town_hall:    &mut ObjectStorage<Building>,
        name:         String,
        personality:  String,
        occupation:   u8,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::not_registered(profile::has(user_storage));
        error::invalid_occupation(occupation >= OCC_FARMER && occupation <= OCC_ARTISAN);
        error::wrong_building(building::get_kind(town_hall) == KIND_TOWN_HALL);

        let minted = profile::get_agents_minted(user_storage);
        error::max_agents_reached(minted < MAX_AGENTS_PER_PLAYER);
        error::insufficient_gold(gold::get(user_storage) >= MINT_COST);
        gold::transfer_user_to_building(user_storage, town_hall, MINT_COST, ctx);

        let now = sui::clock::timestamp_ms(clock);
        // fresh_object_address gives a globally-unique agent id with no counter.
        let agent_id = ctx.fresh_object_address();
        agent::mint(
            user_storage,
            agent_id,
            name,
            personality,
            occupation,
            STARTING_ENERGY,
            STARTING_MOOD,
            0,      // location: outdoors
            now,    // last_action_ms
            0,      // last_work_ms
            0,      // last_sleep_ms
            now,    // born_at
            ctx,
        );
        memory_digest::mint(user_storage, agent_id, string(b""), now, ctx);

        profile::set_agents_minted(user_storage, minted + 1, ctx);
        let population = town_config::get_population(dapp_storage);
        town_config::set_population(dapp_storage, population + 1);
    }

    /// Persist the agent's compressed long-term memory. Called periodically by
    /// the off-chain brain (through the owner's session key) so the memory
    /// survives brain restarts and stays portable across LLM providers.
    public entry fun update_memory(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        agent_id:     address,
        digest:       String,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::agent_not_found(agent::has(user_storage, agent_id));

        let now = sui::clock::timestamp_ms(clock);
        memory_digest::set(user_storage, agent_id, digest, now, ctx);
    }

    // ─── Shared lazy-settlement helpers ─────────────────────────────────────

    /// Settle time-based energy decay since the agent's last action and return
    /// the up-to-date value. Writes only when the value actually changed.
    public(package) fun settle_energy(
        user_storage: &mut UserStorage,
        agent_id:     address,
        now:          u64,
        ctx:          &mut TxContext,
    ): u64 {
        let last = agent::get_last_action_ms(user_storage, agent_id);
        let energy = agent::get_energy(user_storage, agent_id);
        if (now <= last) { return energy };
        let decay = (now - last) / ENERGY_DECAY_MS;
        if (decay == 0) { return energy };
        let settled = if (decay >= energy) { 0 } else { energy - decay };
        agent::set_energy(user_storage, agent_id, settled, ctx);
        settled
    }

    public(package) fun add_energy(
        user_storage: &mut UserStorage,
        agent_id:     address,
        current:      u64,
        gain:         u64,
        ctx:          &mut TxContext,
    ) {
        let boosted = if (current + gain > MAX_ENERGY) { MAX_ENERGY } else { current + gain };
        agent::set_energy(user_storage, agent_id, boosted, ctx);
    }

    public(package) fun add_mood(
        user_storage: &mut UserStorage,
        agent_id:     address,
        gain:         u64,
        ctx:          &mut TxContext,
    ) {
        let mood = agent::get_mood(user_storage, agent_id);
        let boosted = if (mood + gain > MAX_MOOD) { MAX_MOOD } else { mood + gain };
        agent::set_mood(user_storage, agent_id, boosted, ctx);
    }

    public(package) fun sub_mood(
        user_storage: &mut UserStorage,
        agent_id:     address,
        loss:         u64,
        ctx:          &mut TxContext,
    ) {
        let mood = agent::get_mood(user_storage, agent_id);
        let lowered = if (loss >= mood) { 0 } else { mood - loss };
        agent::set_mood(user_storage, agent_id, lowered, ctx);
    }

    public(package) fun max_energy(): u64 { MAX_ENERGY }
}
