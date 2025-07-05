module example::example_test {
    use sui::test_scenario;
    use example::init_test;
    use example::example_system;

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