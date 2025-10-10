module dubhe::assets_functions {
    use std::u256;
    use dubhe::account_status;
    use dubhe::asset_account;
    use dubhe::utils::asset_to_entity_id;
    use dubhe::asset_status;
    use dubhe::asset_metadata;
    use dubhe::asset_type::AssetType;
    use dubhe::errors::{
        account_blocked_error, overflows_error, 
        asset_not_found_error,
        account_not_found_error, account_frozen_error, balance_too_low_error,
        invalid_receiver_error, invalid_sender_error, asset_already_frozen_error, 
    };
    use dubhe::dapp_service::DappHub;
    use dubhe::dubhe_config;
    use std::ascii::{String};
    use dubhe::asset_supply;
    use dubhe::asset_holder;
    use dubhe::asset_transfer;

    public(package) fun do_create(
        dapp_hub: &mut DappHub,
        asset_type: AssetType,
        owner: address,
        name: String,
        symbol: String,
        description: String,
        decimals: u8,
        icon_url: String,
        is_mintable: bool,
        is_burnable: bool,
        is_freezable: bool,
    ): address {
        let asset_id = dubhe_config::get_next_asset_id(dapp_hub);
        let entity_id = asset_to_entity_id(symbol, asset_id);
        let status = asset_status::new_liquid();
        // set the assets metadata
        asset_metadata::set(
            dapp_hub, 
            entity_id, 
            name, 
            symbol, 
            description, 
            decimals, 
            icon_url, 
            owner, 
            status, 
            is_mintable, 
            is_burnable, 
            is_freezable, 
            asset_type
        );
        asset_supply::set(dapp_hub, entity_id, 0);
        asset_holder::set(dapp_hub, entity_id, 0);

        // Increment the asset ID
        dubhe_config::set_next_asset_id(dapp_hub, asset_id + 1);
        entity_id
    }

    public(package) fun do_mint(dapp_hub: &mut DappHub, asset_id: address, to: address, amount: u256) {
        invalid_receiver_error(to != @0x0);
        update(dapp_hub, asset_id, @0x0, to, amount);
    }

    public(package) fun do_burn(dapp_hub: &mut DappHub, asset_id: address, from: address, amount: u256) {
        invalid_sender_error(from != @0x0);
        update(dapp_hub, asset_id, from, @0x0, amount);
    }

    public(package) fun do_transfer(dapp_hub: &mut DappHub, asset_id: address, from: address, to: address, amount: u256) {
        invalid_sender_error(from != @0x0);
        invalid_receiver_error(to != @0x0);
        update(dapp_hub, asset_id, from, to, amount);
    }


    public(package) fun update(dapp_hub: &mut DappHub, asset_id: address, from: address, to: address, amount: u256) {        
        asset_not_found_error(asset_metadata::has(dapp_hub, asset_id));
        let asset_metadata = asset_metadata::get_struct(dapp_hub, asset_id);
        if( from == @0x0 ) {
            let supply = asset_supply::get(dapp_hub, asset_id);
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            overflows_error(amount <= u256::max_value!() - supply);
            // supply += amount;
            asset_supply::set(dapp_hub, asset_id, supply + amount);
        } else {
            // asset already frozen
            asset_already_frozen_error(asset_metadata.status() != asset_status::new_frozen());
            account_not_found_error(asset_account::has(dapp_hub, asset_id, from));
            let (balance, status) = asset_account::get(dapp_hub, asset_id, from);
            balance_too_low_error(balance >= amount);
            account_frozen_error(status != account_status::new_frozen());
            account_blocked_error(status != account_status::new_blocked());
            // balance -= amount;
            if (balance == amount) {
                let accounts = asset_holder::get(dapp_hub, asset_id);
                asset_holder::set(dapp_hub, asset_id, accounts - 1);
                asset_account::delete(dapp_hub, asset_id, from);
            } else {
                asset_account::set_balance(dapp_hub, asset_id, from, balance - amount);
            }
        };

        if(to == @0x0) {
            // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
            // supply -= amount;
            let supply = asset_supply::get(dapp_hub, asset_id);
            asset_supply::set(dapp_hub, asset_id, supply - amount);
        } else {
            if(asset_account::has(dapp_hub, asset_id, to)) {
                let (balance, status) = asset_account::get(dapp_hub, asset_id, to);
                account_blocked_error(status != account_status::new_blocked());
                asset_account::set_balance(dapp_hub, asset_id, to, balance + amount);
            } else {
                let accounts = asset_holder::get(dapp_hub, asset_id);
                asset_holder::set(dapp_hub, asset_id, accounts + 1);
                asset_account::set(dapp_hub, asset_id, to, amount, account_status::new_liquid());
            }
        };

        asset_transfer::set(dapp_hub, from, to, amount, asset_id);
    }
}