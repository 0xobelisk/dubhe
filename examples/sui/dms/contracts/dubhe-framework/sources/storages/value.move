module dubhe::storage_value;

use std::ascii::{String, string};
use sui::dynamic_field as field;
use dubhe::storage_event;
use std::option::some;
use std::option::none;

public struct StorageValue<phantom V: copy + drop + store> has key, store {
    /// the ID of this Storage
    id: UID,
    // the name of the Storage
    name: String,
    /// the number of key-value pairs in the Storage
    size: u64,
}

/// Creates a new, empty table
public fun new<V: copy + drop + store>(name: vector<u8>, ctx: &mut TxContext): StorageValue<V> {
    StorageValue {
        id: object::new(ctx),
        name: string(name),
        size: 0,
    }
}

/// Adds a key-value pair to the table `table: &mut Table<K, V>`
public fun set<V: copy + drop + store>(table: &mut StorageValue<V>, v: V) {
    if (table.contains()) {
        field::remove<u8, V>(&mut table.id, 0);
    };
    field::add<u8, V>(&mut table.id, 0, v);
    storage_event::emit_set_record<u8, u8, V>(table.name, none(), none(), some(v));
}

/// Immutable borrows the value associated with the key in the table `table: &Table<K, V>`.
public fun try_get<V: copy + drop + store>(table: &StorageValue<V>): Option<V> {
    if (table.contains()) {
        option::some(table[])
    } else {
        option::none()
    }
}

#[syntax(index)]
/// Immutable borrows the value associated with the key in the table `table: &Table<K, V>`.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun get<V: copy + drop + store>(table: &StorageValue<V>): &V {
    field::borrow<u8, V>(&table.id, 0)
}

/// Removes the key-value pair in the table `table: &mut Table<K, V>` and returns the value.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun remove<V: copy + drop + store>(table: &mut StorageValue<V>) {
    if (table.contains()) {
        field::remove<u8, V>(&mut table.id, 0);
        storage_event::emit_remove_record<u8, u8>(table.name, none(), none());
    }
}

/// Removes the key-value pair in the table `table: &mut Table<K, V>` and returns the value.
/// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry with
/// that key `k: K`.
public fun try_remove<V: copy + drop + store>(table: &mut StorageValue<V>): Option<V> {
    if (table.contains()) {
        let v = field::remove<u8, V>(&mut table.id, 0);
        storage_event::emit_remove_record<u8, u8>(table.name, none(), none());
        option::some(v)
    } else {
        option::none()
    }
}

/// Returns true iff there is a value associated with the key `k: K` in table `table: &Table<K, V>`
public fun contains<V: copy + drop + store>(table: &StorageValue<V>): bool {
    field::exists_with_type<u8, V>(&table.id, 0)
}

/// Returns true iff the table is empty (if `length` returns `0`)
public fun is_empty<V: copy + drop + store>(table: &StorageValue<V>): bool {
    !field::exists_with_type<u8, V>(&table.id, 0)
}

/// Drop a possibly non-empty table.
/// Usable only if the value type `V` has the `drop` ability
public fun drop<V: copy + drop + store>(table: StorageValue<V>) {
    let StorageValue { id, name: _, size: _ } = table;
    id.delete()
}
