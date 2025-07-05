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