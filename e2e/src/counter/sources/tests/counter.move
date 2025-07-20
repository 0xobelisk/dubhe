#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::init_test;
    use counter::value;

    #[test]
    public fun inc() {
        let deployer = @0xA;
        let mut scenario  = test_scenario::begin(deployer);

        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        counter_system::inc(&mut dapp_hub);
        assert!(value::get(&dapp_hub) == 1);

        counter_system::inc(&mut dapp_hub);
        assert!(value::get(&dapp_hub) == 2);

        dapp_hub.destroy();
        scenario.end();
    }
}
