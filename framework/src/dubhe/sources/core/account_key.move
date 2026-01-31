module dubhe::account_key;

use std::ascii::String;
use std::bcs;
use std::type_name;
use sui::address;

public struct AccountData has key, store { id: UID }

public(package) fun new_account_data(ctx: &mut TxContext): AccountData {
    AccountData { id: object::new(ctx) }
}

public(package) fun get_id_mut(account_data: &mut AccountData): &mut UID {
    &mut account_data.id
}

public(package) fun get_id(account_data: &AccountData): &UID {
    &account_data.id
}

public struct AccountKey has copy, drop, store {
    address: String,
    package_id: String,
}

public(package) fun new_account_key<DappKey: copy + drop>(address: String): AccountKey {
    AccountKey {
        address: address,
        package_id: type_name::get<DappKey>().get_address(),
    }
}