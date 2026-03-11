module dubhe::dubhe_events;

use sui::event;
use std::ascii::String;


public struct Dubhe_Store_SetRecord has copy, drop {
      dapp_key: String,
      account: String,
      key: vector<vector<u8>>,
      value: vector<vector<u8>>
}

public fun new_store_set_record(dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>>): Dubhe_Store_SetRecord {
      Dubhe_Store_SetRecord {
            dapp_key,
            account,
            key,
            value
      }
}

public fun emit_store_set_record(dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>>) {
      event::emit(new_store_set_record(dapp_key, account, key, value));
}

public struct Dubhe_Store_DeleteRecord has copy, drop {
      dapp_key: String,
      account: String,
      key: vector<vector<u8>>
}

public fun new_store_delete_record(dapp_key: String, account: String, key: vector<vector<u8>>): Dubhe_Store_DeleteRecord {
      Dubhe_Store_DeleteRecord {
            dapp_key,
            account,
            key
      }
}

public fun emit_store_delete_record(dapp_key: String, account: String, key: vector<vector<u8>>) {
      event::emit(new_store_delete_record(dapp_key, account, key));
}