module dubhe::dubhe_bridge_system {
    use std::ascii::String;
    use std::u64;
    use dubhe::dubhe::DUBHE;
    use sui::coin::TreasuryCap;
    use sui::coin;
    use dubhe::dubhe_wrapper_system;
    use dubhe::dubhe_schema::Schema;
    use dubhe::dubhe_errors::{
        asset_not_found_error, overflows_error, chain_not_supported_error, bridge_not_opened_error, below_min_amount_error
    };
    use dubhe::dubhe_assets_functions;
    use dubhe::dubhe_events::{ bridge_deposit_event, bridge_withdraw_event };

    public entry fun withdraw(schema: &mut Schema, asset_id: u256, to: address, to_chain: String, amount: u256, ctx: &mut TxContext) {
        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        chain_not_supported_error(schema.bridge().contains(to_chain));
        let from = ctx.sender();
        let (min_amount, fee, opened) = schema.bridge()[to_chain].get();
        below_min_amount_error(amount >= min_amount);
        bridge_not_opened_error(opened);
        let fee_to = schema.fee_to()[];
        dubhe_assets_functions::do_transfer(schema, asset_id, from, fee_to, fee);

        // Transfer DUBHE to fee_to address, wait for burn
        let coin = dubhe_wrapper_system::do_unwrap<DUBHE>(schema, amount - fee, ctx);
        transfer::public_transfer(coin, fee_to);

        bridge_withdraw_event(asset_id, from, to, to_chain, amount, fee);
    }

    public entry fun deposit(schema: &mut Schema, treasury_cap: &mut TreasuryCap<DUBHE>, asset_id: u256, from: address, to: address, from_chain: String, amount: u256, ctx: &mut TxContext) {
        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        overflows_error(amount <= u64::max_value!() as u256);
        let coin = coin::mint(treasury_cap, amount as u64, ctx);
        dubhe_wrapper_system::wrap<DUBHE>(schema, coin, to);
        bridge_deposit_event(asset_id, from, to, from_chain, amount);
    }
}