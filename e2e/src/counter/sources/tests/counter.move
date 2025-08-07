#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::init_test;
    use counter::value;
    use dubhe::dapp_system;
    use counter::dapp_key::DappKey;

    #[test]
    public fun inc() {
        let deployer = @0xA;
        let mut scenario  = test_scenario::begin(deployer);

        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

        counter_system::inc(&mut dapp_hub);
        assert!(value::get(&dapp_hub) == 1);

        // let mut i = 0;
        // while(i < 1000) {
        //     counter_system::inc(&mut dapp_hub);
        //     i = i + 1;
        // };

        let ctx = test_scenario::ctx(&mut scenario);
        dapp_system::set_storage<DappKey>(&mut dapp_hub, 2, ctx);

        assert!(value::get(&dapp_hub) == 2);



        // counter_system::inc(&mut dapp_hub);
        // assert!(value::get(&dapp_hub) == 2);

        dapp_hub.destroy();
        scenario.end();
    }
}
