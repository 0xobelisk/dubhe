module card_duel::arena_system {
    use std::ascii::String;
    use dubhe::dapp_service::{DappStorage, UserStorage, ObjectStorage};
    use dubhe::dapp_system;
    use card_duel::dapp_key::DappKey;
    use card_duel::error;
    use card_duel::gold;
    use card_duel::profile;
    use card_duel::arena::{Self, Arena};
    use card_duel::migrate;

    /// Set the arena display metadata. Admin only.
    public entry fun configure_arena(
        dapp_storage: &DappStorage,
        arena:        &mut ObjectStorage<Arena>,
        name:         String,
        season:       u8,
        ctx:          &TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
        arena::set_name(arena, name);
        arena::set_season(arena, season);
    }

    /// Withdraw accumulated rake from the arena treasury into the admin's
    /// own UserStorage gold balance.
    public entry fun withdraw_rake(
        dapp_storage: &DappStorage,
        arena:        &mut ObjectStorage<Arena>,
        user_storage: &mut UserStorage,
        amount:       u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
        error::not_registered(profile::has(user_storage));
        gold::transfer_arena_to_user(arena, user_storage, amount, ctx);
    }

    /// Update the global game configuration. Admin only.
    public entry fun set_game_config(
        dapp_storage:    &mut DappStorage,
        pack_price:      u64,
        starting_gold:   u64,
        rake_bps:        u64,
        max_hp:          u64,
        turn_timeout_ms: u64,
        ctx:             &TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_dapp_admin<DappKey>(dapp_storage, ctx.sender());
        card_duel::game_config::set(
            dapp_storage, pack_price, starting_gold, rake_bps, max_hp, turn_timeout_ms,
        );
    }
}
