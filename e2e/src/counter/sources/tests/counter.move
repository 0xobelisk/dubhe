#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::value;
    use dubhe::dapp_system;
    use counter::dapp_key::DappKey;

    const DEPLOYER: address = @0xA;

    #[test]
    public fun test_inc() {
        let mut scenario = test_scenario::begin(DEPLOYER);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut us = dapp_system::create_user_storage_for_testing<DappKey>(DEPLOYER, ctx);

            counter_system::inc(&mut us, ctx);
            assert!(value::get(&us) == 1);

            counter_system::inc(&mut us, ctx);
            assert!(value::get(&us) == 2);

            dapp_system::destroy_user_storage(us);
        };
        scenario.end();
    }
}
