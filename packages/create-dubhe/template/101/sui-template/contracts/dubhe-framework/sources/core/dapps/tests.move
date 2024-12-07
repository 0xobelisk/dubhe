#[test_only]
module dubhe::dapps_tests {
    use dubhe::dapps_schema::Dapps;
    use dubhe::dapps_schema;
    use dubhe::dapps_system;
    use std::ascii::string;
    use std::debug;
    use sui::clock;
    use sui::coin;
    use sui::test_scenario;
    use sui::package;
    use sui::package::UpgradeCap;
    use sui::sui::SUI;

    public struct DappKey has drop {}

    #[test]
    public fun dapps_register() {
        let mut scenario = test_scenario::begin(@0xA);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            dapps_schema::init_dapps_for_testing(ctx);
            test_scenario::next_tx(&mut scenario,@0xA);
        };

        let mut dapps = test_scenario::take_shared<Dapps>(&scenario);

        let upgrade_cap = package::test_publish(@0x42.to_id(), scenario.ctx());
        debug::print(&object::id_address<UpgradeCap>(&upgrade_cap));

        let coin = coin::mint_for_testing<SUI>(1_000_000_000, test_scenario::ctx(&mut scenario));

        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        dapps_system::register<UpgradeCap>(
            &mut dapps,
            &upgrade_cap,
            string(b"DappKey"),
            string(b"DappKey"),
            &clock,
            coin,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::next_tx(&mut scenario,@0xA);

        let dapp_id = object::id_address<UpgradeCap>(&upgrade_cap);
        assert!(dapps.borrow_version().get(dapp_id) == 1, 0);
        assert!(dapps.borrow_metadata().contains_key(dapp_id));
        assert!(dapps.borrow_admin().get(dapp_id) == test_scenario::ctx(&mut scenario).sender(), 0);
        assert!(dapps.borrow_safe_mode().get(dapp_id) == false, 0);


        dapps_system::unregister(&mut dapps, &upgrade_cap, test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario,@0xA);

        assert!(!dapps.borrow_version().contains_key(dapp_id));
        assert!(!dapps.borrow_metadata().contains_key(dapp_id));
        assert!(!dapps.borrow_admin().contains_key(dapp_id));
        assert!(!dapps.borrow_safe_mode().contains_key(dapp_id));

        clock::destroy_for_testing(clock);
        test_scenario::return_shared<Dapps>(dapps);
        upgrade_cap.make_immutable();
        scenario.end();
    }
}