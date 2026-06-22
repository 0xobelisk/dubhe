module card_duel::deploy_hook {
    use dubhe::dapp_service::DappStorage;
    use card_duel::game_config;
    use card_duel::arena;

    // ─── Default game configuration ────────────────────────────────────────
    const PACK_PRICE: u64      = 100;              // gold per card pack
    const STARTING_GOLD: u64   = 500;              // gold granted on register
    const RAKE_BPS: u64        = 300;              // 3% of every match pot goes to the arena
    // 30 HP keeps duels decidable: a 5-card deck can always deal lethal damage
    // (starter deck: 12+12+12+18 = 54 attack vs 30 HP + 8 shield).
    const MAX_HP: u64          = 30;               // hit points at match start
    const TURN_TIMEOUT_MS: u64 = 5 * 60 * 1000;    // 5 minutes per turn

    /// Arena treasury entity id — fixed so clients and scripts can locate it.
    const ARENA_ENTITY_ID: vector<u8> = b"main";

    public(package) fun run(dapp_storage: &mut DappStorage, ctx: &mut TxContext) {
        game_config::set(
            dapp_storage,
            PACK_PRICE,
            STARTING_GOLD,
            RAKE_BPS,
            MAX_HP,
            TURN_TIMEOUT_MS,
        );

        // Create and share the Arena treasury (ObjectStorage<Arena>).
        // adminOnly: the publisher (DApp admin) is the tx sender at genesis.
        arena::create_arena(dapp_storage, ARENA_ENTITY_ID, ctx);
    }
}
