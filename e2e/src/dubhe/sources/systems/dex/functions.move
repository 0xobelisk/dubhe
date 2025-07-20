module dubhe::dex_functions {
    use dubhe::dubhe_math;
    use dubhe::assets_functions;
    use dubhe::dapp_service::DappHub;
    use sui::bcs;
    use sui::address;
    use dubhe::assets_system;
    use dubhe::errors::{
       reserves_cannot_be_zero_error, amount_cannot_be_zero_error,
        liquidity_cannot_be_zero_error, below_min_amount_error
    };
    use sui::hash;
    use dubhe::errors::overflows_error;
    use dubhe::errors::more_than_reserve_error;
    use dubhe::asset_pools;
    use dubhe::asset_pools::AssetPools;
    use dubhe::dubhe_config;
    use dubhe::asset_metadata::AssetMetadata;

    const MINIMUM_LIQUIDITY: u256 = 1000;

    public(package) fun sort_assets(asset_a: address, asset_b: address): (address, address) {
        assert!(asset_a != asset_b, 0);
        if (asset_a.to_u256() < asset_b.to_u256()) {
            (asset_a, asset_b)
        } else {
            (asset_b, asset_a)
        }
    }

    public(package) fun pair_for(asset_a: address, asset_b: address): address {
        let (asset_0, asset_1) = sort_assets(asset_a, asset_b);
        let mut asset_0 = bcs::to_bytes(&asset_0);
        let asset_1 = bcs::to_bytes(&asset_1);
        asset_0.append(asset_1);
        address::from_bytes(hash::blake2b256(&asset_0))
    }

    public(package) fun get_pool(dapp_hub: &DappHub, asset_a: address, asset_b: address): AssetPools {
        let (asset_0, asset_1) = sort_assets(asset_a, asset_b);
        asset_pools::ensure_has(dapp_hub, asset_0, asset_1);
        asset_pools::get_struct(dapp_hub, asset_0, asset_1)
    }

    public(package) fun get_reserves(dapp_hub: &DappHub, asset_a: address, asset_b: address): (u256, u256) {
        let (asset_0, asset_1) = sort_assets(asset_a, asset_b);
        asset_pools::ensure_has(dapp_hub, asset_0, asset_1);
        let pool = asset_pools::get_struct(dapp_hub, asset_0, asset_1);
        let reserve_0 = pool.reserve0() as u256;
        let reserve_1 = pool.reserve1() as u256;
        if (asset_0 == asset_a) {
            (reserve_0, reserve_1)
        } else {
            (reserve_1, reserve_0)
        }
    }

    public(package) fun quote(amount: u256, reserve_a: u256, reserve_b: u256): u256 {
        amount_cannot_be_zero_error(amount > 0);
        reserves_cannot_be_zero_error(reserve_a > 0 && reserve_b > 0);
        dubhe_math::safe_mul_div(amount , reserve_b , reserve_a)
    }

    // Calculates amount out.
    //
    // Given an input amount of an asset and pair reserves, returns the maximum output amount
    // of the other asset.
    public(package) fun get_amount_out(dapp_hub: &DappHub, amount_in: u256, reserve_in: u256, reserve_out: u256): u256 {
        reserves_cannot_be_zero_error(amount_in > 0 && reserve_in > 0 && reserve_out > 0);
        let swap_fee = dubhe_config::get_swap_fee(dapp_hub);
        let amount_in_with_fee = dubhe_math::safe_mul(amount_in, 10000 - swap_fee);
        let numerator = dubhe_math::safe_mul(amount_in_with_fee, reserve_out);
        let denominator = dubhe_math::safe_mul(reserve_in, 10000) + amount_in_with_fee;
        dubhe_math::safe_div(numerator, denominator)
    }

    // Calculates amount out.
    //
    // Given an input amount of an asset and pair reserves, returns the maximum output amount
    // of the other asset.
    public(package) fun get_amount_in(dapp_hub: &DappHub, amount_out: u256, reserve_in: u256, reserve_out: u256): u256 {
        reserves_cannot_be_zero_error(amount_out > 0 && reserve_in > 0 && reserve_out > 0);
        let numerator = dubhe_math::safe_mul(dubhe_math::safe_mul(reserve_in, amount_out), 10000);
        let swap_fee = dubhe_config::get_swap_fee(dapp_hub);
        let denominator = dubhe_math::safe_mul((reserve_out - amount_out), 10000 - swap_fee);
        dubhe_math::safe_div(numerator, denominator) + 1
    }

    public(package) fun pool_asset_symbol(asset1_metadata: AssetMetadata, asset2_metadata: AssetMetadata): vector<u8> {
        let asset1_symbol = asset1_metadata.symbol();
        let asset2_symbol = asset2_metadata.symbol();
        let mut lp_asset_symbol = vector::empty();
        lp_asset_symbol.append(asset1_symbol);
        lp_asset_symbol.append(b"-");
        lp_asset_symbol.append(asset2_symbol);
        lp_asset_symbol
    }

    // update reserves and, on the first call per block, price accumulators
    public(package) fun update(pool: &mut AssetPools, balance0: u256, balance1: u256) {
        overflows_error(balance0 <= std::u128::max_value!() as u256 && balance1 <= std::u128::max_value!() as u256);
        pool.update_reserve0(balance0 as u128);
        pool.update_reserve1(balance1 as u128);
    }

    // if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    public(package) fun mint_fee(dapp_hub: &mut DappHub, pool: &mut AssetPools, reserve0: u256, reserve1: u256): bool {
        let fee_to = dubhe_config::get_fee_to(dapp_hub);
        let fee_on = fee_to != @0x0;
        let k_last = pool.k_last(); 
        if (fee_on) {
            if (k_last != 0) {
                    let root_k = dubhe_math::safe_mul_sqrt(reserve0, reserve1);
                    let root_k_last = dubhe_math::sqrt_down(k_last);
                    if (root_k > root_k_last) {
                        let total_supply = assets_system::supply_of(dapp_hub, pool.lp_asset());
                        let numerator = total_supply * (root_k - root_k_last);
                        let denominator = root_k * 5 + root_k_last;
                        let liquidity = numerator / denominator;
                        if (liquidity > 0) assets_functions::do_mint(dapp_hub, pool.lp_asset(), fee_to, liquidity);
                    }
            }
        } else if (k_last != 0) {
            pool.update_k_last(0);
        };
        fee_on
    }


    // this low-level function should be called from a contract which performs important safety checks
    public(package) fun mint(dapp_hub: &mut DappHub, asset_a: address, asset_b: address, to: address): u256 {
        let (asset_0, asset_1) = sort_assets(asset_a, asset_b);
        let (reserve0, reserve1) = get_reserves(dapp_hub, asset_0, asset_1); // gas savings
        let mut pool = get_pool(dapp_hub, asset_a, asset_b);
        let balance0 = assets_system::balance_of(dapp_hub, asset_0, pool.pool_address());
        let balance1 = assets_system::balance_of(dapp_hub, asset_1, pool.pool_address());
        let amount0 = balance0 - reserve0;
        let amount1 = balance1 - reserve1;

        let fee_on = mint_fee(dapp_hub, &mut pool, reserve0, reserve1);
        let total_supply = assets_system::supply_of(dapp_hub, pool.lp_asset()); 
        let liquidity = if (total_supply == 0) {
            // permanently lock the first MINIMUM_LIQUIDITY tokens
            assets_functions::do_mint(dapp_hub, pool.lp_asset(), @0xdead, MINIMUM_LIQUIDITY); 
            dubhe_math::safe_mul_sqrt(amount0, amount1) - MINIMUM_LIQUIDITY
        } else {
            std::u256::min(
                dubhe_math::safe_mul_div(amount0, total_supply, reserve0),
                dubhe_math::safe_mul_div(amount1, total_supply, reserve1)
            )
        };
        liquidity_cannot_be_zero_error(liquidity > 0);
        assets_functions::do_mint(dapp_hub, pool.lp_asset(), to, liquidity);

        update(&mut pool, balance0, balance1);
        if (fee_on) pool.update_k_last(dubhe_math::safe_mul(balance0, balance1)); // reserve0 and reserve1 are up-to-date
        asset_pools::set_struct(dapp_hub, asset_0, asset_1, pool);
        liquidity
    }

     // this low-level function should be called from a contract which performs important safety checks
    public(package) fun burn(dapp_hub: &mut DappHub, asset_a: address, asset_b: address, to: address) : (u256, u256) {
        let (asset_0, asset_1) = sort_assets(asset_a, asset_b);
        let (reserve0, reserve1) = get_reserves(dapp_hub, asset_0, asset_1);
        let mut pool = get_pool(dapp_hub, asset_a, asset_b);
        let balance0 = assets_system::balance_of(dapp_hub, asset_0, pool.pool_address());
        let balance1 = assets_system::balance_of(dapp_hub, asset_1, pool.pool_address());
        let liquidity = assets_system::balance_of(dapp_hub, pool.lp_asset(), pool.pool_address());

        let fee_on = mint_fee(dapp_hub, &mut pool, reserve0, reserve1);
        let total_supply = assets_system::supply_of(dapp_hub, pool.lp_asset());
        let amount0 = dubhe_math::safe_mul_div(liquidity, balance0, total_supply);
        let amount1 = dubhe_math::safe_mul_div(liquidity, balance1, total_supply);
        amount_cannot_be_zero_error(amount0 > 0 && amount1 > 0);
        assets_functions::do_burn(dapp_hub, pool.lp_asset(), pool.pool_address(), liquidity);
        assets_functions::do_transfer(dapp_hub, asset_0, pool.pool_address(), to, amount0);
        assets_functions::do_transfer(dapp_hub, asset_1, pool.pool_address(), to, amount1);

        let balance0 = assets_system::balance_of(dapp_hub, asset_0, pool.pool_address());
        let balance1 = assets_system::balance_of(dapp_hub, asset_1, pool.pool_address());

        update(&mut pool, balance0, balance1);
        if (fee_on) pool.update_k_last(dubhe_math::safe_mul(balance0, balance1)); // reserve0 and reserve1 are up-to-date
        asset_pools::set_struct(dapp_hub, asset_0, asset_1, pool);
        (amount0, amount1)
    }


    public(package) fun do_add_liquidity(
        dapp_hub: &DappHub, 
        asset_a: address, 
        asset_b: address, 
        amount_a_desired: u256, 
        amount_b_desired: u256, 
        amount_a_min: u256, 
        amount_b_min: u256
    ): (u256, u256) {
         // create the pair if it doesn't exist yet
        let (reserve_a, reserve_b) = get_reserves(dapp_hub, asset_a, asset_b);
        if (reserve_a == 0 && reserve_b == 0) {
            (amount_a_desired, amount_b_desired)
        } else {
            let amount_b_optimal = quote(amount_a_desired, reserve_a, reserve_b);
            if (amount_b_optimal <= amount_b_desired) {
                below_min_amount_error(amount_b_optimal >= amount_b_min);
                (amount_a_desired, amount_b_optimal)
            } else {
                let amount_a_optimal = quote(amount_b_desired, reserve_b, reserve_a);
                below_min_amount_error(amount_a_optimal <= amount_a_desired);
                below_min_amount_error(amount_a_optimal >= amount_a_min);
                (amount_a_optimal, amount_b_desired)
            }
        }
    }


    // this low-level function should be called from a contract which performs important safety checks
    public(package) fun swap(
        dapp_hub: &mut DappHub,
        asset_0: address,
        asset_1: address,
        amount0_out: u256, 
        amount1_out: u256, 
        to: address, 
    ) {
        let (reserve_0, reserve_1) = get_reserves(dapp_hub, asset_0, asset_1);
        let mut pool = get_pool(dapp_hub, asset_0, asset_1);
        amount_cannot_be_zero_error(amount0_out > 0 || amount1_out > 0);
        more_than_reserve_error(amount0_out < reserve_0 && amount1_out < reserve_1);
        
        if (amount0_out > 0) assets_functions::do_transfer(dapp_hub, asset_0, pool.pool_address(), to, amount0_out); // optimistically transfer tokens
        if (amount1_out > 0) assets_functions::do_transfer(dapp_hub, asset_1, pool.pool_address(), to, amount1_out); // optimistically transfer tokens
        let balance0 = assets_system::balance_of(dapp_hub, asset_0, pool.pool_address());
        let balance1 = assets_system::balance_of(dapp_hub, asset_1, pool.pool_address());
        
        let amount0_in = if (balance0 > reserve_0 - amount0_out) { balance0 - (reserve_0 - amount0_out) } else { 0 };
        let amount1_in = if (balance1 > reserve_1 - amount1_out) { balance1 - (reserve_1 - amount1_out) } else { 0 };
        amount_cannot_be_zero_error(amount0_in > 0 || amount1_in > 0);
        
        // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        let swap_fee = dubhe_config::get_swap_fee(dapp_hub);
        let balance0_adjusted = dubhe_math::safe_mul(balance0, 10000) - dubhe_math::safe_mul(amount0_in, swap_fee);
        let balance1_adjusted = dubhe_math::safe_mul(balance1, 10000) - dubhe_math::safe_mul(amount1_in, swap_fee);
        
        assert!(
            dubhe_math::safe_mul(balance0_adjusted, balance1_adjusted) 
            >= 
            dubhe_math::safe_mul(dubhe_math::safe_mul(reserve_0, reserve_1), 10000 * 10000), 0
        );
        update(&mut pool, balance0, balance1);
        asset_pools::set_struct(dapp_hub, asset_0, asset_1, pool);
    }

    public(package) fun do_swap(dapp_hub: &mut DappHub, amounts: vector<u256>, path: vector<address>, to: address, ctx: &TxContext) {
       let mut i = 0;
       while (i < path.length() - 1) {
            let (input, output) = (path[i], path[i + 1]);
            let (asset_0, asset_1) = sort_assets(input, output);
            let amount_out = amounts[i + 1];
            let (amount0_out, amount1_out) = if (asset_0 == input) {
                (0, amount_out)
            } else {
                (amount_out, 0)
            };

            let to = if (i < path.length() - 2) {
                pair_for(output, path[i + 2])
            } else {
                to
            };

            swap(dapp_hub, asset_0, asset_1, amount0_out, amount1_out, to);
            i = i + 1;
       };
    }
}