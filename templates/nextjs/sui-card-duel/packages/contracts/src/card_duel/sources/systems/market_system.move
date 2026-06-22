/// Public entry wrappers for the card / gold marketplace (listable codegen).
///
/// The framework's take_record / buy_record enforce
/// `ctx.sender() == canonical_owner(user_storage)`, so session keys are
/// rejected at the framework level — no extra check needed here.
///
/// CoinType = 0x2::sui::SUI (prices denominated in MIST).
module card_duel::market_system {
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use dubhe::dapp_service::{DappHub, DappStorage, UserStorage, Listing};
    use dubhe::dapp_system;
    use card_duel::dapp_key::DappKey;
    use card_duel::migrate;
    use card_duel::error;
    use card_duel::battle_state;
    use card_duel::card;
    use card_duel::deck;
    use card_duel::gold;

    // ── Card NFT market ────────────────────────────────────────────────────

    /// List an owned card for sale. The card is removed from the seller's
    /// storage; if it was part of the battle deck the deck becomes invalid
    /// until set_deck is called again, so listing is blocked mid-match.
    public entry fun list_card(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        card_id:      address,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        error::card_not_found(card::has(user_storage, card_id));
        error::already_in_match(battle_state::get_match_id(user_storage) == @0x0);

        // Remove the card from the battle deck if present.
        if (deck::has(user_storage)) {
            let current = deck::get(user_storage);
            let (found, idx) = current.index_of(&card_id);
            if (found) {
                let mut updated = current;
                updated.remove(idx);
                deck::set(user_storage, updated, ctx);
            };
        };

        card::list<SUI>(user_storage, card_id, price, std::option::none(), ctx);
    }

    public entry fun buy_card(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = card::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun cancel_card_listing(
        listing:      Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        card::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    // ── Gold market (fungible) ─────────────────────────────────────────────

    public entry fun list_gold(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        amount:       u64,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        gold::list<SUI>(user_storage, amount, price, std::option::none(), ctx);
    }

    public entry fun buy_gold(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = gold::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun cancel_gold_listing(
        listing:      Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        gold::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    // ── Helper ─────────────────────────────────────────────────────────────

    fun return_change(change: Coin<SUI>, ctx: &TxContext) {
        if (coin::value(&change) > 0) {
            sui::transfer::public_transfer(change, ctx.sender());
        } else {
            coin::destroy_zero(change);
        }
    }
}
