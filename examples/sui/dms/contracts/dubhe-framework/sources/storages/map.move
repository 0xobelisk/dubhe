module dubhe::storage_map;

use std::ascii::String;
use std::ascii::string;
use sui::dynamic_field as field;
use dubhe::storage_event;
use std::option::some;
use std::option::none;

public struct StorageMap<phantom K: copy + drop + store, phantom V: copy + drop + store> has key, store {
    /// the ID of this Storage
    id: UID,
    // the name of the Storage
    name: String,
    /// the number of key-value pairs in the Storage
    size: u64,
}

/// Creates a new, empty table
public fun new<K: copy + drop + store, V: copy + drop + store>(name: vector<u8>, ctx: &mut TxContext): StorageMap<K, V> {
    StorageMap {
        id: object::new(ctx),
        name: string(name),
        size: 0,
    }
}

/// Adds a key-value pair to the table `table: &mut Table<K, V>`
public fun set<K: copy + drop + store, V: copy + drop + store>(table: &mut StorageMap<K, V>, k: K, v: V) {
    if (table.contains(k)) {
        field::remove<K, V>(&mut table.id, k);
        field::add(&mut table.id, k, v);
    } else {
        field::add(&mut table.id, k, v);
        table.size = table.size + 1;
    };
    storage_event::emit_set_record<K, K, V>(table.name, some(k), none(), some(v));
}

/// Immutable borrows the value associated with the key in the table `table: &Table<K, V>`.
public fun try_get<K: copy + drop + store, V: copy + drop + store>(table: &StorageMap<K, V>, k: K): Option<V> {
    if (table.contains(k)) {
        option::some(table[k])
    } else {
        option::none()
    }
}

#[syntax(index)]
/// Immutable borrows the value associated with the key in the table `table: &Table<K, V>`.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun get<K: copy + drop + store, V: copy + drop + store>(table: &StorageMap<K, V>, k: K): &V {
    field::borrow(&table.id, k)
}

/// Removes the key-value pair in the table `table: &mut Table<K, V>` and returns the value.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun remove<K: copy + drop + store, V: copy + drop + store>(table: &mut StorageMap<K, V>, k: K) {
    if (table.contains(k)) {
        field::remove<K, V>(&mut table.id, k);
        table.size = table.size - 1;
        storage_event::emit_remove_record<K, K>(table.name, some(k), none());
    }
}

/// Removes the key-value pair in the table `table: &mut Table<K, V>` and returns the value.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun try_remove<K: copy + drop + store, V: copy + drop + store>(table: &mut StorageMap<K, V>, k: K): Option<V> {
    if (table.contains(k)) {
        let v = field::remove(&mut table.id, k);
        table.size = table.size - 1;
        storage_event::emit_remove_record<K, K>(table.name, some(k), none());
        option::some(v)
    } else {
        option::none()
    }
}

/// Returns true iff there is a value associated with the key `k: K` in table `table: &Table<K, V>`
public fun contains<K: copy + drop + store, V: copy + drop + store>(table: &StorageMap<K, V>, k: K): bool {
    field::exists_with_type<K, V>(&table.id, k)
}

/// Returns the size of the table, the number of key-value pairs
public fun length<K: copy + drop + store, V: copy + drop + store>(table: &StorageMap<K, V>): u64 {
    table.size
}

/// Returns true iff the table is empty (if `length` returns `0`)
public fun is_empty<K: copy + drop + store, V: copy + drop + store>(table: &StorageMap<K, V>): bool {
    table.size == 0
}

/// Drop a possibly non-empty table.
/// Usable only if the value type `V` has the `drop` ability
public fun drop<K: copy + drop + store, V: copy + drop + store>(table: StorageMap<K, V>) {
    let StorageMap { id, name: _, size: _ } = table;
    id.delete()
}
