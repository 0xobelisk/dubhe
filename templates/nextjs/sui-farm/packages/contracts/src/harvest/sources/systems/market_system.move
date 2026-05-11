/// Public entry wrappers for the listable crop market.
///
/// The framework's `take_fungible_record` (list) and `buy_fungible_record`
/// (buy) both enforce `ctx.sender() == canonical_owner(user_storage)`, so
/// session keys are rejected at the framework level — no extra check needed
/// here.
///
/// CoinType = 0x2::sui::SUI  (price denominated in MIST)
module harvest::market_system {
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use dubhe::dapp_service::{DappHub, DappStorage, UserStorage};
    use dubhe::dapp_system;
    use harvest::dapp_key::DappKey;
    use harvest::migrate;
    use harvest::wheat;
    use harvest::corn;
    use harvest::carrot;
    use harvest::pumpkin;

    const CROP_WHEAT:   u8 = 1;
    const CROP_CORN:    u8 = 2;
    const CROP_CARROT:  u8 = 3;
    const CROP_PUMPKIN: u8 = 4;

    // ── List a crop batch for sale ─────────────────────────────────────────────

    public entry fun list_wheat(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        amount:       u64,
        price:        u64,   // total price in MIST
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        wheat::list<SUI>(user_storage, amount, price, std::option::none(), ctx);
    }

    public entry fun list_corn(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        amount:       u64,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        corn::list<SUI>(user_storage, amount, price, std::option::none(), ctx);
    }

    public entry fun list_carrot(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        amount:       u64,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        carrot::list<SUI>(user_storage, amount, price, std::option::none(), ctx);
    }

    public entry fun list_pumpkin(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        amount:       u64,
        price:        u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        pumpkin::list<SUI>(user_storage, amount, price, std::option::none(), ctx);
    }

    // ── Buy a listing ──────────────────────────────────────────────────────────
    // The `listing` argument is the shared Listing object.
    // `payment` must be a Coin<SUI> with value >= listing.price.
    // Any overpayment is returned to the buyer.

    public entry fun buy_wheat(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = wheat::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun buy_corn(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = corn::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun buy_carrot(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = carrot::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    public entry fun buy_pumpkin(
        dh:           &DappHub,
        dapp_storage: &mut DappStorage,
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        payment:      Coin<SUI>,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        let change = pumpkin::buy<SUI>(dh, dapp_storage, listing, user_storage, payment, ctx);
        return_change(change, ctx);
    }

    // ── Cancel a listing (seller only) ────────────────────────────────────────

    public entry fun cancel_wheat(
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        wheat::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    public entry fun cancel_corn(
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        corn::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    public entry fun cancel_carrot(
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        carrot::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    public entry fun cancel_pumpkin(
        listing:      dubhe::dapp_service::Listing<SUI>,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        pumpkin::cancel_listing<SUI>(listing, user_storage, ctx);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    fun return_change(change: Coin<SUI>, ctx: &TxContext) {
        if (coin::value(&change) > 0) {
            sui::transfer::public_transfer(change, ctx.sender());
        } else {
            coin::destroy_zero(change);
        }
    }
}
