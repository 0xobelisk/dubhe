module dubhe::storage_event;
use std::ascii::String;
use sui::event;

public struct RemoveRecord<K1: copy + drop, K2: copy + drop> has copy, drop {
    name: String,
    key1: Option<K1>,
    key2: Option<K2>
}

public struct SetRecord<K1: copy + drop, K2: copy + drop, V: copy + drop> has copy, drop {
    name: String,
    key1: Option<K1>,
    key2: Option<K2>,
    value: Option<V>
}

public fun emit_set_record<K1: copy + drop, K2: copy + drop, V: copy + drop>(name: String, key1: Option<K1>, key2: Option<K2>, value: Option<V>) {
    event::emit(SetRecord {
        name,
        key1,
        key2,
        value
    });
}

public fun emit_remove_record<K1: copy + drop, K2: copy + drop>(name: String, key1: Option<K1>, key2: Option<K2>) {
    event::emit(RemoveRecord {
        name,
        key1,
        key2,
    });
}

public fun storage_value_set<V: copy + drop>(name: String, value: V) {
    emit_set_record<V, V, V>(name, option::none(), option::none(), option::some(value));
}

public fun storage_value_remove<V: copy + drop>(name: String) {
    emit_remove_record<V, V>(name, option::none(), option::none());
}

public fun storage_map_set<K1: copy + drop, V: copy + drop>(name: String, key1: K1, value: V) {
    emit_set_record<K1, K1, V>(name, option::some(key1), option::none(), option::some(value));
}

public fun storage_map_remove<K1: copy + drop>(name: String, key1: K1) {
    emit_remove_record<K1, K1>(name, option::some(key1), option::none());
}

public fun storage_double_map_set<K1: copy + drop, K2: copy + drop, V: copy + drop>(name: String, key1: K1, key2: K2, value: V) {
    emit_set_record<K1, K2, V>(name, option::some(key1), option::some(key2), option::some(value));
}

public fun storage_double_map_remove<K1: copy + drop, K2: copy + drop>(name: String, key1: K1, key2: K2) {
    emit_remove_record<K1, K2>(name, option::some(key1), option::some(key2));
}   