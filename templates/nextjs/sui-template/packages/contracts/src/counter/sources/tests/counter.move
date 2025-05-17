#[test_only]
module counter::counter_test {
    use sui::test_scenario;
    use counter::counter_system;
    use counter::counter_init_test;

    #[test]
    public fun inc() {
        let deployer = @0xA;
        let mut scenario  = test_scenario::begin(deployer);

        let (mut dubhe_schema, mut schema) = counter_init_test::deploy_dapp_for_testing(&mut scenario);

        assert!(schema.value().get() == 0);

        counter_system::inc(&mut dubhe_schema, &mut schema, 10);
        assert!(schema.value().get() == 10);

        counter_system::inc(&mut dubhe_schema, &mut schema, 10);
        assert!(schema.value().get() == 20);

        test_scenario::return_shared(schema);
        test_scenario::return_shared(dubhe_schema);
        scenario.end();
    }
}
