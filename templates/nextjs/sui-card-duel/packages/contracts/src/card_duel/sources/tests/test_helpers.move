/// Shared scaffolding for card_duel unit tests.
#[test_only]
module card_duel::test_helpers {
    use sui::test_scenario::{Self, Scenario};
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use card_duel::init_test;
    use card_duel::deploy_hook;
    use card_duel::player_system;

    const ADMIN: address = @0xAD;

    public fun admin(): address { ADMIN }

    /// Begin a scenario as ADMIN with a fully initialised DappStorage
    /// (game_config set, arena object created and shared by deploy_hook).
    public fun setup(): (Scenario, DappStorage) {
        let mut sc = test_scenario::begin(ADMIN);
        let mut ds = init_test::create_dapp_storage_for_testing(sc.ctx());
        deploy_hook::run(&mut ds, sc.ctx());
        (sc, ds)
    }

    /// Create and register a player owned by `addr`.
    /// Leaves the scenario positioned on a tx sent by `addr`.
    public fun new_player(sc: &mut Scenario, ds: &DappStorage, addr: address): UserStorage {
        sc.next_tx(addr);
        let mut us = init_test::create_user_storage_for_testing(addr, sc.ctx());
        player_system::register(ds, &mut us, sc.ctx());
        us
    }
}
