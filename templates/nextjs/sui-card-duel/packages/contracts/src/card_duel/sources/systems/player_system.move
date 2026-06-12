module card_duel::player_system {
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_system;
    use card_duel::dapp_key::DappKey;
    use card_duel::migrate;
    use card_duel::error;
    use card_duel::gold;
    use card_duel::profile;
    use card_duel::battle_state;
    use card_duel::deck;
    use card_duel::game_config;
    use card_duel::card_system;

    const RATING_START: u32 = 1200;

    /// One-time player registration: starting gold, a 5-card starter deck and
    /// an empty ladder profile. The UserStorage itself is created beforehand
    /// with dapp_system::create_user_storage.
    public entry fun register(
        dapp_storage: &DappStorage,
        user_storage: &mut UserStorage,
        ctx:          &mut TxContext,
    ) {
        dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
        dapp_system::ensure_not_paused<DappKey>(dapp_storage);
        error::already_registered(!profile::has(user_storage));

        gold::set(user_storage, game_config::get_starting_gold(dapp_storage), ctx);
        profile::set(user_storage, 0, 0, RATING_START, ctx);
        // match_id @0x0 means "not in a match"
        battle_state::set(user_storage, @0x0, 0, 0, ctx);

        // Mint the starter cards and select them as the battle deck.
        let starter_ids = card_system::mint_starter_cards(user_storage, ctx);
        deck::set(user_storage, starter_ids, ctx);
    }
}
