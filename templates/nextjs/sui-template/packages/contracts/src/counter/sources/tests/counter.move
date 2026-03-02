#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::init_test;
    use counter::counter1;
    use counter::counter2;
    use dubhe::address_system;

    #[test]
    public fun inc() {
        let deployer = @0xA;
        let mut scenario = test_scenario::begin(deployer);

        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // Resolve sender as String (hex-encoded address), matching ensure_origin behavior
        let sender = address_system::ensure_origin(ctx);

        // First increment: number=10, data_key=10u64
        counter_system::inc(&mut dapp_hub, 10, ctx);
        assert!(counter1::get(&dapp_hub, sender) == 10);
        assert!(counter2::has(&dapp_hub, sender, 10u64));
        assert!(counter2::get(&dapp_hub, sender, 10u64) == 10);

        // Second increment: number=20, data_key=20u64 (different key, counter1 accumulates)
        counter_system::inc(&mut dapp_hub, 20, ctx);
        assert!(counter1::get(&dapp_hub, sender) == 30);
        assert!(counter2::has(&dapp_hub, sender, 20u64));
        assert!(counter2::get(&dapp_hub, sender, 20u64) == 20);

        // Third increment: number=10 again, same data_key=10u64, value accumulates
        counter_system::inc(&mut dapp_hub, 10, ctx);
        assert!(counter1::get(&dapp_hub, sender) == 40);
        assert!(counter2::get(&dapp_hub, sender, 10u64) == 20);

        dapp_hub.destroy();
        scenario.end();
    }
}
