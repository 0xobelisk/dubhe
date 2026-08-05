/// Public entry wrappers for the built-in marketplace: crafted items (unique)
/// and gold (fungible) can be listed for SUI.
///
/// The framework's list/buy functions enforce `ctx.sender() ==
/// canonical_owner(user_storage)`, so session keys cannot trade on the
/// player's behalf — listing and buying are deliberate owner decisions, not
/// something an agent brain does autonomously.
///
/// CoinType = 0x2::sui::SUI (prices denominated in MIST)
module ville::market_system {
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use dubhe::dapp_service::{DappHub, DappStorage, UserStorage};
    use dubhe::dapp_system;
    use ville::dapp_key::DappKey;
    use ville::migrate;
    use ville::gold;
    use ville::item;

    // ── Items (unique records keyed by item_id) ────────────────────────────

    public entry fun list_item(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        item_id:      address,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        item::list<SUI>(user_storage, item_id, price, std::option::none(), ctx);
    }

    public entry fun buy_item(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = item::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun cancel_item(
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        item::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    // ── Gold (fungible) ────────────────────────────────────────────────────

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
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = gold::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun cancel_gold(
        listing:      dubhe::dapp_service::Listing<SUI>,
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
