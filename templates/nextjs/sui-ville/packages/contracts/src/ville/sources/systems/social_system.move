/// Social interactions between agents owned by different players.
///
/// A single `talk` transaction updates BOTH sides of the relationship graph:
/// the speaker's edge is a normal own-storage write, the listener's edge is a
/// reactive write authorized by the global WorldPermit (the framework checks
/// both canonical owners are permit participants). The dialogue text itself is
/// an offchain event — spectators and other agents' brains read it from the
/// indexer, while only the affinity change persists as on-chain state.
///
/// `gift_item` moves an item across players the same way: it is deleted from
/// the giver and reactively re-created in the receiver's storage. The system
/// logic (delete-then-set in one tx) preserves the item's uniqueness.
module ville::social_system {
    use std::ascii::String;
    use sui::clock::Clock;
    use dubhe::dapp_service::{Self, DappStorage, UserStorage, ScenePermit};
    use dubhe::dapp_system;
    use ville::dapp_key::DappKey;
    use ville::migrate;
    use ville::error;
    use ville::agent;
    use ville::relationship;
    use ville::dialogue;
    use ville::item;
    use ville::world::World;
    use ville::agent_system;
    use ville::town_config;

    const TALK_ENERGY_COST: u64 = 5;
    const TALK_MOOD_GAIN:   u64 = 3;
    const TALK_AFFINITY_GAIN: u64 = 2;
    const GIFT_AFFINITY_GAIN: u64 = 6;
    const GIFT_MOOD_GAIN:   u64 = 4;
    /// New relationships start from a neutral baseline.
    const BASE_AFFINITY: u64 = 50;
    /// Affinity gains are doubled while a festival is running.
    const FESTIVAL_AFFINITY_PCT: u64 = 200;

    /// Say something to another agent. Emits the dialogue as an offchain
    /// event and strengthens the relationship edge on both sides.
    public entry fun talk(
        dapp_storage:     &DappStorage,
        speaker_storage:  &mut UserStorage,
        listener_storage: &mut UserStorage,
        world_permit:     &ScenePermit<World>,
        speaker_id:       address,
        listener_id:      address,
        content:          String,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        ensure_social_pair(speaker_storage, listener_storage, speaker_id, listener_id);

        let now = sui::clock::timestamp_ms(clock);
        let energy = agent_system::settle_energy(speaker_storage, speaker_id, now, ctx);
        error::insufficient_energy(energy >= TALK_ENERGY_COST);
        agent::set_energy(speaker_storage, speaker_id, energy - TALK_ENERGY_COST, ctx);
        agent_system::add_mood(speaker_storage, speaker_id, TALK_MOOD_GAIN, ctx);

        let gain = festival_boost(dapp_storage, TALK_AFFINITY_GAIN, now);
        bump_own_edge(speaker_storage, speaker_id, listener_id, gain, ctx);
        bump_reactive_edge(
            world_permit, speaker_storage, listener_storage, listener_id, speaker_id, gain, ctx,
        );

        dialogue::set(speaker_storage, speaker_id, listener_id, content, ctx);
        agent::set_last_action_ms(speaker_storage, speaker_id, now, ctx);
    }

    /// Gift an item to another player's agent. The item is deleted from the
    /// giver's storage and reactively re-created in the receiver's storage in
    /// the same transaction. Big affinity boost on both sides.
    public entry fun gift_item(
        dapp_storage: &DappStorage,
        from_storage: &mut UserStorage,
        to_storage:   &mut UserStorage,
        world_permit: &ScenePermit<World>,
        from_id:      address,
        to_id:        address,
        item_id:      address,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        ensure_social_pair(from_storage, to_storage, from_id, to_id);
        error::item_not_found(item::has(from_storage, item_id));

        let now = sui::clock::timestamp_ms(clock);
        let (kind, quality) = item::get(from_storage, item_id);
        item::delete(from_storage, item_id, ctx);
        item::set_reactive(world_permit, from_storage, to_storage, item_id, kind, quality, ctx);

        let gain = festival_boost(dapp_storage, GIFT_AFFINITY_GAIN, now);
        bump_own_edge(from_storage, from_id, to_id, gain, ctx);
        bump_reactive_edge(world_permit, from_storage, to_storage, to_id, from_id, gain, ctx);

        agent_system::add_mood(from_storage, from_id, GIFT_MOOD_GAIN, ctx);
        agent_system::settle_energy(from_storage, from_id, now, ctx);
        agent::set_last_action_ms(from_storage, from_id, now, ctx);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    fun ensure_social_pair(
        a_storage: &UserStorage,
        b_storage: &UserStorage,
        a_id:      address,
        b_id:      address,
    ) {
        error::agent_not_found(agent::has(a_storage, a_id));
        error::agent_not_found(agent::has(b_storage, b_id));
        error::cannot_socialize_self(a_id != b_id);
        // Reactive writes require two distinct storages; agents of the same
        // player share one UserStorage and cannot be passed twice by-mut.
        error::same_owner_socialize(
            dapp_service::canonical_owner(a_storage) != dapp_service::canonical_owner(b_storage)
        );
        // Social actions require a face-to-face meeting: both agents must
        // stand in the same location (BuildingKind) on the town map.
        error::agents_not_together(
            agent::get_location(a_storage, a_id) == agent::get_location(b_storage, b_id)
        );
    }

    fun festival_boost(dapp_storage: &DappStorage, base: u64, now: u64): u64 {
        if (now < town_config::get_festival_until(dapp_storage)) {
            base * FESTIVAL_AFFINITY_PCT / 100
        } else {
            base
        }
    }

    /// Upsert the (owner-side) directed relationship edge.
    fun bump_own_edge(
        user_storage: &mut UserStorage,
        agent_id:     address,
        other_agent:  address,
        gain:         u64,
        ctx:          &mut TxContext,
    ) {
        if (relationship::has(user_storage, agent_id, other_agent)) {
            let (affinity, interactions) = relationship::get(user_storage, agent_id, other_agent);
            relationship::set(user_storage, agent_id, other_agent, affinity + gain, interactions + 1, ctx);
        } else {
            relationship::set(user_storage, agent_id, other_agent, BASE_AFFINITY + gain, 1, ctx);
        }
    }

    /// Upsert the other player's side of the edge through a reactive write.
    fun bump_reactive_edge(
        world_permit: &ScenePermit<World>,
        from:         &mut UserStorage,
        target:       &mut UserStorage,
        agent_id:     address,
        other_agent:  address,
        gain:         u64,
        ctx:          &mut TxContext,
    ) {
        let (affinity, interactions) = if (relationship::has(target, agent_id, other_agent)) {
            relationship::get(target, agent_id, other_agent)
        } else {
            (BASE_AFFINITY, 0)
        };
        relationship::set_reactive(
            world_permit, from, target, agent_id, other_agent, affinity + gain, interactions + 1, ctx,
        );
    }
}
