module dubhe::dubhe_events;

use sui::event;
use std::ascii::String;


public struct Store_SetRecord has copy, drop {
      dapp_key: String,
      table_id: String,
      key_tuple: vector<vector<u8>>,
      value_tuple: vector<vector<u8>>
}

public fun new_store_set_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>): Store_SetRecord {
      Store_SetRecord {
            dapp_key,
            table_id,
            key_tuple,
            value_tuple
      }
}

public fun emit_store_set_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>) {
      event::emit(new_store_set_record(dapp_key, table_id, key_tuple, value_tuple));
}

public struct Store_SetField has copy, drop {
      dapp_key: String,
      table_id: String,
      key_tuple: vector<vector<u8>>,
      field_index: u8,
      value: vector<u8>
}

public fun new_store_set_field(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>, field_index: u8, value: vector<u8>): Store_SetField {
      Store_SetField {
            dapp_key,
            table_id,
            key_tuple,
            field_index,
            value
      }
}

public fun emit_store_set_field(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>, field_index: u8, value: vector<u8>) {
      event::emit(new_store_set_field(dapp_key, table_id, key_tuple, field_index, value));
}

public struct Store_DeleteRecord has copy, drop {
      dapp_key: String,
      table_id: String,
      key_tuple: vector<vector<u8>>
}

public fun new_store_delete_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>): Store_DeleteRecord {
      Store_DeleteRecord {
            dapp_key,
            table_id,
            key_tuple
      }
}

public fun emit_store_delete_record(dapp_key: String, table_id: String, key_tuple: vector<vector<u8>>) {
      event::emit(new_store_delete_record(dapp_key, table_id, key_tuple));
}