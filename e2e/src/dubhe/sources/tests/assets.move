#[test_only]
module dubhe::assets_tests {
    use dubhe::assets_functions;
    use dubhe::init_test::deploy_dapp_for_testing;
    use dubhe::assets_system;
    use dubhe::dapp_service::DappHub;
    use sui::test_scenario;
    use sui::test_scenario::Scenario;
    use dubhe::asset_type;

    public fun create_assets(
        dapp_hub: &mut DappHub, 
        name: vector<u8>, 
        symbol: vector<u8>, 
        description: vector<u8>, 
        decimals: u8, 
        url: vector<u8>, 
        scenario: &mut Scenario
    ): address {
        let asset_id = assets_functions::do_create(
            dapp_hub, 
            asset_type::new_private(), 
            @0xA, 
            name, 
            symbol, 
            description, 
            decimals, 
            url, 
            true, 
            true, 
            true
        );
        test_scenario::next_tx(scenario,@0xA);
        asset_id
    }

    public fun create_test_asset(dapp_hub: &mut DappHub, scenario: &mut Scenario): address {
        let name = b"Test Asset";
        let symbol = b"TEST";
        let description = b"Test Asset";
        let url = b"";
        let decimals = 9;
        let asset_id = create_assets(dapp_hub, name, symbol, description, decimals, url, scenario);
        asset_id
    }

    #[test]
    public fun assets_create() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let name = b"Obelisk Coin";
        let symbol = b"OBJ";
        let description = b"Obelisk Coin";
        let url = b"";
        let decimals = 9;
        let asset1  = create_assets(&mut dapp_hub, name, symbol, description, decimals, url, &mut scenario);
        let asset2 = create_assets(&mut dapp_hub, name, symbol, description, decimals, url, &mut scenario);

        // assert!(dapp_hub.next_asset_id()[] == 4, 0);

        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::mint(&mut dapp_hub, asset1, ctx.sender(), 100, ctx);
        assets_system::mint(&mut dapp_hub, asset2, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset1, ctx.sender()) == 100, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset1, @0x10000) == 0, 0);
        assert!(assets_system::supply_of(&dapp_hub, asset1) == 100, 0);

        assets_system::transfer(&mut dapp_hub, asset1, @0x0002, 50, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset1, ctx.sender()) == 50, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset1, @0x0002) == 50, 0);
        assert!(assets_system::supply_of(&dapp_hub, asset1) == 100, 0);

        assets_system::burn(&mut dapp_hub, asset1, ctx.sender(), 50, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset1, ctx.sender()) == 0, 0);
        assert!(assets_system::supply_of(&dapp_hub, asset1) == 50, 0);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun basic_mint_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let asset_2 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, @0x1024, 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 100, 0);

        assets_system::mint(&mut dapp_hub, asset_1, @0x1, 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1) == 100, 0);

        assets_system::mint(&mut dapp_hub, asset_2, @0x1024, 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_2, @0x1024) == 100, 0);
        
        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun querying_total_supply_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 100);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, 50, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 50);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 50);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 31, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0xA) == 50);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 19);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1) == 31);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::burn(&mut dapp_hub, asset_1, @0x1, 31, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1) == 0);

        assert!(assets_system::supply_of(&dapp_hub, asset_1) == 69);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun transferring_amount_below_available_balance_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 100);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, 50, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 50);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 50);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::ACCOUNT_FROZEN)]
    fun transferring_frozen_user_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, @0x1024, 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 100);

        assets_system::freeze_address(&mut dapp_hub, asset_1, @0x1024, ctx);
        assets_system::thaw_address(&mut dapp_hub, asset_1, @0x1024, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 50);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1) == 50);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::freeze_address(&mut dapp_hub, asset_1, @0x1024, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);
        
        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::ASSET_ALREADY_FROZEN)]
    fun transferring_frozen_asset_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, @0x1024, 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 100);

        assets_system::freeze_asset(&mut dapp_hub, asset_1, ctx);
        assets_system::thaw_asset(&mut dapp_hub, asset_1, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::freeze_asset(&mut dapp_hub, asset_1, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::ACCOUNT_BLOCKED)]
    fun transferring_from_blocked_account_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, @0x1024, 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 100);

        assets_system::block_address(&mut dapp_hub, asset_1, @0x1024, ctx);
        assets_system::thaw_address(&mut dapp_hub, asset_1, @0x1024, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::block_address(&mut dapp_hub, asset_1, @0x1024, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::ACCOUNT_BLOCKED)]
    fun transferring_to_blocked_account_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, @0x1024, 100, ctx);
        assets_system::mint(&mut dapp_hub, asset_1, @0x1, 100, ctx);    
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 100);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1) == 100);

        assets_system::block_address(&mut dapp_hub, asset_1, @0x1, ctx);
        assets_system::thaw_address(&mut dapp_hub, asset_1, @0x1, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::block_address(&mut dapp_hub, asset_1, @0x1, ctx);

        test_scenario::next_tx(&mut scenario, @0x1024);
        let ctx = test_scenario::ctx(&mut scenario);
        assets_system::transfer(&mut dapp_hub, asset_1, @0x1, 50, ctx);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun transfer_all_works() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 100);

        assets_system::transfer_all(&mut dapp_hub, asset_1, @0x1024, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == 100);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun transfer_owner_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assert!(assets_system::owner_of(&dapp_hub, asset_1) == sender);

        assets_system::transfer_ownership(&mut dapp_hub, asset_1, @0x1024, ctx);
        assert!(assets_system::owner_of(&dapp_hub, asset_1) == @0x1024);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::ACCOUNT_NOT_FOUND)]
    fun transferring_amount_more_than_available_balance_should_not_work_1() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 0);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, 50, ctx);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::BALANCE_TOO_LOW)]
    fun transferring_amount_more_than_available_balance_should_not_work_2() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 100);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, 101, ctx);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun transferring_zero_units_is_fine() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 100);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, 0, ctx);

        dapp_hub.destroy();
        scenario.end();
    } 

    #[test]
    #[expected_failure(abort_code = dubhe::errors::BALANCE_TOO_LOW)]
    fun transferring_more_units_than_total_supply_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 100);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, 101, ctx);
        
        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::errors::ACCOUNT_NOT_FOUND)]
    fun burning_asset_balance_with_zero_balance_does_nothing() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::burn(&mut dapp_hub, asset_1, ctx.sender(), 100, ctx);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun transfer_large_asset() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let amount = std::u256::max_value!();
        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), amount, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == amount);

        assets_system::transfer(&mut dapp_hub, asset_1, @0x1024, amount, ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, @0x1024) == amount);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    fun set_metadata_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut dapp_hub, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assets_system::set_metadata(&mut dapp_hub, asset_1, b"Test Asset", b"TEST", b"Test Asset", b"https://test.com", ctx);


        let (name, symbol, description, decimals) = assets_system::metadata_of(&dapp_hub, asset_1);
        assert!(name == b"Test Asset");
        assert!(symbol == b"TEST");
        assert!(description == b"Test Asset");
        assert!(decimals == 9);

        dapp_hub.destroy();
        scenario.end();
    }   

}