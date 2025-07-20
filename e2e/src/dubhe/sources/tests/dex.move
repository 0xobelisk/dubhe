#[test_only]
module dubhe::dex_tests {
    use std::debug;
    use std::u128;
    use dubhe::dex_functions;
    use dubhe::init_test::deploy_dapp_for_testing;
    use dubhe::asset_pools;
    use dubhe::dex_system;
    use dubhe::assets_tests;
    use dubhe::assets_system;
    use dubhe::dapp_service::DappHub;
    use sui::test_scenario;
    use sui::test_scenario::Scenario;
    use dubhe::dubhe_config;

    public struct USDT has store, drop {  }

    const DECIMAL: u256 = 1_000_000_000;

    public fun init_test(): (DappHub, Scenario, address, address, address) {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut dapp_hub = deploy_dapp_for_testing(&mut scenario);
        dubhe_config::set_next_asset_id(&mut dapp_hub, 0);

        let name = b"Poils Coin";
        let symbol = b"POL";
        let description = b"";
        let url = b"";
        let decimals = 9;
        let asset_0 = assets_tests::create_assets(&mut dapp_hub, name, symbol, description, decimals, url, &mut scenario);
        let asset_1 = assets_tests::create_assets(&mut dapp_hub, name, symbol, description, decimals, url, &mut scenario);
        let asset_2 = assets_tests::create_assets(&mut dapp_hub, name, symbol, description, decimals, url, &mut scenario);

        (dapp_hub, scenario, asset_0, asset_1, asset_2)
    }

    #[test]
    public fun check_max_number() {
        let (mut dapp_hub, scenario, _, _, _) = init_test();
        let u128_max = u128::max_value!() as u256;

        dubhe_config::set_swap_fee(&mut dapp_hub, 0);

        assert!(dex_functions::quote(3, u128_max, u128_max) ==  3);

        let x = 1_000_000_000_000_000_000;
        assert!(dex_functions::quote(10000_0000_0000 * x, 100_0000_0000_0000 * x, 100_0000_0000_0000 * x) == 10000_0000_0000 * x, 100);

        assert!(dex_functions::quote(u128_max, u128_max, u128_max) == u128_max);

        debug::print(&dex_functions::get_amount_out(&dapp_hub, 100, u128_max, u128_max));
        assert!(dex_functions::get_amount_out(&dapp_hub, 100, u128_max, u128_max) == 99);
        assert!(dex_functions::get_amount_in(&dapp_hub, 100, u128_max, u128_max) == 101);

        dapp_hub.destroy();
        scenario.end();
    }

    #[test]
    public fun create_pool() {
        let (mut dapp_hub, mut scenario, asset_0, asset_1, asset_2) = init_test();
        
        let pool_address = dex_functions::pair_for(asset_0, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_1);
        std::debug::print(&asset_pools::get_struct(&dapp_hub, asset_0, asset_1));
        assert!(pool_address == asset_pools::get_pool_address(&dapp_hub, asset_0, asset_1));

        let pool_address = dex_functions::pair_for(asset_2, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_1, asset_2);
        std::debug::print(&asset_pools::get_struct(&dapp_hub, asset_2, asset_1));
        assert!(asset_pools::get_pool_address(&dapp_hub, asset_2, asset_1) == pool_address);

        dapp_hub.destroy();
    
        scenario.end();
    }

    #[test]
    #[expected_failure]
    public fun create_same_pool_twice_should_fail() {
        let (mut dapp_hub, mut scenario, asset_0, asset_1, _) = init_test();

        dex_system::create_pool(&mut dapp_hub, asset_0, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_1, asset_0);

        dapp_hub.destroy();
    
        scenario.end();
    }

    #[test]
    public fun can_add_liquidity() {
        let (mut dapp_hub, mut scenario, asset_0, asset_1, asset_2) = init_test();
        dubhe_config::set_swap_fee(&mut dapp_hub, 30);
        dubhe_config::set_fee_to(&mut dapp_hub, @0xfee);

        let ctx =  test_scenario::ctx(&mut scenario);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_1, asset_2);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_2);

        assets_system::mint(&mut dapp_hub, asset_0, ctx.sender(), 20000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 20000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_2, ctx.sender(), 20000 * DECIMAL, ctx);

        dex_system::add_liquidity(&mut dapp_hub, asset_0, asset_1, 10000 * DECIMAL, 10 * DECIMAL, 0, 0, ctx.sender(), ctx);
        let pool = dex_functions::get_pool(&dapp_hub, asset_0, asset_1);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, pool.pool_address()) == 10000 * DECIMAL);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool.pool_address()) == 10 * DECIMAL);

        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender()));
        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_0, asset_1));
        // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, ctx.sender()) == 216 * DECIMAL, 0);

        dex_system::add_liquidity(&mut dapp_hub, asset_1, asset_0, 2 * DECIMAL, 8000 * DECIMAL, 0, 0, ctx.sender(), ctx);
        let pool = dex_functions::get_pool(&dapp_hub, asset_1, asset_0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL - 2 * DECIMAL, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL - 2000 * DECIMAL, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, ctx.sender()) == 216, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, pool.pool_address()) == 10000 * DECIMAL + 2000 * DECIMAL, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool.pool_address()) == 10 * DECIMAL + 2 * DECIMAL, 0);
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender()));
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), @0xfee));
        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_0, asset_1));

        dex_system::add_liquidity(&mut dapp_hub, asset_1, asset_0, 2 * DECIMAL, 8000 * DECIMAL, 0, 0, ctx.sender(), ctx);
        // let (pool_address, lp_asset_id, _, _, _) = dex_functions::get_pool(&mut dapp_hub, asset_1, asset_0).get();
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL - 2 * DECIMAL, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL - 2000 * DECIMAL, 0);
        // // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, ctx.sender()) == 216, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, pool_address) == 10000 * DECIMAL + 2000 * DECIMAL, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, pool_address) == 10 * DECIMAL + 2 * DECIMAL, 0);
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender()));
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), @0xfee));
        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_0, asset_1));


        dex_system::add_liquidity(&mut dapp_hub, asset_1, asset_0, 2 * DECIMAL, 8000 * DECIMAL, 0, 0, ctx.sender(), ctx);
        // let (pool_address, lp_asset_id, _, _, _) = dex_functions::get_pool(&mut dapp_hub, asset_1, asset_0).get();
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, ctx.sender()) == 20000 * DECIMAL - 10 * DECIMAL - 2 * DECIMAL, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, ctx.sender()) == 20000 * DECIMAL - 10000 * DECIMAL - 2000 * DECIMAL, 0);
        // // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, ctx.sender()) == 216, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, pool_address) == 10000 * DECIMAL + 2000 * DECIMAL, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, pool_address) == 10 * DECIMAL + 2 * DECIMAL, 0);
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender()));
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), @0xfee));
        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_0, asset_1));
        

        dapp_hub.destroy();
    
        scenario.end();
    }

    #[test]
    public fun can_remove_liquidity() {
        let (mut dapp_hub, mut scenario, asset_0, asset_1, asset_2) = init_test();
        dubhe_config::set_swap_fee(&mut dapp_hub, 30);
        dubhe_config::set_fee_to(&mut dapp_hub, @0xB);

        let ctx =  test_scenario::ctx(&mut scenario);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_1, asset_2);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_2);

        assets_system::mint(&mut dapp_hub, asset_0, ctx.sender(), 100000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 100000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_2, ctx.sender(), 100000 * DECIMAL, ctx);

        dex_system::add_liquidity(
            &mut dapp_hub, 
            asset_0, 
            asset_1, 
            100000 * DECIMAL, 
            100000 * DECIMAL, 
            100000 * DECIMAL, 
            100000 * DECIMAL, 
            ctx.sender(), 
            ctx
        );
        let pool = dex_functions::get_pool(&dapp_hub, asset_0, asset_1);
        let total_lp_received = assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender());
        // 99999999999000
        debug::print(&total_lp_received);

        dex_system::remove_liquidity(
            &mut dapp_hub, 
            asset_0, 
            asset_1, 
            total_lp_received / 2, 
            0, 
            0, 
            ctx.sender(), 
            ctx
        );
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, ctx.sender()) == 10000000000 - 1000000000 + 899991000);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, ctx.sender()) == 89999);
    
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()));

        // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, ctx.sender()) == 0, 0);
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender()));

        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, pool_address) == 0, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, pool_address) == 0, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, @0xB) == 999990, 0);
        std::debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), @0xB));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_0, pool.pool_address()));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_1, pool.pool_address()));

        dex_system::remove_liquidity(
            &mut dapp_hub, 
            asset_0, 
            asset_1, 
            total_lp_received / 2, 
            0, 
            0, 
            ctx.sender(), 
            ctx
        );
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, ctx.sender()) == 10000000000 - 1000000000 + 899991000);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, ctx.sender()) == 89999);
    
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()));

        // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, ctx.sender()) == 0, 0);
        debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), ctx.sender()));

        // assert!(assets_system::balance_of(&mut dapp_hub, asset_0, pool_address) == 0, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, asset_1, pool_address) == 0, 0);
        // assert!(assets_system::balance_of(&mut dapp_hub, lp_asset_id, @0xB) == 999990, 0);
        std::debug::print(&assets_system::balance_of(&dapp_hub, pool.lp_asset(), @0xB));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_0, pool.pool_address()));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_1, pool.pool_address()));

        dapp_hub.destroy();
    
        scenario.end();
    }

    #[test]
    public fun can_swap() {
        let (mut dapp_hub, mut scenario, asset_0, asset_1, asset_2) = init_test();
        dubhe_config::set_swap_fee(&mut dapp_hub, 30);
        dubhe_config::set_fee_to(&mut dapp_hub, @0xB);

        let ctx =  test_scenario::ctx(&mut scenario);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_1, asset_2);

        assets_system::mint(&mut dapp_hub, asset_0, ctx.sender(), 10000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 1000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_2, ctx.sender(), 100000 * DECIMAL, ctx);

        let liquidity1 = 800 * DECIMAL;
        let liquidity2 = 200 * DECIMAL;

        dex_system::add_liquidity(&mut dapp_hub, asset_0, asset_1, liquidity1, liquidity2, 1, 1, ctx.sender(), ctx);

        let input_amount = 10 * DECIMAL;
        let expect_receive =
            dex_system::get_amounts_out(&mut dapp_hub, input_amount, vector[asset_0, asset_1]);
        debug::print(&expect_receive);

        let balance0 = 10000 * DECIMAL - liquidity1 - input_amount;
        let balance1 = 1000 * DECIMAL - liquidity2 + expect_receive[expect_receive.length() - 1];
        dex_system::swap_exact_tokens_for_tokens(&mut dapp_hub, input_amount, 1, vector[asset_0, asset_1], ctx.sender(), ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()) == balance0, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == balance1, 0);

        let liquidity1 = liquidity1 + input_amount;
        let liquidity2 = liquidity2 - expect_receive[expect_receive.length() - 1];
        let pool_address = asset_pools::get_pool_address(&dapp_hub, asset_0, asset_1);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, pool_address) == liquidity1, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool_address) == liquidity2, 0);


        let output_amount = 10 * DECIMAL;
        let amounts =
            dex_system::get_amounts_in(&mut dapp_hub, output_amount, vector[asset_1, asset_0]);
        debug::print(&amounts);
        dex_system::swap_tokens_for_exact_tokens(&mut dapp_hub, output_amount, amounts[0], vector[asset_1, asset_0], ctx.sender(), ctx);

        let balance0 = balance0 + output_amount;
        let balance1 = balance1 - amounts[0];

        assert!(assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()) == balance0, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == balance1, 0);

        let liquidity1 = liquidity1 - output_amount;
        let liquidity2 = liquidity2 + amounts[0];
        assert!(assets_system::balance_of(&dapp_hub, asset_0, pool_address) == liquidity1, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool_address) == liquidity2, 0);

        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_0, asset_1));

        dapp_hub.destroy();
    
        scenario.end();
    }

     #[test]
    public fun can_multiple_swap() {
        let (mut dapp_hub, mut scenario, asset_0, asset_1, asset_2) = init_test();
        dubhe_config::set_swap_fee(&mut dapp_hub, 30);
        dubhe_config::set_fee_to(&mut dapp_hub, @0xB);

        let ctx =  test_scenario::ctx(&mut scenario);
        dex_system::create_pool(&mut dapp_hub, asset_0, asset_1);
        dex_system::create_pool(&mut dapp_hub, asset_1, asset_2);

        assets_system::mint(&mut dapp_hub, asset_0, ctx.sender(), 10000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 1000 * DECIMAL, ctx);
        assets_system::mint(&mut dapp_hub, asset_2, ctx.sender(), 100000 * DECIMAL, ctx);

        let liquidity1 = 800 * DECIMAL;
        let liquidity2 = 200 * DECIMAL;
        let liquidity3 = 100 * DECIMAL;
        let liquidity4 = 100 * DECIMAL;

        dex_system::add_liquidity(&mut dapp_hub, asset_0, asset_1, liquidity1, liquidity2, 1, 1, ctx.sender(), ctx);
        dex_system::add_liquidity(&mut dapp_hub, asset_1, asset_2, liquidity3, liquidity4, 1, 1, ctx.sender(), ctx);

        let input_amount = 10 * DECIMAL;
        let path = vector[asset_0, asset_1, asset_2];
        let amounts =
            dex_system::get_amounts_out(&mut dapp_hub, input_amount, path);
        debug::print(&amounts);

        let balance0 = 10000 * DECIMAL - liquidity1 - input_amount;
        let balance1 = 1000 * DECIMAL - liquidity2 - liquidity3;
        let balance2 = 100000 * DECIMAL - liquidity3 + amounts[amounts.length() - 1];

        dex_system::swap_exact_tokens_for_tokens(&mut dapp_hub, input_amount, 1, path, ctx.sender(), ctx);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()) == balance0, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == balance1, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_2, ctx.sender()) == balance2, 0);

        let liquidity1 = liquidity1 + input_amount;
        let liquidity2 = liquidity2 - amounts[1];
        let pool_address = asset_pools::get_pool_address(&dapp_hub, asset_0, asset_1);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, pool_address) == liquidity1, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool_address) == liquidity2, 0);
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_0, pool_address));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_1, pool_address));

        let liquidity3 = liquidity3 + amounts[1];
        let liquidity4 = liquidity4 - amounts[2];
        let pool_address = asset_pools::get_pool_address(&dapp_hub, asset_2, asset_1);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool_address) == liquidity3, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_2, pool_address) == liquidity4, 0);
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_1, pool_address));
        std::debug::print(&assets_system::balance_of(&dapp_hub, asset_2, pool_address));

        let output_amount = 10 * DECIMAL;
        let path = vector[asset_0, asset_1, asset_2];
        let amounts =
            dex_system::get_amounts_in(&mut dapp_hub, output_amount, path);
        debug::print(&amounts);
        dex_system::swap_tokens_for_exact_tokens(&mut dapp_hub, output_amount, amounts[0], path, ctx.sender(), ctx);

        let balance0 = balance0 - amounts[0];
        let balance1 = balance1;
        let balance2 = balance2 + output_amount;

        assert!(assets_system::balance_of(&dapp_hub, asset_0, ctx.sender()) == balance0, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, ctx.sender()) == balance1, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_2, ctx.sender()) == balance2, 0);

        let liquidity1 = liquidity1 + amounts[0];
        let liquidity2 = liquidity2 - amounts[1];
        let pool_address = asset_pools::get_pool_address(&dapp_hub, asset_0, asset_1);
        assert!(assets_system::balance_of(&dapp_hub, asset_0, pool_address) == liquidity1, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool_address) == liquidity2, 0);

        let liquidity3 = liquidity3 + amounts[1];
        let liquidity4 = liquidity4 - amounts[2];
        let pool_address = asset_pools::get_pool_address(&dapp_hub, asset_2, asset_1);
        assert!(assets_system::balance_of(&dapp_hub, asset_1, pool_address) == liquidity3, 0);
        assert!(assets_system::balance_of(&dapp_hub, asset_2, pool_address) == liquidity4, 0);

        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_0, asset_1));
        std::debug::print(&dex_functions::get_pool(&dapp_hub, asset_1, asset_2));
        dapp_hub.destroy();
    
        scenario.end();
    }

    // #[test]
    // fun mock_swap() {
    //     let (mut dapp_hub, mut scenario, asset_0, asset_1, _) = init_test();

    //     let ctx = test_scenario::ctx(&mut scenario);
    //   dex_system::create_pool(&mut dapp_hub, asset_0, asset_1, ctx);

    //   assets_system::mint(&mut dapp_hub, asset_0, ctx.sender(), 10000 * DECIMAL, ctx);
    //     assets_system::mint(&mut dapp_hub, asset_1, ctx.sender(), 1000 * DECIMAL, ctx);

    //   dapp_hub.pools().set(asset_0, asset_1, dubhe_pool::new(
    //         @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, 
    //         2, 
    //         3392173622 - 653980268 - 6524556,
    //         80109881 - 15444457 - 154084, 
    //         271746625189758982
    //         )
    //     );

    //     dapp_hub.asset_metadata().set(asset_0, dubhe::asset_metadata::new(
    //         std::ascii::string(b"USDT"),
    //         std::ascii::string(b"USDT"),
    //         std::ascii::string(b"USDT"),
    //         9,
    //         std::ascii::string(b""),
    //         std::ascii::string(b""),
    //         @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7,
    //         418696631,
    //         0,
    //         dubhe::asset_status::new_liquid(),
    //         true,
    //         true,
    //         true,
    //         dubhe::asset_type::new_lp()
    //     ));

    //     dapp_hub.account().set(asset_0, @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, dubhe::dubhe_account::new(
    //        2738193354,
    //         dubhe::account_status::new_liquid(),
    //     ));

    //     dapp_hub.account().set(asset_1, @0xcdbf6f09931206f105dbd759561f36aff7676f5eec7fe6e027473cea643250f7, dubhe::dubhe_account::new(
    //         64665424,
    //         dubhe::account_status::new_liquid(),
    //     ));

    //     dex_system::add_liquidity(
    //         &mut dapp_hub, 
    //         asset_0, 
    //         asset_1, 
    //         200000000, 
    //         4723218, 
    //         199000000, 
    //         4699602, 
    //         ctx.sender(), 
    //         ctx
    //     );
    //     dapp_hub.destroy();
    //     scenario.end();
    // }
}