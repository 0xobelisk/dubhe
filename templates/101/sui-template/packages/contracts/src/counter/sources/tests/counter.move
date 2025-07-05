#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::init_test;
    use counter::counter1;
    use counter::counter2;

    #[test]
    public fun inc() {
        let deployer = @0xA;
        let mut scenario  = test_scenario::begin(deployer);

        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        counter_system::inc(&mut dapp_hub, 10, ctx);
        assert!(counter1::get(&dapp_hub, ctx.sender()) == 10);
        assert!(counter2::get(&dapp_hub) == 10);

        counter_system::inc(&mut dapp_hub, 20, ctx);
        assert!(counter1::get(&dapp_hub, ctx.sender()) == 30);
        assert!(counter2::get(&dapp_hub) == 30);

        dapp_hub.destroy();
        scenario.end();
    }
}
