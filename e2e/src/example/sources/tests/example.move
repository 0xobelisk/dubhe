#[test_only]
module example::example_test {
    use sui::test_scenario;
    use example::init_test;
    use example::example_system;
    use std::ascii::string;

    #[test]
    public fun test_single_resource() {
        let deployer = @0xA;
        let mut scenario  = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);
        
        example::component32::set(&mut dapp_hub, deployer, string(b"test"));
        example::component33::set(&mut dapp_hub, deployer, vector[string(b"test")]);
        example::resource8::set(&mut dapp_hub, deployer, string(b"test"));
        example::resource9::set(&mut dapp_hub, deployer, vector[string(b"test"), string(b"test2")], 10);

        assert!(example::component32::get(&dapp_hub, deployer) == string(b"test"));
        assert!(example::component33::get(&dapp_hub, deployer) == vector[string(b"test")]);
        let (player, name) = example::resource8::get(&dapp_hub);
        assert!(player == deployer);
        assert!(name == string(b"test"));
        let (name, age) = example::resource9::get(&dapp_hub, deployer);
        assert!(name == vector[string(b"test"), string(b"test2")]);
        assert!(age == 10);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    public fun test() {
        let deployer = @0xA;
        let mut scenario  = test_scenario::begin(deployer);
        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        example_system::resources(&mut dapp_hub);
        example_system::components(&mut dapp_hub);

        dapp_hub.destroy();
        scenario.end();
    }
}