module dubhe::dubhe_dex_system {
    use std::ascii;
    use dubhe::dubhe_pool;
    use dubhe::dubhe_dex_functions::{sort_assets};
    use dubhe::dubhe_assets_functions;
    use dubhe::dubhe_dex_functions;
    use dubhe::dubhe_schema::Schema;
    use dubhe::dubhe_asset_type;
    use dubhe::dubhe_errors:: {
        asset_not_found_error, more_than_max_swap_path_len_error, pool_already_exists_error,swap_path_too_small_error, below_min_amount_error, less_than_amount_out_min_error, more_than_amount_in_max_error
    };
    use dubhe::dubhe_events::{pool_created_event, liquidity_added_event, liquidity_removed_event};

    const LP_ASSET_DESCRIPTION: vector<u8> = b"Merak LP Asset";
    const LP_ASSET_NAME: vector<u8> = b"Merak LP Asset";


    /// Creates a new pool for the given assets.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `asset_a`: The first asset
    /// * `asset_b`: The second asset
    public entry fun create_pool(schema: &mut Schema, asset_a: u256, asset_b: u256, ctx: &mut TxContext) {
        let sender = ctx.sender();

        assert!(asset_a != asset_b, 0);

        let (asset_0, asset_1) = sort_assets(asset_a, asset_b);

        asset_not_found_error(schema.asset_metadata().contains(asset_0));
        asset_not_found_error(schema.asset_metadata().contains(asset_1));
        pool_already_exists_error(!schema.pools().contains(asset_0, asset_1));

        let asset_0_metadata = schema.asset_metadata()[asset_0];
        let asset_1_metadata = schema.asset_metadata()[asset_1];
        let lp_asset_symbol = dubhe_dex_functions::pool_asset_symbol(asset_0_metadata, asset_1_metadata);
        let pool_address = dubhe_dex_functions::pair_for(asset_0, asset_1);

        let lp_asset_id = dubhe_assets_functions::do_create(
            schema,
            false,
            false,
            false,
            dubhe_asset_type::new_lp(),
            @0x0,
            ascii::string(LP_ASSET_NAME),
            lp_asset_symbol,
            ascii::string(LP_ASSET_DESCRIPTION),
            9,
            ascii::string(b""),
            ascii::string(b""),
        );

        schema.pools().set(
            asset_0, 
            asset_1, 
            dubhe_pool::new(pool_address, lp_asset_id, 0, 0, 0)
        );
        pool_created_event(sender, asset_0, asset_1, pool_address, lp_asset_id, lp_asset_symbol);
    }

    /// Adds liquidity to the pool for the given assets.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `asset_a`: The first asset
    /// * `asset_b`: The second asset
    /// * `amount_a_desired`: The amount of the first asset desired
    /// * `amount_b_desired`: The amount of the second asset desired
    /// * `amount_a_min`: The minimum amount of the first asset
    /// * `amount_b_min`: The minimum amount of the second asset
    /// * `to`: The address to send the liquidity to
    public entry fun add_liquidity(
        schema: &mut Schema, 
        asset_a: u256, 
        asset_b: u256, 
        amount_a_desired: u256, 
        amount_b_desired: u256, 
        amount_a_min: u256, 
        amount_b_min: u256, 
        to: address,
        ctx: &mut TxContext
    ): u256 {
        let sender = ctx.sender();

        let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(schema, asset_a, asset_b).get();

        let (amount_a, amount_b) = dubhe_dex_functions::do_add_liquidity(schema, asset_a, asset_b, amount_a_desired, amount_b_desired, amount_a_min, amount_b_min);

        dubhe_assets_functions::do_transfer(schema, asset_a, sender, pool_address, amount_a);
        dubhe_assets_functions::do_transfer(schema, asset_b, sender, pool_address, amount_b);
        let liquidity = dubhe_dex_functions::mint(schema, asset_a, asset_b, to, ctx);
        liquidity_added_event(sender, asset_a, asset_b, amount_a, amount_b, lp_asset_id, liquidity);
        liquidity
    }

    /// Removes liquidity from the pool for the given assets.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `asset_a`: The first asset
    /// * `asset_b`: The second asset
    /// * `liquidity`: The amount of liquidity to remove
    /// * `amount_a_min`: The minimum amount of the first asset
    /// * `amount_b_min`: The minimum amount of the second asset
    /// * `to`: The address to send the assets to
    public entry fun remove_liquidity(
        schema: &mut Schema, 
        asset_a: u256, 
        asset_b: u256, 
        liquidity: u256, 
        amount_a_min: u256, 
        amount_b_min: u256, 
        to: address,
        ctx: &mut TxContext
    ): (u256, u256) {
        let sender = ctx.sender();
        let (pool_address, lp_asset_id, _, _, _) = dubhe_dex_functions::get_pool(schema, asset_a, asset_b).get();
        dubhe_assets_functions::do_transfer(schema, lp_asset_id, sender, pool_address, liquidity);
        let (amount_0, amount_1) = dubhe_dex_functions::burn(schema, asset_a, asset_b, to, ctx);
        let (asset_0, _) = sort_assets(asset_a, asset_b);
        let (amount_a, amount_b) = if (asset_0 == asset_a) {
            (amount_0, amount_1)
        } else {
            (amount_1, amount_0)
        };
        below_min_amount_error(amount_a >= amount_a_min);
        below_min_amount_error(amount_b >= amount_b_min);
        liquidity_removed_event(sender, asset_a, asset_b, amount_a, amount_b, lp_asset_id, liquidity);
        (amount_a, amount_b)
    }

    /// Swaps the exact amount of `asset1` into `asset2`.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `amount_in`: The amount of the first asset
    /// * `amount_out_min`: The minimum amount of the second asset
    /// * `path`: The path of the assets
    /// * `to`: The address to send the assets to
    public entry fun swap_exact_tokens_for_tokens(
        schema: &mut Schema, 
        amount_in: u256, 
        amount_out_min: u256, 
        path: vector<u256>, 
        to: address, 
        ctx: &mut TxContext
    ): vector<u256> {
        let sender = ctx.sender();
        let amounts = get_amounts_out(schema, amount_in, path);
        less_than_amount_out_min_error(amounts[amounts.length() - 1] >= amount_out_min);
        dubhe_assets_functions::do_transfer(
            schema, 
            path[0], 
            sender, 
            dubhe_dex_functions::pair_for(path[0], path[1]), 
            amounts[0]
        );
        dubhe_dex_functions::do_swap(schema, amounts, path, to, ctx);
        amounts
    }

    /// Swaps any amount of `asset1` to get the exact amount of `asset2`.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `amount_out`: The amount of the second asset
    /// * `amount_in_max`: The maximum amount of the first asset
    /// * `path`: The path of the assets
    /// * `to`: The address to send the assets to
    public entry fun swap_tokens_for_exact_tokens(
        schema: &mut Schema, 
        amount_out: u256, 
        amount_in_max: u256, 
        path: vector<u256>, 
        to: address, 
        ctx: &mut TxContext
    ): vector<u256> {
        let sender = ctx.sender();
        let amounts = get_amounts_in(schema, amount_out, path);
        more_than_amount_in_max_error(amounts[0] <= amount_in_max);
        dubhe_assets_functions::do_transfer(
            schema, 
            path[0], 
            sender, 
            dubhe_dex_functions::pair_for(path[0], path[1]), 
            amounts[0]
        );
        dubhe_dex_functions::do_swap(schema, amounts, path, to, ctx);
        amounts
    }

    /// Calculates the amount out for the given path.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `amount_in`: The amount of the first asset
    /// * `path`: The path of the assets
    public fun get_amounts_out(schema: &mut Schema, amount_in: u256, path: vector<u256>): vector<u256> {
        swap_path_too_small_error(path.length() >= 2);
        more_than_max_swap_path_len_error(path.length() <= schema.max_swap_path_len()[]);
        let mut amounts = vector[];
        amounts.push_back(amount_in);

        let mut i = 0;
        while (i < path.length() - 1) {
            let (reserve_in, reserve_out) = dubhe_dex_functions::get_reserves(schema, path[i], path[i + 1]);
            let amount = amounts[i];
            amounts.push_back(dubhe_dex_functions::get_amount_out(schema, amount, reserve_in, reserve_out));
            i = i + 1;
        };
        amounts
    }

    /// Calculates the amount in for the given path.
    /// # Arguments
    /// 
    /// * `schema`: The schema of the contract
    /// * `amount_out`: The amount of the second asset
    /// * `path`: The path of the assets
    public fun get_amounts_in(schema: &mut Schema, amount_out: u256, path: vector<u256>): vector<u256> {
        swap_path_too_small_error(path.length() >= 2);
        more_than_max_swap_path_len_error(path.length() <= schema.max_swap_path_len()[]);
        let mut amounts = vector[];
        amounts.push_back(amount_out);

        let mut i = path.length() - 1;
        while (i > 0) {
            let (reserve_in, reserve_out) = dubhe_dex_functions::get_reserves(schema, path[i - 1], path[i]);
            let amount = amounts[amounts.length() - 1];
            amounts.push_back(dubhe_dex_functions::get_amount_in(schema, amount, reserve_in, reserve_out));
            i = i - 1;
        };
        amounts.reverse();
        amounts
    }
}