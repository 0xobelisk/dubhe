module dubhe::data_key;
use sui::hash::keccak256;
use sui::address;
use std::type_name;
use std::bcs;

public struct DataKey has key, store { id: UID }

public(package) fun new(ctx: &mut TxContext): DataKey {
    DataKey { id: object::new(ctx) }
}

// public struct DataKey has copy, drop { 
//     package_id: address,
//     table_name: vector<u8>,
//     extra: vector<u8>,
// }

// public(package) fun get<DappKey: copy + drop>(table_name: vector<u8>, extra: vector<u8>): vector<u8> {
//     let package_id = address::from_ascii_bytes(type_name::get<DappKey>().get_address().as_bytes());
//     bcs::to_bytes(&DataKey {
//         package_id,
//         table_name,
//         extra,
//     })
// }