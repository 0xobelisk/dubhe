#[test_only]
module dubhe::wrapper_tests {
    use dubhe::init_test::deploy_dapp_for_testing;
    use dubhe::assets_system;
    use dubhe::wrapper_system;
    use sui::test_scenario;
    use sui::coin;
    use sui::sui::SUI;
    use dubhe::dubhe::DUBHE;

    const SUI_ASSET_ID: address = @0x9d3670d0143ee414db420bc60b393df9e5c25ed1298408e4b6fa6873dfedae14;
    const DUBHE_ASSET_ID: address = @0x4fb7f368a1f8a818847995e240d0d783fdf961afe15cfa208d4b25d65d2170af;

    #[test]
    public fun wrapper_tests() {
         let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        
        let ctx = test_scenario::ctx(&mut scenario);
        let amount: u256 = 1000000;

        let sui = coin::mint_for_testing<SUI>(amount as u64, ctx);
        let beneficiary = ctx.sender();
        wrapper_system::wrap(&mut dapp_hub, sui, beneficiary);
        assert!(assets_system::balance_of(&dapp_hub, SUI_ASSET_ID, beneficiary) == amount);
        assert!(assets_system::supply_of(&dapp_hub, SUI_ASSET_ID) == amount);

        wrapper_system::unwrap<SUI>(&mut dapp_hub, amount, beneficiary, ctx);
        assert!(assets_system::balance_of(&dapp_hub, SUI_ASSET_ID, beneficiary) == 0);

        let sui = coin::mint_for_testing<SUI>(amount as u64, ctx);
        wrapper_system::wrap(&mut dapp_hub, sui, beneficiary);
        assert!(assets_system::balance_of(&dapp_hub, SUI_ASSET_ID, beneficiary) == amount);
        assert!(assets_system::supply_of(&dapp_hub, SUI_ASSET_ID) == amount);

        let dubhe = coin::mint_for_testing<DUBHE>(amount as u64, ctx);
        wrapper_system::wrap(&mut dapp_hub, dubhe, beneficiary);
        assert!(assets_system::balance_of(&dapp_hub, DUBHE_ASSET_ID, beneficiary) == amount);
        assert!(assets_system::supply_of(&dapp_hub, DUBHE_ASSET_ID) == amount);

        let dubhe = coin::mint_for_testing<DUBHE>(amount as u64, ctx);
        wrapper_system::wrap(&mut dapp_hub, dubhe, beneficiary);
        assert!(assets_system::balance_of(&dapp_hub, DUBHE_ASSET_ID, beneficiary) == amount * 2);
        assert!(assets_system::supply_of(&dapp_hub, DUBHE_ASSET_ID) == amount * 2);

        dapp_hub.destroy();
        scenario.end();
    }
}