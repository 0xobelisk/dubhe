module harvest::pet_system {
    use sui::clock::Clock;
    use sui::random::{Self, Random};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use dubhe::dapp_service::{Self, DappHub, DappStorage, UserStorage};
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::error;
    use harvest::gold;
    use harvest::common_egg;
    use harvest::rare_egg;
    use harvest::seasonal_egg;
    use harvest::pet_hatch;
    use harvest::pet;
    use harvest::pet_slot_index;
    use harvest::pet_slots;
    use harvest::pet_config;
    use harvest::profile;

    // ─── Constants ────────────────────────────────────────────────────────────

    const EGG_COMMON:   u8 = 1;
    const EGG_RARE:     u8 = 2;
    const EGG_SEASONAL: u8 = 3;

    const SPECIES_BUNNY:  u8 = 1;
    const SPECIES_CHICK:  u8 = 2;
    const SPECIES_FOX:    u8 = 3;
    const SPECIES_DEER:   u8 = 4;
    const SPECIES_DRAGON: u8 = 5;

    const RARITY_COMMON:   u8 = 0;
    const RARITY_UNCOMMON: u8 = 1;
    const RARITY_RARE:     u8 = 2;

    const XP_PER_LEVEL: u32 = 100;

    const SATIETY_DRAIN_INTERVAL_MS: u64 = 4 * 60 * 60 * 1000;
    const SATIETY_DRAIN_AMOUNT: u8 = 20;
    const MAX_SATIETY: u8 = 100;
    const MAX_HAPPINESS: u8 = 100;
    const MAX_LEVEL: u8 = 10;
    const MAX_PET_SLOTS: u8 = 3;
    const DEFAULT_PET_SLOTS: u8 = 1;

    const SATIETY_RESTORE_FAVORITE: u8 = 25;
    const SATIETY_RESTORE_OTHER:    u8 = 10;
    const HAPPINESS_GAIN_FAVORITE:  u8 = 15;
    const HAPPINESS_GAIN_OTHER:     u8 = 5;
    const XP_GAIN_FAVORITE:         u32 = 20;
    const XP_GAIN_OTHER:            u32 = 5;

    #[error]
    const EHatchNotReady: vector<u8> = b"Egg is not ready to hatch yet";

    // ─── Buy eggs from shop ───────────────────────────────────────────────────

    public entry fun buy_common_egg(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        count:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::insufficient_eggs(count > 0);
        let price = pet_config::get_common_egg_price(dapp_storage) * count;
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::sub(user_storage, price, ctx);
        common_egg::add(user_storage, count, ctx);
    }

    public entry fun buy_rare_egg(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        count:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::insufficient_eggs(count > 0);
        let price = pet_config::get_rare_egg_price(dapp_storage) * count;
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::sub(user_storage, price, ctx);
        rare_egg::add(user_storage, count, ctx);
    }

    public entry fun buy_seasonal_egg(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        count:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::insufficient_eggs(count > 0);
        let price = pet_config::get_seasonal_egg_price(dapp_storage) * count;
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::sub(user_storage, price, ctx);
        seasonal_egg::add(user_storage, count, ctx);
    }

    // ─── Hatch flow ───────────────────────────────────────────────────────────

    /// Place one egg of `egg_type` into the incubation slot.
    public entry fun start_hatch(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        egg_type:     u8,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::invalid_egg_type(egg_type >= EGG_COMMON && egg_type <= EGG_SEASONAL);
        error::hatch_slot_busy(!pet_hatch::has(user_storage));

        let bal = egg_balance(user_storage, egg_type);
        error::insufficient_eggs(bal >= 1);
        deduct_egg(user_storage, egg_type, 1, ctx);

        let now = sui::clock::timestamp_ms(clock);
        let hatch_duration = hatch_duration_ms(dapp_storage, egg_type);
        pet_hatch::set(user_storage, egg_type, now + hatch_duration, ctx);
    }

    /// Open a ready egg and place the new pet into the ranch (no active slot required).
    /// Uses Sui randomness to determine species and rarity.
    /// Mints a new pet with a globally unique pet_id via ctx.fresh_object_address().
    /// Call assign_slot() afterwards to activate the pet in a display slot.
    public entry fun open_egg(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        rng:          &Random,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::no_egg_incubating(pet_hatch::has(user_storage));

        let now = sui::clock::timestamp_ms(clock);
        let hatch_at = pet_hatch::get_hatch_at(user_storage);
        assert!(now >= hatch_at, EHatchNotReady);

        let egg_type = pet_hatch::get_egg_type(user_storage);

        // Roll species and rarity
        let mut gen = random::new_generator(rng, ctx);
        let (species, rarity) = roll_pet(&mut gen, egg_type);

        // Allocate a globally unique pet_id — no on-chain counter needed.
        let pet_id = ctx.fresh_object_address();

        // Pet lands in ranch: no slot assigned. Player calls assign_slot() to activate.
        // mint() internally calls ensure_has_not + set, preventing duplicate pet_ids.
        pet::mint(user_storage, pet_id, species, rarity, 1, 0, 50, MAX_SATIETY, now, now, ctx);

        pet_hatch::delete(user_storage, ctx);
    }

    // ─── Feeding ──────────────────────────────────────────────────────────────

    /// Feed any owned pet (in ranch or active slot) with `amount` units of `crop_type`.
    /// crop_type: 1=Wheat 2=Corn 3=Carrot 4=Pumpkin
    public entry fun feed_pet(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        pet_id:       address,
        crop_type:    u8,
        amount:       u64,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::invalid_crop_type(crop_type >= 1 && crop_type <= 4);
        error::pet_not_found(pet::has(user_storage, pet_id));
        error::insufficient_crops(amount > 0);

        burn_crops(user_storage, crop_type, amount, ctx);

        let species = pet::get_species(user_storage, pet_id);
        let is_favorite = is_favorite_food(species, crop_type);

        let now      = sui::clock::timestamp_ms(clock);
        let fed_at   = pet::get_fed_at(user_storage, pet_id);
        let current_satiety = pet::get_satiety(user_storage, pet_id);
        let drained  = compute_satiety_drain(fed_at, now);
        let after_drain = if (current_satiety > drained) { current_satiety - drained } else { 0 };

        let (satiety_per, happiness_per, xp_per) = if (is_favorite) {
            (SATIETY_RESTORE_FAVORITE, HAPPINESS_GAIN_FAVORITE, XP_GAIN_FAVORITE)
        } else {
            (SATIETY_RESTORE_OTHER, HAPPINESS_GAIN_OTHER, XP_GAIN_OTHER)
        };

        let new_satiety   = clamp_u8(after_drain + (satiety_per as u8) * (amount as u8), MAX_SATIETY);
        let old_happiness = pet::get_happiness(user_storage, pet_id);
        let new_happiness = clamp_u8(old_happiness + happiness_per * (amount as u8), MAX_HAPPINESS);

        let old_xp    = pet::get_xp(user_storage, pet_id);
        let old_level = pet::get_level(user_storage, pet_id);
        let added_xp  = xp_per * (amount as u32);
        let (new_level, new_xp) = compute_level_up(old_level, old_xp, added_xp);

        let rarity  = pet::get_rarity(user_storage, pet_id);
        let born_at = pet::get_born_at(user_storage, pet_id);
        pet::set(
            user_storage, pet_id,
            species, rarity, new_level, new_xp, new_happiness, new_satiety,
            now, born_at,
            ctx,
        );
    }

    // ─── Slot management ─────────────────────────────────────────────────────

    /// Purchase an additional active slot (up to MAX_PET_SLOTS).
    public entry fun buy_pet_slot(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));

        let current = if (pet_slots::has(user_storage)) {
            pet_slots::get(user_storage)
        } else {
            DEFAULT_PET_SLOTS
        };
        error::max_pet_slots_reached(current < MAX_PET_SLOTS);

        let price = if (current == 1) {
            pet_config::get_slot2_price(dapp_storage)
        } else {
            pet_config::get_slot3_price(dapp_storage)
        };
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::sub(user_storage, price, ctx);
        pet_slots::set(user_storage, current + 1, ctx);
    }

    /// Assign a ranch pet to an active display slot.
    /// If the pet is already in another slot it is moved (old slot freed).
    /// Aborts if `slot` is out of range or already occupied by a different pet.
    public entry fun assign_slot(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        pet_id:       address,
        slot:         u8,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::pet_not_found(pet::has(user_storage, pet_id));

        let slots_owned = if (pet_slots::has(user_storage)) {
            pet_slots::get(user_storage)
        } else {
            DEFAULT_PET_SLOTS
        };
        error::invalid_pet_slot(slot < slots_owned);
        error::pet_slot_occupied(!pet_slot_index::has(user_storage, slot));

        // If this pet is already assigned to a different slot, free that slot first.
        let (found, old_slot) = find_pet_slot(user_storage, pet_id, slots_owned);
        if (found) {
            pet_slot_index::delete(user_storage, old_slot, ctx);
        };

        pet_slot_index::set(user_storage, slot, pet_id, ctx);
    }

    /// Move an active pet back to the ranch (free its display slot).
    public entry fun unassign_slot(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        slot:         u8,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::pet_slot_empty(pet_slot_index::has(user_storage, slot));

        pet_slot_index::delete(user_storage, slot, ctx);
    }

    /// Permanently release (delete) a pet — works for ranch pets and active-slot pets alike.
    public entry fun dismiss_pet(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        pet_id:       address,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::pet_not_found(pet::has(user_storage, pet_id));

        // Free the display slot if the pet is currently active.
        let slots_owned = if (pet_slots::has(user_storage)) {
            pet_slots::get(user_storage)
        } else {
            DEFAULT_PET_SLOTS
        };
        let (found, slot) = find_pet_slot(user_storage, pet_id, slots_owned);
        if (found) {
            pet_slot_index::delete(user_storage, slot, ctx);
        };

        pet::delete(user_storage, pet_id, ctx);
    }

    // ─── Pet NFT marketplace ─────────────────────────────────────────────────

    /// List any owned pet (ranch or active slot) for sale.
    /// The active slot (if any) is freed immediately. Satiety is reset so the
    /// listing always shows a "full" pet — cancel restores the pet to ranch.
    public entry fun list_pet(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        pet_id:       address,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(user_storage));
        error::pet_not_found(pet::has(user_storage, pet_id));

        // Free active slot if the pet is currently displayed.
        let slots_owned = if (pet_slots::has(user_storage)) {
            pet_slots::get(user_storage)
        } else {
            DEFAULT_PET_SLOTS
        };
        let (found, slot) = find_pet_slot(user_storage, pet_id, slots_owned);
        if (found) {
            pet_slot_index::delete(user_storage, slot, ctx);
        };

        // Reset satiety to MAX so the listing always shows a healthy pet.
        pet::set_satiety(user_storage, pet_id, MAX_SATIETY, ctx);

        // take_record removes pet from storage and creates a shared Listing.
        pet::list<SUI>(user_storage, pet_id, price, std::option::none(), ctx);
    }

    /// Buy a listed pet. The pet lands in the buyer's ranch.
    /// Call assign_slot() afterwards to put it into an active display slot.
    /// Satiety is reset to MAX so the new owner gets a fresh start.
    public entry fun buy_pet(
        dh:            &DappHub,
        dapp_storage:  &mut DappStorage,
        buyer_storage: &mut UserStorage,
        listing:       dapp_service::Listing<SUI>,
        payment:       Coin<SUI>,
        ctx:           &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::not_registered(profile::has(buyer_storage));

        // Decode pet_id before the listing is consumed.
        // record_key layout: [TABLE_NAME_bytes, bcs(pet_id)]
        let record_key = dapp_service::listing_record_key(&listing);
        let key_bytes  = *record_key.borrow(1);
        let mut bcs    = sui::bcs::new(key_bytes);
        let pet_id     = sui::bcs::peel_address(&mut bcs);

        // buy_record writes the pet into buyer_storage keyed by pet_id.
        let change = pet::buy<SUI>(dh, dapp_storage, listing, buyer_storage, payment, ctx);

        // Reset satiety — buyer gets a fresh start.
        pet::set_satiety(buyer_storage, pet_id, MAX_SATIETY, ctx);

        return_change(change, ctx);
    }

    /// Cancel a pet listing and return the pet to the seller's ranch.
    /// No slot is auto-assigned — call assign_slot() to reactivate.
    public entry fun cancel_pet_listing(
        user_storage: &mut UserStorage,
        listing:      dapp_service::Listing<SUI>,
        ctx:          &mut TxContext,
    ) {
        // restore_record writes the pet back at pet_id in user_storage.
        // Pet lands in ranch — no slot assignment needed.
        pet::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    // ─── Helpers (private) ────────────────────────────────────────────────────

    fun egg_balance(user_storage: &UserStorage, egg_type: u8): u64 {
        if      (egg_type == EGG_COMMON)   { if (common_egg::has(user_storage))   { common_egg::get(user_storage) }   else { 0 } }
        else if (egg_type == EGG_RARE)     { if (rare_egg::has(user_storage))     { rare_egg::get(user_storage) }     else { 0 } }
        else                               { if (seasonal_egg::has(user_storage)) { seasonal_egg::get(user_storage) } else { 0 } }
    }

    fun deduct_egg(user_storage: &mut UserStorage, egg_type: u8, amount: u64, ctx: &mut TxContext) {
        if      (egg_type == EGG_COMMON)   { common_egg::sub(user_storage, amount, ctx)   }
        else if (egg_type == EGG_RARE)     { rare_egg::sub(user_storage, amount, ctx)     }
        else                               { seasonal_egg::sub(user_storage, amount, ctx) }
    }

    fun hatch_duration_ms(dapp_storage: &DappStorage, egg_type: u8): u64 {
        if      (egg_type == EGG_COMMON)   { pet_config::get_common_hatch_ms(dapp_storage)   }
        else if (egg_type == EGG_RARE)     { pet_config::get_rare_hatch_ms(dapp_storage)     }
        else                               { pet_config::get_seasonal_hatch_ms(dapp_storage) }
    }

    /// Scan all owned slots to find which slot (if any) contains `pet_id`.
    /// Returns (true, slot_index) or (false, 0).
    /// MAX_PET_SLOTS is 3, so this loop is O(1) in practice.
    fun find_pet_slot(user_storage: &UserStorage, pet_id: address, slots_owned: u8): (bool, u8) {
        let mut i = 0u8;
        while (i < slots_owned) {
            if (pet_slot_index::has(user_storage, i) && pet_slot_index::get(user_storage, i) == pet_id) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }

    fun roll_pet(gen: &mut sui::random::RandomGenerator, egg_type: u8): (u8, u8) {
        let roll_s = random::generate_u8_in_range(gen, 0, 99);
        let roll_r = random::generate_u8_in_range(gen, 0, 99);

        if (egg_type == EGG_COMMON) {
            let species = if (roll_s < 70) { SPECIES_BUNNY } else { SPECIES_CHICK };
            (species, RARITY_COMMON)
        } else if (egg_type == EGG_RARE) {
            let species = if (roll_s < 60) { SPECIES_FOX } else if (roll_s < 95) { SPECIES_DEER } else { SPECIES_DRAGON };
            let rarity  = if (roll_r < 70) { RARITY_COMMON } else if (roll_r < 95) { RARITY_UNCOMMON } else { RARITY_RARE };
            (species, rarity)
        } else {
            let species = if (roll_s < 60) { SPECIES_FOX } else if (roll_s < 95) { SPECIES_DEER } else { SPECIES_DRAGON };
            let rarity  = if (roll_r < 50) { RARITY_UNCOMMON } else { RARITY_RARE };
            (species, rarity)
        }
    }

    /// Bunny=Carrot(3), Chick=Wheat(1), Fox=Pumpkin(4), Deer=Corn(2), Dragon=any
    fun is_favorite_food(species: u8, crop_type: u8): bool {
        if      (species == SPECIES_BUNNY) { crop_type == 3 }
        else if (species == SPECIES_CHICK) { crop_type == 1 }
        else if (species == SPECIES_FOX)   { crop_type == 4 }
        else if (species == SPECIES_DEER)  { crop_type == 2 }
        else                               { true }
    }

    fun compute_satiety_drain(fed_at: u64, now: u64): u8 {
        if (now <= fed_at) return 0;
        let elapsed   = now - fed_at;
        let intervals = elapsed / SATIETY_DRAIN_INTERVAL_MS;
        let drain     = intervals * (SATIETY_DRAIN_AMOUNT as u64);
        if (drain >= (MAX_SATIETY as u64)) { MAX_SATIETY } else { drain as u8 }
    }

    fun compute_level_up(old_level: u8, old_xp: u32, added_xp: u32): (u8, u32) {
        let mut level = old_level;
        let mut xp    = old_xp + added_xp;
        while (level < MAX_LEVEL && xp >= XP_PER_LEVEL) {
            xp    = xp - XP_PER_LEVEL;
            level = level + 1;
        };
        if (level >= MAX_LEVEL) { xp = 0 };
        (level, xp)
    }

    fun clamp_u8(val: u8, max: u8): u8 {
        if (val > max) { max } else { val }
    }

    fun burn_crops(user_storage: &mut UserStorage, crop_type: u8, amount: u64, ctx: &mut TxContext) {
        use harvest::wheat;
        use harvest::corn;
        use harvest::carrot;
        use harvest::pumpkin;
        if      (crop_type == 1) { wheat::sub(user_storage, amount, ctx)   }
        else if (crop_type == 2) { corn::sub(user_storage, amount, ctx)    }
        else if (crop_type == 3) { carrot::sub(user_storage, amount, ctx)  }
        else                     { pumpkin::sub(user_storage, amount, ctx) }
    }

    fun return_change(change: Coin<SUI>, ctx: &TxContext) {
        if (coin::value(&change) > 0) {
            sui::transfer::public_transfer(change, ctx.sender());
        } else {
            coin::destroy_zero(change);
        };
    }
}
