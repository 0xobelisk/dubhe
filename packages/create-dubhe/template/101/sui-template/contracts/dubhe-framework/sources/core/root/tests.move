#[test_only]
module dubhe::root_tests {
    use dubhe::root_schema::Root;
    use dubhe::root_schema;
    use dubhe::root_system;
    use sui::test_scenario;

    public struct USDT has drop {}

    #[test]
    public fun root_key() {
        let mut scenario = test_scenario::begin(@0xA);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            root_schema::init_root_for_testing(ctx);
            test_scenario::next_tx(&mut scenario,@0xA);
        };

        let mut root = test_scenario::take_shared<Root>(&scenario);
        assert!(root.borrow_key().get() == @0xA, 0);

        {
            let ctx = test_scenario::ctx(&mut scenario);
            root_system::set_key(&mut root, @0xB, ctx);
            test_scenario::next_tx(&mut scenario,@0xB);
        };
        assert!(root.borrow_key().get() == @0xB, 0);

        {
            let ctx = test_scenario::ctx(&mut scenario);
            root_system::remove_key(&mut root, ctx);
            test_scenario::next_tx(&mut scenario,@0xC);
        };
        assert!(root.borrow_key().try_get() == option::none<address>(), 0);

        test_scenario::return_shared<Root>(root);
        scenario.end();
    }
}