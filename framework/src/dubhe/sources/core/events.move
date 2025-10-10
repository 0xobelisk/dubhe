module dubhe::dubhe_events;

use sui::event;
use std::ascii::String;


public struct Dubhe_Store_SetRecord has copy, drop {
      dapp_key: String,
      table_id: String,
      key_tuple: vector<vector<u8>>,
      value_tuple: vector<vector<u8>>
}

public fun new_store_set_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>): Dubhe_Store_SetRecord {
      Dubhe_Store_SetRecord {
            dapp_key,
            table_id,
            key_tuple,
            value_tuple
      }
}

public fun emit_store_set_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>) {
      event::emit(new_store_set_record(dapp_key, table_id, key_tuple, value_tuple));
}

public struct Dubhe_Store_DeleteRecord has copy, drop {
      dapp_key: String,
      table_id: String,
      key_tuple: vector<vector<u8>>
}

public fun new_store_delete_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>): Dubhe_Store_DeleteRecord {
      Dubhe_Store_DeleteRecord {
            dapp_key,
            table_id,
            key_tuple
      }
}

public fun emit_store_delete_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>) {
      event::emit(new_store_delete_record(dapp_key, table_id, key_tuple));
}