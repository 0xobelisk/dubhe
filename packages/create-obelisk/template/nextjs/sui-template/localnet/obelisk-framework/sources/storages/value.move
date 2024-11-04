// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module obelisk::storage_value {

    /// This key does not exist in the map
    const EValueDoesNotExist: u64 = 0;

    /// This key does not exist in the map
    const EValueAlreadyExist: u64 = 1;

    /// An entry in the value
    public struct Entry<Value: store> has copy, drop, store {
        value: Value,
    }

    /// A storable handler for values in general. Is used in the `StorageValue`
    public struct StorageValue<Value: store> has store {
        contents: vector<Entry<Value>>,
    }

    /// Creates a new, empty StorageValue
    public fun new<Value: store>(): StorageValue<Value> {
        StorageValue { contents: vector[] }
    }

    /// Gets the value of the StorageValue `self: &StorageValue<Value>`.
    public fun borrow<Value: store>(self: &StorageValue<Value>): &Value {
        assert!(self.contains(), EValueDoesNotExist);
        &self.contents[0].value
    }

    /// Gets the value of the StorageValue `self: &mut StorageValue<Value>`.
    public fun borrow_mut<Value: store>(self: &mut StorageValue<Value>): &mut Value {
        assert!(self.contains(), EValueDoesNotExist);
        &mut self.contents[0].value
    }

    /// Update the `value` of the `StorageValue`.
    public macro fun mutate<$Value: store>($self: &mut StorageValue<$Value>, $f: |&mut $Value|) {
        let self = $self;
        $f(borrow_mut(self));
    }

    /// Return true if `self` contains_key an entry for `key`, false otherwise
    public fun contains<V: store>(self: &StorageValue<V>): bool {
        self.contents.length() == 1
    }

    /// Remove the entry `key` |-> `value` from self. Aborts if `key` is not bound in `self`.
    public fun take<V: store>(self: &mut StorageValue<V>): V {
        assert!(self.contains(), EValueDoesNotExist);
        let Entry { value } = self.contents.remove(0);
        value
    }

    /// Set the `value` of the `StorageValue`.
    public fun put<V: store>(self: &mut StorageValue<V>, value: V) {
        assert!(!self.contains(), EValueAlreadyExist);
        self.contents.push_back(Entry { value });
    }


    // ======================================= Value: drop + copy + store =======================================

    /// Set the `value` of the `StorageValue`.
    public fun set<V: copy + drop + store>(self: &mut StorageValue<V>, value: V) {
        if (self.contains()) {
            *self.borrow_mut() = value;
        } else {
            self.contents.push_back(Entry { value });
        }
    }

    /// Get the `value` of the `StorageValue`.
    public fun get<V: copy + drop + store>(self: &StorageValue<V>): V {
        assert!(self.contains(), EValueDoesNotExist);
        self.contents[0].value
    }

    /// Safely try borrow a value bound to `key` in `self`.
    /// Return Some(V) if the value exists, None otherwise.
    /// Only works for a "copyable" value as references cannot be stored in `vector`.
    public fun try_get<V: copy + drop + store>(self: &StorageValue<V>): Option<V> {
        if (self.contains()) {
            option::some(self.contents[0].value)
        } else {
            option::none()
        }
    }

    /// Remove the entry `key` |-> `value` from self. Aborts if `key` is not bound in `self`.
    public fun remove<V: copy + drop + store>(self: &mut StorageValue<V>) {
        if (self.contains()) {
            self.contents.remove(0);
        }
    }

    // ============================================================================================
}
