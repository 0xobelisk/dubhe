#[test_only]
module dubhe::assets_tests {
    use std::ascii;
    use std::ascii::String;
    use dubhe::dubhe_assets_functions;
    use dubhe::dubhe_init_test::deploy_dapp_for_testing;
    use dubhe::dubhe_assets_system;
    use dubhe::dubhe_schema::Schema;
    use sui::test_scenario;
    use sui::test_scenario::Scenario;
    use dubhe::dubhe_asset_type;
    use std::ascii::string;

    public fun create_assets(schema: &mut Schema, name: String, symbol: String, description: String, decimals: u8, url: String, info: String, scenario: &mut Scenario): u256 {
        let asset_id = dubhe_assets_functions::do_create(schema, true, true, true, dubhe_asset_type::new_private(), @0xA, name, symbol, description, decimals, url, info);
        test_scenario::next_tx(scenario,@0xA);
        asset_id
    }

    public fun create_test_asset(schema: &mut Schema, scenario: &mut Scenario): u256 {
        let name = ascii::string(b"Test Asset");
        let symbol = ascii::string(b"TEST");
        let description = ascii::string(b"Test Asset");
        let url = ascii::string(b"");
        let info = ascii::string(b"Test Asset");
        let decimals = 9;
        let asset_id = create_assets(schema, name, symbol, description, decimals, url, info, scenario);
        asset_id
    }

    #[test]
    public fun assets_create() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let name = ascii::string(b"Obelisk Coin");
        let symbol = ascii::string(b"OBJ");
        let description = ascii::string(b"Obelisk Coin");
        let url = ascii::string(b"");
        let info = ascii::string(b"Obelisk Coin");
        let decimals = 9;
        let asset1  = create_assets(&mut schema, name, symbol, description, decimals, url, info, &mut scenario);
        let asset2 = create_assets(&mut schema, name, symbol, description, decimals, url, info, &mut scenario);

        // assert!(schema.next_asset_id()[] == 4, 0);

        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::mint(&mut schema, asset1, ctx.sender(), 100, ctx);
        dubhe_assets_system::mint(&mut schema, asset2, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset1, ctx.sender()) == 100, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset1, @0x10000) == 0, 0);
        assert!(dubhe_assets_system::supply_of(&mut schema, asset1) == 100, 0);

        dubhe_assets_system::transfer(&mut schema, asset1, @0x0002, 50, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset1, ctx.sender()) == 50, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset1, @0x0002) == 50, 0);
        assert!(dubhe_assets_system::supply_of(&mut schema, asset1) == 100, 0);

        dubhe_assets_system::burn(&mut schema, asset1, ctx.sender(), 50, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset1, ctx.sender()) == 0, 0);
        assert!(dubhe_assets_system::supply_of(&mut schema, asset1) == 50, 0);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun basic_mint_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let asset_2 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, @0x0, 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 100, 0);

        dubhe_assets_system::mint(&mut schema, asset_1, @0x1, 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x1) == 100, 0);

        dubhe_assets_system::mint(&mut schema, asset_2, @0x0, 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_2, @0x0) == 100, 0);
        
        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun querying_total_supply_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 100);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, 50, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 50);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 50);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 31, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0xA) == 50);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 19);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x1) == 31);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::burn(&mut schema, asset_1, @0x1, 31, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x1) == 0);

        assert!(dubhe_assets_system::supply_of(&mut schema, asset_1) == 69);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun transferring_amount_below_available_balance_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 100);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, 50, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 50);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 50);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::ACCOUNT_FROZEN)]
    fun transferring_frozen_user_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, @0x0, 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 100);

        dubhe_assets_system::freeze_address(&mut schema, asset_1, @0x0, ctx);
        dubhe_assets_system::thaw_address(&mut schema, asset_1, @0x0, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 50);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x1) == 50);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::freeze_address(&mut schema, asset_1, @0x0, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);
        
        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::ASSET_ALREADY_FROZEN)]
    fun transferring_frozen_asset_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, @0x0, 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 100);

        dubhe_assets_system::freeze_asset(&mut schema, asset_1, ctx);
        dubhe_assets_system::thaw_asset(&mut schema, asset_1, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::freeze_asset(&mut schema, asset_1, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::ACCOUNT_BLOCKED)]
    fun transferring_from_blocked_account_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, @0x0, 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 100);

        dubhe_assets_system::block_address(&mut schema, asset_1, @0x0, ctx);
        dubhe_assets_system::thaw_address(&mut schema, asset_1, @0x0, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::block_address(&mut schema, asset_1, @0x0, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::ACCOUNT_BLOCKED)]
    fun transferring_to_blocked_account_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, @0x0, 100, ctx);
        dubhe_assets_system::mint(&mut schema, asset_1, @0x1, 100, ctx);    
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 100);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x1) == 100);

        dubhe_assets_system::block_address(&mut schema, asset_1, @0x1, ctx);
        dubhe_assets_system::thaw_address(&mut schema, asset_1, @0x1, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);

        test_scenario::next_tx(&mut scenario, @0xA);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::block_address(&mut schema, asset_1, @0x1, ctx);

        test_scenario::next_tx(&mut scenario, @0x0);
        let ctx = test_scenario::ctx(&mut scenario);
        dubhe_assets_system::transfer(&mut schema, asset_1, @0x1, 50, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun transfer_all_works() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 100);

        dubhe_assets_system::transfer_all(&mut schema, asset_1, @0x0, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == 100);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun transfer_owner_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);
        
        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assert!(dubhe_assets_system::owner_of(&mut schema, asset_1) == sender);

        dubhe_assets_system::transfer_ownership(&mut schema, asset_1, @0x0, ctx);
        assert!(dubhe_assets_system::owner_of(&mut schema, asset_1) == @0x0);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::ACCOUNT_NOT_FOUND)]
    fun transferring_amount_more_than_available_balance_should_not_work_1() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 0);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, 50, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::BALANCE_TOO_LOW)]
    fun transferring_amount_more_than_available_balance_should_not_work_2() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 100);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, 101, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun transferring_zero_units_is_fine() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 100);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, 0, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    } 

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::BALANCE_TOO_LOW)]
    fun transferring_more_units_than_total_supply_should_not_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 100);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, 101, ctx);
        
        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = dubhe::dubhe_errors::ACCOUNT_NOT_FOUND)]
    fun burning_asset_balance_with_zero_balance_does_nothing() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::burn(&mut schema, asset_1, ctx.sender(), 100, ctx);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun transfer_large_asset() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let amount = std::u256::max_value!();
        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), amount, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == amount);

        dubhe_assets_system::transfer(&mut schema, asset_1, @0x0, amount, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, @0x0) == amount);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    fun set_metadata_should_work() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);

        let asset_1 = create_test_asset(&mut schema, &mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        dubhe_assets_system::set_metadata(&mut schema, asset_1, string(b"Test Asset"), string(b"TEST"), string(b"Test Asset"), string(b"https://test.com"), ctx);

        assert!(dubhe_assets_system::name(&mut schema, asset_1) == string(b"Test Asset"));
        assert!(dubhe_assets_system::symbol(&mut schema, asset_1) == string(b"TEST"));
        assert!(dubhe_assets_system::description(&mut schema, asset_1) == string(b"Test Asset"));
        assert!(dubhe_assets_system::icon_url(&mut schema, asset_1) == string(b"https://test.com"));

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }   

}