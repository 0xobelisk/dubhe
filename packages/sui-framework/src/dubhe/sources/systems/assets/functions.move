module dubhe::dubhe_assets_functions {
    use std::u256;
    use std::ascii::String;
    use std::ascii::string;
    use std::type_name;
    use dubhe::dubhe_account_status;
    use dubhe::dubhe_asset_status;
    use dubhe::dubhe_asset_metadata;
    use dubhe::custom_schema;
    use dubhe::dubhe_account;
    use dubhe::dubhe_schema::Schema;
    use dubhe::dubhe_asset_type::AssetType;
    use dubhe::dubhe_events::{asset_transferred_event};
    use dubhe::dubhe_errors::{
        account_blocked_error, overflows_error, 
        asset_not_found_error,
        account_not_found_error, account_frozen_error, balance_too_low_error,
        invalid_receiver_error, invalid_sender_error, asset_already_frozen_error
    };

    /// Authorization Key for secondary apps.
    public struct AssetsDappKey<phantom A: drop> has copy, drop, store {
        asset_id: u256,
    }

    public(package) fun do_create(
        schema: &mut Schema,
        is_mintable: bool,
        is_burnable: bool,
        is_freezable: bool,
        asset_type: AssetType,
        owner: address,
        name: String,
        symbol: String,
        description: String,
        decimals: u8,
        icon_url: String,
        extra_info: String,
    ): u256 {
        let asset_id = schema.next_asset_id()[];

        // set the assets metadata
        let asset_metadata = dubhe_asset_metadata::new(
        name,
        symbol,
        description,
        decimals,
        icon_url,
        extra_info,
            owner,
            0,
            0,
            dubhe_asset_status::new_liquid(),
            is_mintable,
            is_burnable,
            is_freezable,
            asset_type
        );
        schema.asset_metadata().set(asset_id, asset_metadata);

        // Increment the asset ID
        schema.next_asset_id().set(asset_id + 1);

        asset_id
    }

    public(package) fun do_mint(schema: &mut Schema, asset_id: u256, to: address, amount: u256) {
        invalid_receiver_error(to != @0xdead);
        update(schema, asset_id, @0xfeed, to, amount);
    }

    public(package) fun do_burn(schema: &mut Schema, asset_id: u256, from: address, amount: u256) {
        invalid_sender_error(from != @0xfeed);
        update(schema, asset_id, from, @0xdead, amount);
    }

    public(package) fun do_transfer(schema: &mut Schema, asset_id: u256, from: address, to: address, amount: u256) {
        invalid_sender_error(from != @0xfeed);
        invalid_receiver_error(to != @0xdead);
        update(schema, asset_id, from, to, amount);
    }


    public(package) fun update(schema: &mut Schema, asset_id: u256, from: address, to: address, amount: u256) {        
        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let mut asset_metadata = schema.asset_metadata()[asset_id];
        if( from == @0xfeed ) {
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            overflows_error(amount <= u256::max_value!() - asset_metadata.get_supply());
            // supply += amount;
            let supply = asset_metadata.get_supply();
            asset_metadata.set_supply(supply + amount);
            schema.asset_metadata().set(asset_id, asset_metadata);
        } else {
            // asset already frozen
            asset_already_frozen_error(asset_metadata.get_status() != dubhe_asset_status::new_frozen());
            account_not_found_error(schema.account().contains(asset_id, from));
            let (balance, status) = schema.account().get(asset_id, from).get();
            balance_too_low_error(balance >= amount);
            account_frozen_error(status != dubhe_account_status::new_frozen());
            account_blocked_error(status != dubhe_account_status::new_blocked());
            // balance -= amount;
            if (balance == amount) {
                let accounts = asset_metadata.get_accounts();
                asset_metadata.set_accounts(accounts -  1);
                schema.asset_metadata().set(asset_id, asset_metadata);
                schema.account().remove(asset_id, from);
            } else {
                schema.account().set(asset_id, from, dubhe_account::new(balance - amount, status));
            }
        };

        if(to == @0xdead) {
            // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
            // supply -= amount;
            let supply = asset_metadata.get_supply();
            asset_metadata.set_supply(supply - amount);
            schema.asset_metadata().set(asset_id, asset_metadata);
        } else {
            let mut account = schema.account().try_get(asset_id, to);
            if(account.is_some()) {
                let (balance, status) = account.extract().get();
                account_blocked_error(status != dubhe_account_status::new_blocked());
                schema.account().set(asset_id, to, dubhe_account::new(balance + amount, status))
            } else {
                let accounts = asset_metadata.get_accounts();
                asset_metadata.set_accounts(accounts + 1);
                schema.asset_metadata().set(asset_id, asset_metadata);
                schema.account().set(asset_id, to, dubhe_account::new(amount, dubhe_account_status::new_liquid()));
            }
        };
        asset_transferred_event(asset_id, from, to, amount);
    }

    public(package) fun add_package_asset<DappKey: drop>(schema: &mut Schema, asset_id: u256) {
        let package_assets = custom_schema::package_assets(schema);
        package_assets.add(AssetsDappKey<DappKey>{ asset_id }, true);
        let dapp_key = type_name::get<DappKey>().into_string();
        dubhe::storage_event::emit_set_record<String, u256, bool>(
            string(b"package_assets"), 
            option::some(dapp_key), 
            option::some(asset_id), 
            option::some(true)
        );
    }

    public(package) fun is_package_asset<DappKey: drop>(schema: &mut Schema, asset_id: u256): bool {
        let package_assets = custom_schema::package_assets(schema);
        package_assets.contains(AssetsDappKey<DappKey>{ asset_id })
    }

    public(package) fun assert_asset_is_package_asset<DappKey: drop>(schema: &mut Schema, asset_id: u256) {
        if(!is_package_asset<DappKey>(schema, asset_id)) {
            asset_not_found_error(false);
        }
    }

    public(package) fun charge_set_fee<DappKey: copy + drop>(schema: &mut Schema) {
        let package_id = dubhe::type_info::get_package_id<DappKey>();
        let mut dapp_stats = schema.dapp_stats()[package_id];
        let remaining_set_count = dapp_stats.get_remaining_set_count();
        let total_set_count = dapp_stats.get_total_set_count();
        if(remaining_set_count != 0) {
            dapp_stats.set_remaining_set_count(remaining_set_count - 1);
        } else {
            let dubhe_treasury_address = schema.fee_to()[];
            let fee = dapp_stats.get_per_set_fee();
            let dubhe_asset_id = 1;
            do_transfer(schema, dubhe_asset_id, package_id, dubhe_treasury_address, fee);
            let total_set_fees_paid = dapp_stats.get_total_set_fees_paid();
            dapp_stats.set_total_set_fees_paid(total_set_fees_paid + fee);
        };
        dapp_stats.set_total_set_count(total_set_count + 1);
        schema.dapp_stats().set(package_id, dapp_stats);
    }
}