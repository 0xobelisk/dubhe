#[test_only]
module eve_extension::extension_test {
    use std::ascii::string;
    use sui::test_scenario::{Self as ts};
    use dubhe::address_system;
    use eve_extension::extension_config;
    use eve_extension::extension_system;
    use eve_extension::init_test;
    use eve_extension::player_stats;

    #[test]
    fun test_business_flow() {
        let sender = @0x100;
        let mut scenario = ts::begin(sender);
        let ctx = ts::ctx(&mut scenario);

        let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);
        extension_system::initialize(&mut dapp_hub, 20, ctx);
        let (admin, paused, max_units_per_call) = extension_system::read_config(&dapp_hub);
        assert!(admin == sender);
        assert!(!paused);
        assert!(max_units_per_call == 20);

        let player = address_system::ensure_origin(ctx);

        extension_system::record_action(&mut dapp_hub, 5, 1, ctx);
        let (total_units, call_count, last_nonce, tier) = player_stats::get(&dapp_hub, copy player);
        assert!(total_units == 5);
        assert!(call_count == 1);
        assert!(last_nonce == 1);
        assert!(tier == 1);

        extension_system::record_action(&mut dapp_hub, 95, 2, ctx);
        let (total_units2, call_count2, last_nonce2, tier2) = player_stats::get(&dapp_hub, player);
        assert!(total_units2 == 100);
        assert!(call_count2 == 2);
        assert!(last_nonce2 == 2);
        assert!(tier2 == 2);

        extension_system::update_config(&mut dapp_hub, true, 20, ctx);
        let (_, paused_after, _) = extension_config::get(&dapp_hub, string(b"global"));
        assert!(paused_after);

        dapp_hub.destroy();
        ts::end(scenario);
    }
}
