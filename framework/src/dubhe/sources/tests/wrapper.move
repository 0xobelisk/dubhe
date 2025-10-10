#[test_only]
module dubhe::wrapper_tests {
    use dubhe::init_test::deploy_dapp_for_testing;
    use dubhe::assets_system;
    use dubhe::wrapper_system;
    use dubhe::gov_system;
    use sui::test_scenario;
    use sui::coin;
    use sui::sui::SUI;
    use std::ascii::string;

    const SUI_ASSET_ID: address = @0xa5481ac67797056f2997fe815b0aef4d70b83ae52157570fb38bc1197e0274d6;
    const DUBHE_ASSET_ID: address = @0x357cb71d44a3fe292623a589e44f6a4f704d39d64a916bde9f81b78ce7ffac5c;

    public struct DUBHE has copy, drop { }

    #[test]
    public fun wrapper_tests() {
         let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        
        let ctx = test_scenario::ctx(&mut scenario);
        let amount: u256 = 1000000;

        gov_system::force_register_wrapped_asset<DUBHE>(
            &mut dapp_hub, 
            string(b"Wrapped DUBHE"), 
            string(b"wDUBHE"), 
            string(b"Dubhe engine token"), 
            7, 
            string(b"https://dubhe.com/icon.png"), 
            ctx
        );

        let sui = coin::mint_for_testing<SUI>(amount as u64, ctx);
        let beneficiary = ctx.sender();
        wrapper_system::wrap(&mut dapp_hub, sui, beneficiary, ctx);
        assert!(assets_system::balance_of(&dapp_hub, SUI_ASSET_ID, beneficiary) == amount);
        assert!(assets_system::supply_of(&dapp_hub, SUI_ASSET_ID) == amount);

        wrapper_system::unwrap<SUI>(&mut dapp_hub, amount, beneficiary, ctx);
        assert!(assets_system::balance_of(&dapp_hub, SUI_ASSET_ID, beneficiary) == 0);

        let sui = coin::mint_for_testing<SUI>(amount as u64, ctx);
        wrapper_system::wrap(&mut dapp_hub, sui, beneficiary, ctx);
        assert!(assets_system::balance_of(&dapp_hub, SUI_ASSET_ID, beneficiary) == amount);
        assert!(assets_system::supply_of(&dapp_hub, SUI_ASSET_ID) == amount);

        let dubhe = coin::mint_for_testing<DUBHE>(amount as u64, ctx);
        wrapper_system::wrap(&mut dapp_hub, dubhe, beneficiary, ctx);
        assert!(assets_system::balance_of(&dapp_hub, DUBHE_ASSET_ID, beneficiary) == amount);
        assert!(assets_system::supply_of(&dapp_hub, DUBHE_ASSET_ID) == amount);

        let dubhe = coin::mint_for_testing<DUBHE>(amount as u64, ctx);
        wrapper_system::wrap(&mut dapp_hub, dubhe, beneficiary, ctx);
        assert!(assets_system::balance_of(&dapp_hub, DUBHE_ASSET_ID, beneficiary) == amount * 2);
        assert!(assets_system::supply_of(&dapp_hub, DUBHE_ASSET_ID) == amount * 2);

        dapp_hub.destroy();
        scenario.end();
    }
}