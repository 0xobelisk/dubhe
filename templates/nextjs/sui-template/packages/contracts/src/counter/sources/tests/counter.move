#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use dubhe::address_system;
    use counter::dapp_key::DappKey;
    use counter::init_test;
    use counter::counter1;

    #[test]
    public fun inc() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);

        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let sender = address_system::ensure_origin<DappKey>(&dapp_hub, ctx);

        counter_system::inc(&mut dapp_hub, 10, ctx);
        assert!(counter1::get(&dapp_hub, sender) == 10);

        counter_system::inc(&mut dapp_hub, 10, ctx);
        assert!(counter1::get(&dapp_hub, sender) == 20);

        dapp_hub.destroy();
        scenario.end();
    }
}
