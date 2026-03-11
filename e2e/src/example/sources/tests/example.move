#[test_only]
module example::example_test {
    use sui::test_scenario;
    use example::init_test;
    use example::example_system;
    use example::component32;
    use example::resource9;
    use std::ascii::string;

    #[test]
    public fun test_resources() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        example_system::resources(&mut dapp_hub, resource_account, ctx);

        // Verify keyed resource9: (player=@0xA, name=["Hello World"], age=42)
        let (name, age) = resource9::get(&dapp_hub, resource_account, @0xA);
        assert!(name == vector[string(b"Hello World")]);
        assert!(age == 42u32);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    public fun test_components() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        let resource_account = deployer.to_ascii_string();
        let ctx = test_scenario::ctx(&mut scenario);

        example_system::components(&mut dapp_hub, resource_account, ctx);

        // Spot-check: component32 should hold "Hello"
        assert!(component32::get(&dapp_hub, resource_account) == string(b"Hello"));

        dapp_hub.destroy();
        scenario.end();
    }
}
