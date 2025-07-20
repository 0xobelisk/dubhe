#[test_only]
module dubhe::bridge_tests {
    use dubhe::bridge_system;
    use dubhe::wrapper_system;
    use dubhe::dubhe::DUBHE;
    use dubhe::init_test::deploy_dapp_for_testing;
    use dubhe::assets_system;
    use sui::test_scenario;
    use sui::coin;
    use dubhe::dubhe_asset_id;
    use dubhe::dapp_key;
    use sui::coin::TreasuryCap;
    use dubhe::dubhe;

    #[test]
    public fun bridge() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let sender = @0xB;
        scenario.next_tx(sender);

        let ctx = test_scenario::ctx(&mut scenario);
        let amount = 100 * 10000000;
        let mut treasury_cap = coin::create_treasury_cap_for_testing<DUBHE>(ctx);
        let dubhe = coin::mint(&mut treasury_cap, amount, ctx);

        wrapper_system::wrap(&mut dapp_hub, dubhe, ctx.sender());
        assert!(assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), ctx.sender()) as u64 == amount);

        // set treasury cap
        let dapp_key = dapp_key::new();
        let treasury_cap_key = dubhe::get_treasury_cap_key();
        dapp_hub.get_objects(dapp_key).add<address, TreasuryCap<DUBHE>>(treasury_cap_key, treasury_cap);

        let to = @0x1;
        let amount = 10 * 10000000;
        bridge_system::withdraw(&mut dapp_hub, amount, to, b"Dubhe OS", ctx);
        std::debug::print(&assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), ctx.sender()));
        assert!(assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), ctx.sender()) as u64 == 90 * 10000000);



        let sender = @0xA;
        scenario.next_tx(sender);
        let ctx = test_scenario::ctx(&mut scenario);
        let amount = 10 * 10000000;
        bridge_system::deposit(&mut dapp_hub, ctx.sender(), @0xB, b"Dubhe OS", amount, ctx);
        assert!(assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), @0xB) as u64 == 100 * 10000000);

        dapp_hub.destroy();
        scenario.end();
    }
}