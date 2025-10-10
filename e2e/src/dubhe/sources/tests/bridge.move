#[test_only]
module dubhe::bridge_tests {
    use dubhe::bridge_system;
    use dubhe::wrapper_system;
    use dubhe::init_test::deploy_dapp_for_testing;
    use dubhe::assets_system;
    use sui::test_scenario;
    use sui::coin;
    use dubhe::dubhe_asset_id;
    use dubhe::gov_system;
    use std::ascii::string;

    public struct DUBHE has copy, drop { }

    #[test]
    public fun bridge() {
        let sender = @0xA;
        let sender_b = @0xB;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let amount = 100 * 10000000;
        let mut treasury_cap = coin::create_treasury_cap_for_testing<DUBHE>(ctx);
        let dubhe = coin::mint(&mut treasury_cap, amount, ctx);

        gov_system::force_register_wrapped_asset<DUBHE>(
            &mut dapp_hub, 
            string(b"Wrapped DUBHE"), 
            string(b"wDUBHE"), 
            string(b"Dubhe engine token"), 
            7, 
            string(b"https://dubhe.com/icon.png"), 
            ctx
        );
        gov_system::deposit_treasury_cap<DUBHE>(
            &mut dapp_hub, 
            treasury_cap, 
            ctx
        );
        gov_system::set_dubhe_asset_id(&mut dapp_hub, @0x357cb71d44a3fe292623a589e44f6a4f704d39d64a916bde9f81b78ce7ffac5c, ctx);

        scenario.next_tx(sender_b);
        let ctx = test_scenario::ctx(&mut scenario);

        wrapper_system::wrap(&mut dapp_hub, dubhe, ctx.sender());
        assert!(assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), ctx.sender()) as u64 == amount);

        let to = @0x1;
        let amount = 10 * 10000000;
        bridge_system::withdraw<DUBHE>(&mut dapp_hub, amount, to, string(b"Dubhe OS"), ctx);
        std::debug::print(&assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), ctx.sender()));
        assert!(assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), ctx.sender()) as u64 == 90 * 10000000);

        let sender = @0xA;
        scenario.next_tx(sender);
        let ctx = test_scenario::ctx(&mut scenario);
        let amount = 10 * 10000000;
        bridge_system::deposit<DUBHE>(&mut dapp_hub, ctx.sender(), @0xB, string(b"Dubhe OS"), amount, ctx);
        assert!(assets_system::balance_of(&dapp_hub, dubhe_asset_id::get(&dapp_hub), @0xB) as u64 == 100 * 10000000);

        dapp_hub.destroy();
        scenario.end();
    }
}