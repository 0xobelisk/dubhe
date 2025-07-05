module dubhe::storage_double_map;

use std::ascii::{String, string};
use sui::dynamic_field as field;
use dubhe::storage_event;
use std::option::some;

// An entry in the map
public struct Entry<K1: copy + drop + store, K2: copy + drop + store> has copy, drop, store {
    key1: K1,
    key2: K2,
}

public struct StorageDoubleMap<phantom K1: copy + drop + store, phantom K2: copy + drop + store, phantom V: copy + drop + store> has key, store {
    /// the ID of this Storage
    id: UID,
    // the name of the Storage
    name: String,
    /// the number of key-value pairs in the Storage
    size: u64,
}

/// Creates a new, empty table
public fun new<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(name: vector<u8>, ctx: &mut TxContext): StorageDoubleMap<K1, K2, V> {
    StorageDoubleMap {
        id: object::new(ctx),
        name: string(name),
        size: 0,
    }
}

/// Adds a key-value pair to the table `table: &mut Table<K, V>`
public fun set<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &mut StorageDoubleMap<K1, K2, V>, k1: K1, k2: K2, v: V) {
    let k = Entry { key1: k1, key2: k2 };
    if (table.contains(k1, k2)) {
        field::remove<Entry<K1, K2>, V>(&mut table.id, k);
        field::add(&mut table.id, k, v);
    } else {
        field::add(&mut table.id, k, v);
        table.size = table.size + 1;
    };
    storage_event::emit_set_record<K1, K2, V>(table.name, some(k1), some(k2), some(v));
}

/// Immutable borrows the value associated with the key in the table `table: &Table<K, V>`.
public fun try_get<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &StorageDoubleMap<K1, K2, V>, k1: K1, k2: K2): Option<V> {
    if (table.contains(k1, k2)) {
        option::some(table[k1, k2])
    } else {
        option::none()
    }
}

#[syntax(index)]
/// Immutable borrows the value associated with the key in the table `table: &Table<K, V>`.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun get<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &StorageDoubleMap<K1, K2, V>, k1: K1, k2: K2): &V {
    let k = Entry { key1: k1, key2: k2 };
    field::borrow(&table.id, k)
}

/// Removes the key-value pair in the table `table: &mut Table<K, V>` and returns the value.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun remove<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &mut StorageDoubleMap<K1, K2, V>, k1: K1, k2: K2) {
    if (table.contains(k1, k2)) {
        let k = Entry { key1: k1, key2: k2 };
        field::remove<Entry<K1, K2>, V>(&mut table.id, k);
        table.size = table.size - 1;
        storage_event::emit_remove_record<K1, K2>(table.name, some(k1), some(k2));
    }
}

/// Removes the key-value pair in the table `table: &mut Table<K, V>` and returns the value.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun try_remove<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &mut StorageDoubleMap<K1, K2, V>, k1: K1, k2: K2): Option<V> {
    if (table.contains(k1, k2)) {
        let k = Entry { key1: k1, key2: k2 };
        let v = field::remove<Entry<K1, K2>, V>(&mut table.id, k);
        table.size = table.size - 1;
        storage_event::emit_remove_record<K1, K2>(table.name, some(k1), some(k2));
        option::some(v)
    } else {
        option::none()
    }
}

/// Returns true iff there is a value associated with the key `k: K` in table `table: &Table<K, V>`
public fun contains<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &StorageDoubleMap<K1, K2, V>, k1: K1, k2: K2): bool {
    let k = Entry { key1: k1, key2: k2 };
    field::exists_with_type<Entry<K1, K2>, V>(&table.id, k)
}

/// Returns the size of the table, the number of key-value pairs
public fun length<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &StorageDoubleMap<K1, K2, V>): u64 {
    table.size
}

/// Returns true iff the table is empty (if `length` returns `0`)
public fun is_empty<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: &StorageDoubleMap<K1, K2, V>): bool {
    table.size == 0
}

/// Drop a possibly non-empty table.
/// Usable only if the value type `V` has the `drop` ability
public fun drop<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(table: StorageDoubleMap<K1, K2, V>) {
    let StorageDoubleMap { id, name: _, size: _ } = table;
    id.delete()
}
