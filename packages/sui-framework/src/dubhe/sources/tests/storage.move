#[test_only]
module dubhe::storage_tests {
    use dubhe::storage_double_map;
    use dubhe::storage_map;
    use sui::test_scenario;
    use dubhe::storage_value;
    use dubhe::dubhe_dapp_key::DappKey;
    public struct TestValue has drop, copy, store {
        value: u64,
    }

    #[test]
    public fun test_value() {
        let deployer = @0x0001;
        let mut scenario = test_scenario::begin(deployer);
        let mut schema = dubhe::dubhe_init_test::deploy_dapp_for_testing(&mut scenario);

        dubhe::dubhe_gov_system::set_dapp_per_set_fee(&mut schema, @dubhe, 100000, test_scenario::ctx(&mut scenario));
        dubhe::dubhe_gov_system::set_dapp_remaining_set_count(&mut schema, @dubhe, 2, test_scenario::ctx(&mut scenario));

        let dubhe_asset_id = 1;
        let dapp_key = dubhe::dubhe_dapp_key::new();
        let package_id = dubhe::type_info::get_package_id<DappKey>();
        let amount = 10 * 100000;
        dubhe::dubhe_assets_system::mint_asset(&mut schema, dapp_key, dubhe_asset_id, package_id, amount);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut value = storage_value::new<TestValue>(b"value", ctx);
        
        value.set(&mut schema, dapp_key, TestValue { value: 1 });

        assert!(value.contains() == true);
        assert!(value.get() == TestValue { value: 1 });
        assert!(value[] == TestValue { value: 1 });

        value.set(&mut schema, dapp_key, TestValue { value: 2 });
        assert!(value.get() == TestValue { value: 2 });
        value.set(&mut schema, dapp_key, TestValue { value: 3 });
        assert!(value.get() == TestValue { value: 3 });
        assert!(value.try_get() == option::some(TestValue { value: 3 }));
        assert!(value.is_empty() == false);

        value.remove();
        assert!(value.contains() == false);
        assert!(value.try_get() == option::none<TestValue>());
        assert!(value.is_empty() == true);

        value.set(&mut schema, dapp_key, TestValue { value: 4 });
        assert!(value.contains() == true);
        assert!(value.try_remove() == option::some(TestValue { value: 4 }));
        assert!(value.try_remove() == option::none<TestValue>());
        assert!(value.contains() == false);

        std::debug::print(&dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, deployer));
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, deployer) == 2 * 100000);
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, package_id) == 10 * 100000 - 2 * 100000);

        // let x: u64 = 0;
        // x.range_do!(100, |x| {
        //     value.set(&mut schema, dapp_key, TestValue { value: x });
        // });

        test_scenario::return_shared(schema);
        value.drop();
        scenario.end();
    }

    #[test]
    public fun test_map() {
        let deployer = @0x0001;
        let mut scenario = test_scenario::begin(deployer);
        let mut schema = dubhe::dubhe_init_test::deploy_dapp_for_testing(&mut scenario);

        dubhe::dubhe_gov_system::set_dapp_per_set_fee(&mut schema, @dubhe, 100000, test_scenario::ctx(&mut scenario));
        dubhe::dubhe_gov_system::set_dapp_remaining_set_count(&mut schema, @dubhe, 2, test_scenario::ctx(&mut scenario));

        let dubhe_asset_id = 1;
        let dapp_key = dubhe::dubhe_dapp_key::new();
        let package_id = dubhe::type_info::get_package_id<DappKey>();
        let amount = 100 * 100000;
        dubhe::dubhe_assets_system::mint_asset(&mut schema, dapp_key, dubhe_asset_id, package_id, amount);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut map = storage_map::new(b"TestValueMap", ctx);
        assert!(map.is_empty() == true);
        assert!(map.length() == 0);
        map.set(&mut schema, dapp_key, 0, TestValue { value: 0 });
        map.set(&mut schema, dapp_key, 1, TestValue { value: 1 });
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, deployer) == 0);
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, package_id) == 100 * 100000);

        map.set(&mut schema, dapp_key, 2, TestValue { value: 2 });
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, deployer) == 1 * 100000);
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, package_id) == 100 * 100000 - 1 * 100000);

        assert!(map[0] == TestValue { value: 0 });
        assert!(map.get(0) == TestValue { value: 0 });
        assert!(map.try_get(0) == option::some(TestValue { value: 0 }));
        assert!(map[1] == TestValue { value: 1 });
        assert!(map.get(1) == TestValue { value: 1 });
        assert!(map.try_get(1) == option::some(TestValue { value: 1 }));
        assert!(map[2] == TestValue { value: 2 });
        assert!(map.get(2) == TestValue { value: 2 });
        assert!(map.try_get(2) == option::some(TestValue { value: 2 }));
        assert!(map.try_get(3) == option::none());
        assert!(map.contains(0) == true);
        assert!(map.contains(1) == true);
        assert!(map.contains(2) == true);
        assert!(map.contains(3) == false);
        assert!(map.is_empty() == false);
        assert!(map.length() == 3);

        map.remove(1);
        assert!(map.try_get(1) == option::none());
        assert!(map.contains(0) == true);
        assert!(map.contains(1) == false);
        assert!(map.contains(2) == true);
        assert!(map.length() == 2);

        assert!(map.try_remove(2) == option::some(TestValue { value: 2 }));
        assert!(map.contains(2) == false);
        assert!(map.length() == 1);

        let x: u64 = 1;
        x.range_do!(80, |x| {
            map.set(&mut schema, dapp_key, x, TestValue { value: x });
        });
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, deployer) == 80 * 100000);
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, package_id) == 100 * 100000 - 80 * 100000);

        map.drop();
        test_scenario::return_shared(schema);
        scenario.end();
        
    }

    #[test]
    public fun test_double_map() {
       let deployer = @0x0001;
        let mut scenario = test_scenario::begin(deployer);
        let mut schema = dubhe::dubhe_init_test::deploy_dapp_for_testing(&mut scenario);

        dubhe::dubhe_gov_system::set_dapp_per_set_fee(&mut schema, @dubhe, 100000, test_scenario::ctx(&mut scenario));
        dubhe::dubhe_gov_system::set_dapp_remaining_set_count(&mut schema, @dubhe, 2, test_scenario::ctx(&mut scenario));

        let dubhe_asset_id = 1;
        let dapp_key = dubhe::dubhe_dapp_key::new();
        let package_id = dubhe::type_info::get_package_id<DappKey>();
        let amount = 100 * 100000;
        dubhe::dubhe_assets_system::mint_asset(&mut schema, dapp_key, dubhe_asset_id, package_id, amount);

        let ctx = test_scenario::ctx(&mut scenario);

        let mut double_map = storage_double_map::new(b"TestValueDoubleMap", ctx);

        double_map.set(&mut schema, dapp_key, 0, 0, TestValue { value: 0 });
        double_map.set(&mut schema, dapp_key, 0, 1, TestValue { value: 1 });
        double_map.set(&mut schema, dapp_key, 0, 2, TestValue { value: 2 });

        assert!(double_map.contains(0, 0));
        assert!(double_map.contains(0, 1));
        assert!(double_map.contains(0, 2));
        assert!(double_map.length() == 3);
        assert!(double_map.is_empty() == false);

        assert!(double_map.get(0, 0) == TestValue { value: 0 });
        assert!(double_map[0, 0] == TestValue { value: 0 });
        assert!(double_map.try_get(0, 0) == option::some(TestValue { value: 0 }));
        assert!(double_map.get(0, 1) == TestValue { value: 1 });
        assert!(double_map[0, 1] == TestValue { value: 1 });
        assert!(double_map.try_get(0, 1) == option::some(TestValue { value: 1 }));
        assert!(double_map.get(0, 2) == TestValue { value: 2 });
        assert!(double_map[0, 2] == TestValue { value: 2 });
        assert!(double_map.try_get(0, 2) == option::some(TestValue { value: 2 }));

        double_map.remove(0, 1);
        assert!(double_map.try_get(0, 1) == option::none());
        assert!(double_map.contains(0, 1) == false);
        assert!(double_map.length() == 2);

        assert!(double_map.try_remove(0, 2) == option::some(TestValue { value: 2 }));
        assert!(double_map.try_get(0, 2) == option::none());
        assert!(double_map.contains(0, 2) == false);
        assert!(double_map.length() == 1);

        let x: u32 = 1;
        x.range_do!(80, |x| {
            double_map.set(&mut schema, dapp_key, x, x, TestValue { value: x as u64 });
        });
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, deployer) == 80 * 100000);
        assert!(dubhe::dubhe_assets_system::balance_of(&mut schema, dubhe_asset_id, package_id) == 100 * 100000 - 80 * 100000);

        double_map.drop();
        test_scenario::return_shared(schema);
        scenario.end();
    }

}