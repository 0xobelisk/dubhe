module dubhe::dubhe_wrapper_system {
    use std::ascii::String;
    use std::ascii::string;
    use std::u64;
    use dubhe::dubhe_assets_functions;
    use sui::balance;
    use sui::balance::Balance;
    use sui::coin;
    use sui::coin::{Coin};
    use dubhe::custom_schema::WrapperCoin;
    use dubhe::custom_schema;
    use dubhe::dubhe_schema::Schema;
    use std::type_name;
    use dubhe::dubhe_errors::{overflows_error};
    use dubhe::dubhe_asset_type;



    public entry fun wrap<T>(schema: &mut Schema, coin: Coin<T>, beneficiary: address): u256 {
        let wrapper_coin = custom_schema::new<T>();
        assert!(custom_schema::wrapper_assets(schema).contains(wrapper_coin), 0);
        let asset_id = *custom_schema::wrapper_assets(schema).borrow<WrapperCoin<T>, u256>(wrapper_coin);
        let amount = coin.value();
        let pool_balance = custom_schema::wrapper_pools(schema).borrow_mut<u256, Balance<T>>(asset_id);
        pool_balance.join(coin.into_balance());
        dubhe::storage_event::storage_map_set(string(b"wrapper_pools"), asset_id, pool_balance.value());
        dubhe_assets_functions::do_mint(schema, asset_id, beneficiary, amount as u256);
        amount as u256
    }

    public entry fun unwrap<T>(schema: &mut Schema, amount: u256, beneficiary: address, ctx: &mut TxContext) {
        let coin =  do_unwrap<T>(schema, amount, ctx);
        transfer::public_transfer(coin, beneficiary);
    }

    public(package) fun do_register<T>(schema: &mut Schema, name: String, symbol: String, description: String, decimals: u8, url: String, info: String): u256 {
        let asset_id = dubhe_assets_functions::do_create(schema, false, false, true, dubhe_asset_type::new_wrapped(),@0x0, name, symbol, description, decimals, url, info);
        custom_schema::wrapper_assets(schema).add<WrapperCoin<T>, u256>(custom_schema::new(), asset_id);
        let coin_type = type_name::get<T>().into_string();
        dubhe::storage_event::storage_map_set(string(b"wrapper_assets"), coin_type, asset_id);
        custom_schema::wrapper_pools(schema).add<u256, Balance<T>>(asset_id, balance::zero<T>());
        dubhe::storage_event::storage_map_set(string(b"wrapper_pools"), asset_id, 0);
        asset_id
    }

    public(package) fun do_unwrap<T>(schema: &mut Schema, amount: u256, ctx: &mut TxContext): Coin<T> {
        overflows_error(amount <= u64::max_value!() as u256);
        let wrapper_coin = custom_schema::new<T>();
        assert!(custom_schema::wrapper_assets(schema).contains(wrapper_coin), 0);
        let asset_id = *custom_schema::wrapper_assets(schema).borrow<WrapperCoin<T>, u256>(wrapper_coin);
        dubhe_assets_functions::do_burn(schema, asset_id, ctx.sender(), amount);
        let pool_balance = custom_schema::wrapper_pools(schema).borrow_mut<u256, Balance<T>>(asset_id);
        let balance = pool_balance.split(amount as u64);
        dubhe::storage_event::storage_map_set(string(b"wrapper_pools"), asset_id, pool_balance.value());
        coin::from_balance<T>(balance, ctx)
    }
}