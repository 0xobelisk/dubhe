module card_duel::card_system {
    use sui::random::{Self, Random};
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_system;
    use card_duel::dapp_key::DappKey;
    use card_duel::migrate;
    use card_duel::error;
    use card_duel::gold;
    use card_duel::profile;
    use card_duel::card;
    use card_duel::deck;
    use card_duel::game_config;

    // ─── Card kinds (enum CardKind) ─────────────────────────────────────────
    const KIND_STRIKE:   u8 = 1;
    const KIND_FIREBALL: u8 = 2;
    const KIND_HEAL:     u8 = 3;
    const KIND_SHIELD:   u8 = 4;

    // ─── Rarities (enum Rarity) ─────────────────────────────────────────────
    const RARITY_COMMON: u8 = 0;
    const RARITY_RARE:   u8 = 1;
    const RARITY_EPIC:   u8 = 2;

    const DECK_SIZE: u64 = 5;

    // ─── Card pack ──────────────────────────────────────────────────────────

    /// Buy one card pack and mint a random card.
    /// kind roll:   Strike 40% / Fireball 25% / Heal 20% / Shield 15%
    /// rarity roll: Common 70% / Rare 25% / Epic 5%
    public entry fun open_pack(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        rng:          &Random,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::not_registered(profile::has(user_storage));

        let price = game_config::get_pack_price(dapp_storage);
        error::insufficient_gold(gold::get(user_storage) >= price);
        gold::sub(user_storage, price, ctx);

        let mut gen = random::new_generator(rng, ctx);
        let (kind, rarity) = roll_card(&mut gen);

        // fresh_object_address gives a globally-unique card id with no counter.
        let card_id = ctx.fresh_object_address();
        card::mint(user_storage, card_id, kind, base_power(kind, rarity), rarity, ctx);
    }

    /// Select exactly 5 owned, distinct cards as the battle deck.
    public entry fun set_deck(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        card_ids:     vector<address>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::not_registered(profile::has(user_storage));
        error::deck_wrong_size(card_ids.length() == DECK_SIZE);

        let mut i = 0;
        while (i < DECK_SIZE) {
            let id = *card_ids.borrow(i);
            error::card_not_found(card::has(user_storage, id));
            // Reject duplicates: id must not appear later in the list.
            let mut j = i + 1;
            while (j < DECK_SIZE) {
                error::deck_duplicate_card(*card_ids.borrow(j) != id);
                j = j + 1;
            };
            i = i + 1;
        };

        deck::set(user_storage, card_ids, ctx);
    }

    // ─── Package helpers ────────────────────────────────────────────────────

    /// Mint the fixed starter set (3x Strike, Fireball, Shield — all Common)
    /// and return the new card ids in deck order. Attack-heavy so a duel can
    /// always be decided by knockout.
    public(package) fun mint_starter_cards(
        user_storage: &mut UserStorage,
        ctx:          &mut TxContext,
    ): vector<address> {
        let kinds = vector[KIND_STRIKE, KIND_STRIKE, KIND_STRIKE, KIND_FIREBALL, KIND_SHIELD];
        let mut ids = vector::empty<address>();
        let mut i = 0;
        while (i < kinds.length()) {
            let kind = *kinds.borrow(i);
            let card_id = ctx.fresh_object_address();
            card::mint(user_storage, card_id, kind, base_power(kind, RARITY_COMMON), RARITY_COMMON, ctx);
            ids.push_back(card_id);
            i = i + 1;
        };
        ids
    }

    /// Damage / heal / shield strength for a kind+rarity combination.
    public(package) fun base_power(kind: u8, rarity: u8): u32 {
        let base: u32 = if (kind == KIND_STRIKE) { 12 }
            else if (kind == KIND_FIREBALL) { 18 }
            else if (kind == KIND_HEAL) { 10 }
            else { 8 };
        if (rarity == RARITY_RARE) { base + base / 3 }
        else if (rarity == RARITY_EPIC) { base + (base * 3) / 4 }
        else { base }
    }

    public(package) fun kind_strike(): u8 { KIND_STRIKE }
    public(package) fun kind_fireball(): u8 { KIND_FIREBALL }
    public(package) fun kind_heal(): u8 { KIND_HEAL }
    public(package) fun kind_shield(): u8 { KIND_SHIELD }
    public(package) fun deck_size(): u64 { DECK_SIZE }

    /// True if `kind` is an offensive card (targets the opponent).
    public(package) fun is_attack_kind(kind: u8): bool {
        kind == KIND_STRIKE || kind == KIND_FIREBALL
    }

    /// True if `kind` is a self-targeted card (heal or shield).
    public(package) fun is_defense_kind(kind: u8): bool {
        kind == KIND_HEAL || kind == KIND_SHIELD
    }

    fun roll_card(gen: &mut sui::random::RandomGenerator): (u8, u8) {
        let roll_k = random::generate_u8_in_range(gen, 0, 99);
        let roll_r = random::generate_u8_in_range(gen, 0, 99);

        let kind = if (roll_k < 40) { KIND_STRIKE }
            else if (roll_k < 65) { KIND_FIREBALL }
            else if (roll_k < 85) { KIND_HEAL }
            else { KIND_SHIELD };

        let rarity = if (roll_r < 70) { RARITY_COMMON }
            else if (roll_r < 95) { RARITY_RARE }
            else { RARITY_EPIC };

        (kind, rarity)
    }
}
