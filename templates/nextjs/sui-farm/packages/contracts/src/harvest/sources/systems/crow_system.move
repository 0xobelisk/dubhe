module harvest::crow_system {
    use sui::clock::Clock;
    use dubhe::dapp_service::{DappStorage, UserStorage, ScenePermit};
    use dubhe::dapp_service;
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::error;
    use harvest::gold;
    use harvest::crow_charges;
    use harvest::crow_damage;
    use harvest::scarecrow;
    use harvest::profile;
    use harvest::world::World;

    const CROW_CHARGE_REFILL_MS: u64 = 60 * 60 * 1000;
    const MAX_CROW_CHARGES:      u8  = 3;
    const CROW_DAMAGE_PCT:       u8  = 30;
    const CROW_DEBUFF_DURATION:  u64 = 4 * 60 * 60 * 1000;
    const SCARECROW_DURATION:    u64 = 4 * 60 * 60 * 1000;
    const SCARECROW_COST:        u64 = 10;

    #[error]
    const ESelfAttack: vector<u8> = b"Cannot attack yourself";

    /// Attack a target player with crows.  Consumes 1 crow charge and sets a
    /// 30% harvest-debuff on the target for 4 hours via reactive write.
    public entry fun attack(
        dapp_storage:     &DappStorage,
        attacker_storage: &mut UserStorage,
        target_storage:   &mut UserStorage,
        world_permit:     &mut ScenePermit<World>,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(attacker_storage));
        error::not_registered(profile::has(target_storage));

        let now = sui::clock::timestamp_ms(clock);
        let attacker = ctx.sender();
        let target_addr = dapp_service::canonical_owner(target_storage);
        assert!(attacker != target_addr, ESelfAttack);

        maybe_refill_charges(attacker_storage, now, ctx);

        let charges = crow_charges::get_count(attacker_storage);
        error::crow_no_charges(charges > 0);

        let target_protected = scarecrow::has(target_storage) &&
            now < scarecrow::get(target_storage);
        error::crow_target_protected(!target_protected);

        crow_charges::set_count(attacker_storage, charges - 1, ctx);

        crow_damage::set_reactive(
            world_permit,
            attacker_storage,
            target_storage,
            now + CROW_DEBUFF_DURATION,
            CROW_DAMAGE_PCT,
            ctx,
        );
    }

    /// Place a scarecrow to protect your farm for 4 hours.
    public entry fun place_scarecrow(
        dapp_storage:  &DappStorage,
        user_storage:  &mut UserStorage,
        clock:         &Clock,
        ctx:           &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::insufficient_gold(gold::get(user_storage) >= SCARECROW_COST);

        let now = sui::clock::timestamp_ms(clock);
        gold::sub(user_storage, SCARECROW_COST, ctx);
        scarecrow::set(user_storage, now + SCARECROW_DURATION, ctx);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    fun maybe_refill_charges(user_storage: &mut UserStorage, now: u64, ctx: &mut TxContext) {
        if (!crow_charges::has(user_storage)) { return };
        let last_refill = crow_charges::get_last_refill_at(user_storage);
        let current = crow_charges::get_count(user_storage);
        if (current >= MAX_CROW_CHARGES || last_refill == 0) { return };
        let elapsed = now - last_refill;
        let earned = ((elapsed / CROW_CHARGE_REFILL_MS) as u8);
        if (earned == 0) { return };
        let new_count = current + earned;
        let clamped = if (new_count > MAX_CROW_CHARGES) { MAX_CROW_CHARGES } else { new_count };
        crow_charges::set(user_storage, clamped, now, ctx);
    }
}
