#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::counter1;
    use dubhe::dapp_system;
    use counter::dapp_key::DappKey;

    const DEPLOYER: address = @0xA;

    #[test]
    public fun inc() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let dh = dapp_system::create_dapp_hub_for_testing(ctx);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            counter_system::inc(&dh, &mut us, 10, ctx);
            assert!(counter1::get(&us) == 10);

            counter_system::inc(&dh, &mut us, 10, ctx);
            assert!(counter1::get(&us) == 20);

            dapp_system::destroy_dapp_hub(dh);
            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }
}
