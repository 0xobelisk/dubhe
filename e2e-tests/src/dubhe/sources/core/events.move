module dubhe::dubhe_events;

use sui::event;


public struct Store_SetRecord has copy, drop {
      table_id: vector<u8>,
      key_tuple: vector<vector<u8>>,
      value_tuple: vector<vector<u8>>
}

public fun new_store_set_record(table_id: vector<u8>, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>): Store_SetRecord {
      Store_SetRecord {
            table_id,
            key_tuple,
            value_tuple
      }
}

public fun emit_store_set_record(table_id: vector<u8>, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>) {
      event::emit(new_store_set_record(table_id, key_tuple, value_tuple));
}

public struct Store_SetField has copy, drop {
      table_id: vector<u8>,
      key_tuple: vector<vector<u8>>,
      field_index: u8,
      value: vector<u8>
}

public fun new_store_set_field(table_id: vector<u8>, key_tuple: vector<vector<u8>>, field_index: u8, value: vector<u8>): Store_SetField {
      Store_SetField {
            table_id,
            key_tuple,
            field_index,
            value
      }
}

public fun emit_store_set_field(table_id: vector<u8>, key_tuple: vector<vector<u8>>, field_index: u8, value: vector<u8>) {
      event::emit(new_store_set_field(table_id, key_tuple, field_index, value));
}

public struct Store_DeleteRecord has copy, drop {
      table_id: vector<u8>,
      key_tuple: vector<vector<u8>>
}

public fun new_store_delete_record(table_id: vector<u8>, key_tuple: vector<vector<u8>>): Store_DeleteRecord {
      Store_DeleteRecord {
            table_id,
            key_tuple
      }
}

public fun emit_store_delete_record(table_id: vector<u8>, key_tuple: vector<vector<u8>>) {
      event::emit(new_store_delete_record(table_id, key_tuple));
}