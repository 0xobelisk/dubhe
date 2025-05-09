#[test_only]
module dubhe::dex_tests {
    use std::debug;
    use std::ascii;
    use std::u128;
    use dubhe::dubhe_dex_functions;
    use dubhe::dubhe_init_test::deploy_dapp_for_testing;
    use dubhe::dubhe_pool;
    use dubhe::dubhe_dex_system;
    use dubhe::assets_tests;
    use dubhe::dubhe_assets_system;
    use dubhe::dubhe_schema::Schema;
    use sui::test_scenario;
    use sui::test_scenario::Scenario;

    public struct USDT has store, drop {  }

    const DECIMAL: u256 = 1_000_000_000;

    public fun init_test(): (Schema, Scenario, u256, u256, u256) {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);
        schema.next_asset_id().set(0);

        let name = ascii::string(b"Poils Coin");
        let symbol = ascii::string(b"POL");
        let description = ascii::string(b"");
        let url = ascii::string(b"");
        let info = ascii::string(b"");
        let decimals = 9;
        let asset_0 = assets_tests::create_assets(&mut schema, name, symbol, description, decimals, url, info, &mut scenario);
        let asset_1 = assets_tests::create_assets(&mut schema, name, symbol, description, decimals, url, info, &mut scenario);
        let asset_2 = assets_tests::create_assets(&mut schema, name, symbol, description, decimals, url, info, &mut scenario);

        (schema, scenario, asset_0, asset_1, asset_2)
    }

    #[test]
    public fun check_max_number() {
        let (mut schema, scenario, _, _, _) = init_test();
        let u128_max = u128::max_value!() as u256;

        schema.swap_fee().set(0);

        assert!(dubhe_dex_functions::quote(3, u128_max, u128_max) ==  3);

        let x = 1_000_000_000_000_000_000;
        assert!(dubhe_dex_functions::quote(10000_0000_0000 * x, 100_0000_0000_0000 * x, 100_0000_0000_0000 * x) == 10000_0000_0000 * x, 100);

        assert!(dubhe_dex_functions::quote(u128_max, u128_max, u128_max) == u128_max);

        debug::print(&dubhe_dex_functions::get_amount_out(&mut schema, 100, u128_max, u128_max));
        assert!(dubhe_dex_functions::get_amount_out(&mut schema, 100, u128_max, u128_max) == 99);
        assert!(dubhe_dex_functions::get_amount_in(&mut schema, 100, u128_max, u128_max) == 101);

        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }

    #[test]
    public fun create_pool() {
        let (mut schema, mut scenario, _, _, _) = init_test();
        let ctx =  test_scenario::ctx(&mut scenario);
        dubhe_dex_system::create_pool(&mut schema, 0, 1, ctx);

        let pool_address = dubhe_dex_functions::pair_for(0, 1);
        assert!(schema.pools().get(0, 1) == dubhe_pool::new(pool_address, 3, 0, 0, 0));

        let pool_address = dubhe_dex_functions::pair_for(1, 2);
        dubhe_dex_system::create_pool(&mut schema, 1, 2, ctx);
        assert!(schema.pools().get(1, 2) == dubhe_pool::new(pool_address, 4, 0, 0, 0));

        test_scenario::return_shared<Schema>(schema);
    
        scenario.end();
    }

    // #[test]
    // #[expected_failure(abort_code = dubhe::dubhe_errors::POOL_ALREADY_EXISTS)]
    // public fun create_same_pool_twice_should_fail() {
    //     let (mut schema, mut scenario, _, _, _) = init_test();

    //     let ctx =  test_scenario::ctx(&mut scenario);
    //     dubhe_dex_system::create_pool(&mut schema, 0, 1, ctx);
    //     dubhe_dex_system::create_pool(&mut schema, 1, 0, ctx);

    //     test_scenario::return_shared<Schema>(schema);
    
    //     scenario.end();
    // }

    #[test]
    public fun can_add_liquidity() {
        let (mut schema, mut scenario, asset_0, asset_1, asset_2) = init_test();
        schema.swap_fee().set(30);
        schema.fee_to().set(@0xfee);

        let ctx =  test_scenario::ctx(&mut scenario);
        dubhe_dex_system::create_pool(&mut schema, asset_0, asset_1, ctx);
        dubhe_dex_system::create_pool(&mut schema, asset_1, asset_2, ctx);
        dubhe_dex_system::create_pool(&mut schema, asset_0, asset_2, ctx);

        dubhe_assets_system::mint(&mut schema, asset_0, ctx.sender(), 20000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 20000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_2, ctx.sender(), 20000 * DECIMAL, ctx);

        dubhe_dex_system::add_liquidity(&mut schema, asset_0, asset_1, 10000 * DECIMAL, 10 * DECIMAL, 0, 0, ctx.sender(), ctx);
        let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1).get();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == 10000 * DECIMAL);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == 10 * DECIMAL);

        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()));
        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1));
        // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()) == 216 * DECIMAL, 0);

        dubhe_dex_system::add_liquidity(&mut schema, asset_1, asset_0, 2 * DECIMAL, 8000 * DECIMAL, 0, 0, ctx.sender(), ctx);
        let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(&mut schema, asset_1, asset_0).get();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL - 2 * DECIMAL, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL - 2000 * DECIMAL, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()) == 216, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == 10000 * DECIMAL + 2000 * DECIMAL, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == 10 * DECIMAL + 2 * DECIMAL, 0);
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()));
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xfee));
        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1));

        dubhe_dex_system::add_liquidity(&mut schema, asset_1, asset_0, 2 * DECIMAL, 8000 * DECIMAL, 0, 0, ctx.sender(), ctx);
        // let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(&mut schema, asset_1, asset_0).get();
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL - 2 * DECIMAL, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL - 2000 * DECIMAL, 0);
        // // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()) == 216, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == 10000 * DECIMAL + 2000 * DECIMAL, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == 10 * DECIMAL + 2 * DECIMAL, 0);
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()));
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xfee));
        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1));


        dubhe_dex_system::add_liquidity(&mut schema, asset_1, asset_0, 2 * DECIMAL, 8000 * DECIMAL, 0, 0, ctx.sender(), ctx);
        // let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(&mut schema, asset_1, asset_0).get();
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL - 2 * DECIMAL, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL - 2000 * DECIMAL, 0);
        // // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()) == 216, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == 10000 * DECIMAL + 2000 * DECIMAL, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == 10 * DECIMAL + 2 * DECIMAL, 0);
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()));
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xfee));
        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1));
        

        test_scenario::return_shared<Schema>(schema);
    
        scenario.end();
    }

    #[test]
    public fun can_remove_liquidity() {
        let (mut schema, mut scenario, asset_0, asset_1, asset_2) = init_test();
        schema.swap_fee().set(30);
        schema.fee_to().set(@0xB);

        let ctx =  test_scenario::ctx(&mut scenario);
        dubhe_dex_system::create_pool(&mut schema, asset_0, asset_1, ctx);
        dubhe_dex_system::create_pool(&mut schema, asset_1, asset_2, ctx);
        dubhe_dex_system::create_pool(&mut schema, asset_0, asset_2, ctx);

        dubhe_assets_system::mint(&mut schema, asset_0, ctx.sender(), 100000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 100000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_2, ctx.sender(), 100000 * DECIMAL, ctx);

        dubhe_dex_system::add_liquidity(
            &mut schema, 
            asset_0, 
            asset_1, 
            100000 * DECIMAL, 
            100000 * DECIMAL, 
            100000 * DECIMAL, 
            100000 * DECIMAL, 
            ctx.sender(), 
            ctx
        );
        let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1).get();
        let total_lp_received = dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender());
        // 99999999999000
        debug::print(&total_lp_received);

        dubhe_dex_system::remove_liquidity(
            &mut schema, 
            asset_0, 
            asset_1, 
            total_lp_received / 2, 
            0, 
            0, 
            ctx.sender(), 
            ctx
        );
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == 10000000000 - 1000000000 + 899991000);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 89999);
    
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()));

        // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()) == 0, 0);
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()));

        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == 0, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == 0, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xB) == 999990, 0);
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xB));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address));

        dubhe_dex_system::remove_liquidity(
            &mut schema, 
            asset_0, 
            asset_1, 
            total_lp_received / 2, 
            0, 
            0, 
            ctx.sender(), 
            ctx
        );
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == 10000000000 - 1000000000 + 899991000);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == 89999);
    
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()));

        // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()) == 0, 0);
        debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, ctx.sender()));

        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == 0, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == 0, 0);
        // assert!(dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xB) == 999990, 0);
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, lp_asset_id, @0xB));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address));

        test_scenario::return_shared<Schema>(schema);
    
        scenario.end();
    }

    #[test]
    public fun can_swap() {
        let (mut schema, mut scenario, asset_0, asset_1, asset_2) = init_test();
        schema.swap_fee().set(30);
        schema.fee_to().set(@0xB);

        let ctx =  test_scenario::ctx(&mut scenario);
        dubhe_dex_system::create_pool(&mut schema, asset_0, asset_1, ctx);
        dubhe_dex_system::create_pool(&mut schema, asset_1, asset_2, ctx);

        dubhe_assets_system::mint(&mut schema, asset_0, ctx.sender(), 10000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 1000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_2, ctx.sender(), 100000 * DECIMAL, ctx);

        let liquidity1 = 800 * DECIMAL;
        let liquidity2 = 200 * DECIMAL;

        dubhe_dex_system::add_liquidity(&mut schema, asset_0, asset_1, liquidity1, liquidity2, 1, 1, ctx.sender(), ctx);

        let input_amount = 10 * DECIMAL;
        let expect_receive =
            dubhe_dex_system::get_amounts_out(&mut schema, input_amount, vector[asset_0, asset_1]);
        debug::print(&expect_receive);

        let balance0 = 10000 * DECIMAL - liquidity1 - input_amount;
        let balance1 = 1000 * DECIMAL - liquidity2 + expect_receive[expect_receive.length() - 1];
        dubhe_dex_system::swap_exact_tokens_for_tokens(&mut schema, input_amount, 1, vector[asset_0, asset_1], ctx.sender(), ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == balance0, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == balance1, 0);

        let liquidity1 = liquidity1 + input_amount;
        let liquidity2 = liquidity2 - expect_receive[expect_receive.length() - 1];
        let pool_address = dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1).get_pool_address();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == liquidity1, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == liquidity2, 0);


        let output_amount = 10 * DECIMAL;
        let amounts =
            dubhe_dex_system::get_amounts_in(&mut schema, output_amount, vector[asset_1, asset_0]);
        debug::print(&amounts);
        dubhe_dex_system::swap_tokens_for_exact_tokens(&mut schema, output_amount, amounts[0], vector[asset_1, asset_0], ctx.sender(), ctx);

        let balance0 = balance0 + output_amount;
        let balance1 = balance1 - amounts[0];

        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == balance0, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == balance1, 0);

        let liquidity1 = liquidity1 - output_amount;
        let liquidity2 = liquidity2 + amounts[0];
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == liquidity1, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == liquidity2, 0);

        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1));

        test_scenario::return_shared<Schema>(schema);
    
        scenario.end();
    }

     #[test]
    public fun can_multiple_swap() {
        let (mut schema, mut scenario, asset_0, asset_1, asset_2) = init_test();
        schema.swap_fee().set(30);
        schema.fee_to().set(@0xB);

        let ctx =  test_scenario::ctx(&mut scenario);
        dubhe_dex_system::create_pool(&mut schema, asset_0, asset_1, ctx);
        dubhe_dex_system::create_pool(&mut schema, asset_1, asset_2, ctx);

        dubhe_assets_system::mint(&mut schema, asset_0, ctx.sender(), 10000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 1000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_2, ctx.sender(), 100000 * DECIMAL, ctx);

        let liquidity1 = 800 * DECIMAL;
        let liquidity2 = 200 * DECIMAL;
        let liquidity3 = 100 * DECIMAL;
        let liquidity4 = 100 * DECIMAL;

        dubhe_dex_system::add_liquidity(&mut schema, asset_0, asset_1, liquidity1, liquidity2, 1, 1, ctx.sender(), ctx);
        dubhe_dex_system::add_liquidity(&mut schema, asset_1, asset_2, liquidity3, liquidity4, 1, 1, ctx.sender(), ctx);

        let input_amount = 10 * DECIMAL;
        let path = vector[asset_0, asset_1, asset_2];
        let amounts =
            dubhe_dex_system::get_amounts_out(&mut schema, input_amount, path);
        debug::print(&amounts);

        let balance0 = 10000 * DECIMAL - liquidity1 - input_amount;
        let balance1 = 1000 * DECIMAL - liquidity2 - liquidity3;
        let balance2 = 100000 * DECIMAL - liquidity3 + amounts[amounts.length() - 1];

        dubhe_dex_system::swap_exact_tokens_for_tokens(&mut schema, input_amount, 1, path, ctx.sender(), ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == balance0, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == balance1, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_2, ctx.sender()) == balance2, 0);

        let liquidity1 = liquidity1 + input_amount;
        let liquidity2 = liquidity2 - amounts[1];
        let pool_address = dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1).get_pool_address();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == liquidity1, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == liquidity2, 0);
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address));

        let liquidity3 = liquidity3 + amounts[1];
        let liquidity4 = liquidity4 - amounts[2];
        let pool_address = dubhe_dex_functions::get_pool(&mut schema, asset_1, asset_2).get_pool_address();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == liquidity3, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_2, pool_address) == liquidity4, 0);
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address));
        std::debug::print(&dubhe_assets_system::balance_of(&mut schema, asset_2, pool_address));

        let output_amount = 10 * DECIMAL;
        let path = vector[asset_0, asset_1, asset_2];
        let amounts =
            dubhe_dex_system::get_amounts_in(&mut schema, output_amount, path);
        debug::print(&amounts);
        dubhe_dex_system::swap_tokens_for_exact_tokens(&mut schema, output_amount, amounts[0], path, ctx.sender(), ctx);

        let balance0 = balance0 - amounts[0];
        let balance1 = balance1;
        let balance2 = balance2 + output_amount;

        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, ctx.sender()) == balance0, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, ctx.sender()) == balance1, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_2, ctx.sender()) == balance2, 0);

        let liquidity1 = liquidity1 + amounts[0];
        let liquidity2 = liquidity2 - amounts[1];
        let pool_address = dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1).get_pool_address();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_0, pool_address) == liquidity1, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == liquidity2, 0);

        let liquidity3 = liquidity3 + amounts[1];
        let liquidity4 = liquidity4 - amounts[2];
        let pool_address = dubhe_dex_functions::get_pool(&mut schema, asset_1, asset_2).get_pool_address();
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_1, pool_address) == liquidity3, 0);
        assert!(dubhe_assets_system::balance_of(&mut schema, asset_2, pool_address) == liquidity4, 0);

        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_0, asset_1));
        std::debug::print(&dubhe_dex_functions::get_pool(&mut schema, asset_1, asset_2));
        test_scenario::return_shared<Schema>(schema);
    
        scenario.end();
    }

    #[test]
    fun mock_swap() {
        let (mut schema, mut scenario, asset_0, asset_1, _) = init_test();

        let ctx = test_scenario::ctx(&mut scenario);
      dubhe_dex_system::create_pool(&mut schema, asset_0, asset_1, ctx);

      dubhe_assets_system::mint(&mut schema, asset_0, ctx.sender(), 10000 * DECIMAL, ctx);
        dubhe_assets_system::mint(&mut schema, asset_1, ctx.sender(), 1000 * DECIMAL, ctx);

      schema.pools().set(asset_0, asset_1, dubhe_pool::new(
            @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, 
            2, 
            3392173622 - 653980268 - 6524556,
            80109881 - 15444457 - 154084, 
            271746625189758982
            )
        );

        schema.asset_metadata().set(asset_0, dubhe::dubhe_asset_metadata::new(
            std::ascii::string(b"USDT"),
            std::ascii::string(b"USDT"),
            std::ascii::string(b"USDT"),
            9,
            std::ascii::string(b""),
            std::ascii::string(b""),
            @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7,
            418696631,
            0,
            dubhe::dubhe_asset_status::new_liquid(),
            true,
            true,
            true,
            dubhe::dubhe_asset_type::new_lp()
        ));

        schema.account().set(asset_0, @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, dubhe::dubhe_account::new(
           2738193354,
            dubhe::dubhe_account_status::new_liquid(),
        ));

        schema.account().set(asset_1, @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, dubhe::dubhe_account::new(
            64665424,
            dubhe::dubhe_account_status::new_liquid(),
        ));

        dubhe_dex_system::add_liquidity(
            &mut schema, 
            asset_0, 
            asset_1, 
            200000000, 
            4723218, 
            199000000, 
            4699602, 
            ctx.sender(), 
            ctx
        );



        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }
}