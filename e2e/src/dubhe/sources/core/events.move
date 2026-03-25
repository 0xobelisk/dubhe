module dubhe::dubhe_events;

use sui::event;
use std::ascii::String;


public struct Dubhe_Store_SetRecord has copy, drop {
      dapp_key: String,
      account: String,
      key: vector<vector<u8>>,
      value: vector<vector<u8>>
}

public(package) fun new_store_set_record(dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>>): Dubhe_Store_SetRecord {
      Dubhe_Store_SetRecord {
            dapp_key,
            account,
            key,
            value
      }
}

/// Only dapp_service (same package) may emit storage events.
/// Making this package-internal prevents any external module from forging
/// arbitrary SetRecord events to poison the off-chain indexer.
public(package) fun emit_store_set_record(dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>>) {
      event::emit(new_store_set_record(dapp_key, account, key, value));
}

public struct Dubhe_Store_DeleteRecord has copy, drop {
      dapp_key: String,
      account: String,
      key: vector<vector<u8>>
}

public(package) fun new_store_delete_record(dapp_key: String, account: String, key: vector<vector<u8>>): Dubhe_Store_DeleteRecord {
      Dubhe_Store_DeleteRecord {
            dapp_key,
            account,
            key
      }
}

/// Only dapp_service (same package) may emit storage events.
public(package) fun emit_store_delete_record(dapp_key: String, account: String, key: vector<vector<u8>>) {
      event::emit(new_store_delete_record(dapp_key, account, key));
}
