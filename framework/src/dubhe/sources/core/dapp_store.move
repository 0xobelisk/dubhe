// module dubhe::dapp_store;

// use std::ascii::String;
// use sui::object_table::ObjectTable;
// use sui::object_table;
// use dubhe::account_key::AccountKey;
// use dubhe::account_key::AccountData;

// /// Storage structure for DApp data and state management
// public struct DappStore has key, store {
//     /// The unique identifier of the DappStore instance
//     id: UID,
//     /// Accounts 
//     accounts: ObjectTable<AccountData, AccountKey>,
// }

// /// Create a new storage instance
// public(package) fun new(ctx: &mut TxContext): DappStore {
//     DappStore {
//         id: object::new(ctx),
//         accounts: object_table::new(ctx),
//     }
// }

// fun init(ctx: &mut TxContext) {
//     sui::transfer::public_share_object(
//         new(ctx)
//     );
// }