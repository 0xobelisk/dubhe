#[test_only]
module example::example_test {
    use sui::test_scenario;
    use example::init_test;
    use example::example_system;

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

    // ─── resources ──────────────────────────────────────────────────────────

    #[test]
    public fun test_resources() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        example_system::resources(&mut dapp_hub, resource_account, ctx);

        // resource0 — simple u32 (entity-scoped, no extra keys)
        assert!(resource0::get(&dapp_hub, resource_account) == 42u32);
        assert!(resource0::has(&dapp_hub, resource_account));

        // resource1 — (resource_account, player) → u32  (multi-field, no keys)
        let (player_got, val_got) = resource1::get(&dapp_hub, resource_account);
        assert!(player_got == @0xA);
        assert!(val_got == 42u32);
        assert!(resource1::has(&dapp_hub, resource_account));

        // resource3 — Direction enum single-value
        assert!(resource3::get(&dapp_hub, resource_account) == direction::new_east());

        // resource4 — keyed (resource_account, player) → u32
        assert!(resource4::get(&dapp_hub, resource_account, @0xA) == 42u32);
        assert!(resource4::has(&dapp_hub, resource_account, @0xA));
        assert!(!resource4::has(&dapp_hub, resource_account, @0xB));

        // resource5 — two-key (resource_account, player, id) → u32
        assert!(resource5::get(&dapp_hub, resource_account, @0xA, 1u32) == 42u32);

        // resource9 — keyed (resource_account, player) → (vector<String>, u32)
        let (name, age) = resource9::get(&dapp_hub, resource_account, @0xA);
        assert!(name == vector[string(b"Hello World")]);
        assert!(age == 42u32);

        dapp_hub.destroy();
        scenario.end();
    }

    // ─── ensure_has / delete on entity resources ────────────────────────────

    #[test]
    public fun test_resource_ensure_has_and_delete() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        // Before write: ensure_has_not should not abort
        resource0::ensure_has_not(&dapp_hub, resource_account);

        resource0::set(&mut dapp_hub, resource_account, 7u32, ctx);
        resource0::ensure_has(&dapp_hub, resource_account);
        assert!(resource0::get(&dapp_hub, resource_account) == 7u32);

        resource0::delete(&mut dapp_hub, resource_account);
        assert!(!resource0::has(&dapp_hub, resource_account));

        dapp_hub.destroy();
        scenario.end();
    }

    // ─── components ─────────────────────────────────────────────────────────

    #[test]
    public fun test_components() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        example_system::components(&mut dapp_hub, resource_account, ctx);

        // component0 — presence flag (bool)
        assert!(component0::get(&dapp_hub, resource_account));
        assert!(component0::has(&dapp_hub, resource_account));

        // component3 — simple u32
        assert!(component3::get(&dapp_hub, resource_account) == 42u32);

        // component6 — multi-field {attack, hp}
        let (attack, hp) = component6::get(&dapp_hub, resource_account);
        assert!(attack == 10u32);
        assert!(hp == 100u32);
        // per-field accessors
        assert!(component6::get_attack(&dapp_hub, resource_account) == 10u32);
        assert!(component6::get_hp(&dapp_hub, resource_account) == 100u32);

        // component8 — enum Direction
        assert!(component8::get(&dapp_hub, resource_account) == direction::new_east());

        // numeric types
        assert!(component17::get(&dapp_hub, resource_account) == 42u32);
        assert!(component18::get(&dapp_hub, resource_account) == 42u64);
        assert!(component19::get(&dapp_hub, resource_account) == 42u128);
        assert!(component20::get(&dapp_hub, resource_account) == 42u256);
        assert!(component21::get(&dapp_hub, resource_account) == @0xA);
        assert!(component22::get(&dapp_hub, resource_account) == true);

        // vector types
        assert!(component25::get(&dapp_hub, resource_account) == vector[42u32]);

        // string types
        assert!(component32::get(&dapp_hub, resource_account) == string(b"Hello"));
        assert!(component33::get(&dapp_hub, resource_account) == vector[string(b"Hello")]);

        dapp_hub.destroy();
        scenario.end();
    }

    // ─── component ensure_has / delete ──────────────────────────────────────

    #[test]
    public fun test_component_ensure_has_and_delete() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        // Before write: ensure_has_not must not abort
        component3::ensure_has_not(&dapp_hub, resource_account);

        component3::set(&mut dapp_hub, resource_account, 99u32, ctx);
        component3::ensure_has(&dapp_hub, resource_account);
        assert!(component3::get(&dapp_hub, resource_account) == 99u32);

        component3::delete(&mut dapp_hub, resource_account);
        assert!(!component3::has(&dapp_hub, resource_account));

        dapp_hub.destroy();
        scenario.end();
    }

    // ─── vector<u64> component ──────────────────────────────────────────────

    #[test]
    public fun test_vector_u64_component() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        component26::set(&mut dapp_hub, resource_account, vector[42u64], ctx);
        assert!(component26::get(&dapp_hub, resource_account) == vector[42u64]);

        dapp_hub.destroy();
        scenario.end();
    }
}
