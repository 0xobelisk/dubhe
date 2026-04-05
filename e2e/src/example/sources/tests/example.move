#[test_only]
module example::example_test {
    use sui::test_scenario;
    use example::example_system;
    use dubhe::dapp_system;
    use example::dapp_key::DappKey;

    // resources
    use example::resource0;
    use example::resource1;
    use example::resource3;
    use example::resource4;
    use example::resource5;
    use example::resource9;

    // components
    use example::component0;
    use example::component3;
    use example::component6;
    use example::component8;
    use example::component17;
    use example::component18;
    use example::component19;
    use example::component20;
    use example::component21;
    use example::component22;
    use example::component25;
    use example::component26;
    use example::component32;
    use example::component33;

    use example::direction;
    use std::ascii::string;

    const DEPLOYER: address = @0xA;

    // ─── resources ──────────────────────────────────────────────────────────

    #[test]
    public fun test_resources() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            example_system::resources(&mut us, ctx);

            // resource0 — simple u32 (no extra keys)
            assert!(resource0::get(&us) == 42u32);
            assert!(resource0::has(&us));

            // resource1 — multi-field, no keys
            let (player_got, val_got) = resource1::get(&us);
            assert!(player_got == @0xA);
            assert!(val_got == 42u32);
            assert!(resource1::has(&us));

            // resource3 — Direction enum single-value
            assert!(resource3::get(&us) == direction::new_east());

            // resource4 — keyed by player
            assert!(resource4::get(&us, @0xA) == 42u32);
            assert!(resource4::has(&us, @0xA));
            assert!(!resource4::has(&us, @0xB));

            // resource5 — two-key (player, id) → u32
            assert!(resource5::get(&us, @0xA, 1u32) == 42u32);

            // resource9 — keyed (player) → (vector<String>, u32)
            let (name, age) = resource9::get(&us, @0xA);
            assert!(name == vector[string(b"Hello World")]);
            assert!(age == 42u32);

            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }

    // ─── ensure_has / delete ────────────────────────────────────────────────

    #[test]
    public fun test_resource_ensure_has_and_delete() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            resource0::ensure_has_not(&us);

            resource0::set(&mut us, 7u32, ctx);
            resource0::ensure_has(&us);
            assert!(resource0::get(&us) == 7u32);

            resource0::delete(&mut us, ctx);
            assert!(!resource0::has(&us));

            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }

    // ─── components ─────────────────────────────────────────────────────────

    #[test]
    public fun test_components() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            example_system::components(&mut us, ctx);

            // component0 — presence flag (bool)
            assert!(component0::get(&us));
            assert!(component0::has(&us));

            // component3 — simple u32
            assert!(component3::get(&us) == 42u32);

            // component6 — multi-field {attack, hp}
            let (attack, hp) = component6::get(&us);
            assert!(attack == 10u32);
            assert!(hp == 100u32);
            assert!(component6::get_attack(&us) == 10u32);
            assert!(component6::get_hp(&us) == 100u32);

            // component8 — enum Direction
            assert!(component8::get(&us) == direction::new_east());

            // numeric types
            assert!(component17::get(&us) == 42u32);
            assert!(component18::get(&us) == 42u64);
            assert!(component19::get(&us) == 42u128);
            assert!(component20::get(&us) == 42u256);
            assert!(component21::get(&us) == @0xA);
            assert!(component22::get(&us) == true);

            // vector types
            assert!(component25::get(&us) == vector[42u32]);

            // string types
            assert!(component32::get(&us) == string(b"Hello"));
            assert!(component33::get(&us) == vector[string(b"Hello")]);

            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }

    // ─── component ensure_has / delete ──────────────────────────────────────

    #[test]
    public fun test_component_ensure_has_and_delete() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            component3::ensure_has_not(&us);

            component3::set(&mut us, 99u32, ctx);
            component3::ensure_has(&us);
            assert!(component3::get(&us) == 99u32);

            component3::delete(&mut us, ctx);
            assert!(!component3::has(&us));

            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }

    // ─── vector<u64> component ──────────────────────────────────────────────

    #[test]
    public fun test_vector_u64_component() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            component26::set(&mut us, vector[42u64], ctx);
            assert!(component26::get(&us) == vector[42u64]);

            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }
}
