// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_variable)]
module obelisk::storage_map {

    /// This key already exists in the map
    const EKeyAlreadyExists: u64 = 0;

    /// This key does not exist in the map
    const EKeyDoesNotExist: u64 = 1;

    /// An entry in the map
    public struct Entry<K: copy + drop + store, V: store> has copy, drop, store {
        key: K,
        value: V,
    }

    /// A map data structure backed by a vector. The map is guaranteed not to contain duplicate keys, but entries
    /// are *not* sorted by key--entries are included in insertion order.
    /// All operations are O(N) in the size of the map--the intention of this data structure is only to provide
    /// the convenience of programming against a map API.
    /// Large maps should use handwritten parent/child relationships instead.
    /// Maps that need sorted iteration rather than insertion order iteration should also be handwritten.
    public struct StorageMap<K: copy + drop + store, V: store> has store {
        contents: vector<Entry<K, V>>,
    }

    /// Create an empty `StorageMap`
    public fun new<K: copy + drop + store, V: store>(): StorageMap<K, V> {
        StorageMap { contents: vector[] }
    }

    /// Return true if `self` contains_key an entry for `key`, false otherwise
    public fun contains_key<K: copy + drop + store, V: store>(self: &StorageMap<K, V>, key: K): bool {
        get_idx_opt(self, key).is_some()
    }

    /// Return the number of entries in `self`
    public fun length<K: copy + drop + store, V: store>(self: &StorageMap<K,V>): u64 {
        self.contents.length()
    }

    /// Get a reference to the value bound to `key` in `self`.
    /// Aborts if `key` is not bound in `self`.
    public fun borrow<K: copy + drop + store, V: store>(self: &StorageMap<K,V>, key: K): &V {
        let idx = self.get_idx(key);
        let entry = &self.contents[idx];
        &entry.value
    }


    /// Get a mutable reference to the value bound to `key` in `self`.
    /// Aborts if `key` is not bound in `self`.
    public fun borrow_mut<K: copy + drop + store, V: store>(self: &mut StorageMap<K,V>, key: K): &mut V {
        let idx = self.get_idx(key);
        let entry = &mut self.contents[idx];
        &mut entry.value
    }

    /// Remove the entry `key` |-> `value` from self. Aborts if `key` is not bound in `self`.
    public fun take<K: copy + drop + store, V: store>(self: &mut StorageMap<K,V>, key: K): V {
        let idx = self.get_idx(key);
        let Entry { key, value } = self.contents.remove(idx);
        value
    }

    public macro fun mutate<$K: copy + drop + store, $V: store>(
        $self: &mut StorageMap<$K, $V>,
        $key: $K,
        $f: |&mut $V|
    ) {
        let self = $self;
        let key = $key;
        $f(borrow_mut(self, key));
    }

    /// Returns a list of keys in the map.
    /// Do not assume any particular ordering.
    public fun keys<K: copy + drop + store, V: store>(self: &StorageMap<K, V>): vector<K> {
        let mut i = 0;
        let n = self.contents.length();
        let mut keys = vector[];
        while (i < n) {
            let entry = self.contents.borrow(i);
            keys.push_back(entry.key);
            i = i + 1;
        };
        keys
    }

    /// Find the index of `key` in `self`. Return `None` if `key` is not in `self`.
    /// Note that map entries are stored in insertion order, *not* sorted by key.
    public fun get_idx_opt<K: copy + drop + store, V: store>(self: &StorageMap<K,V>, key: K): Option<u64> {
        self.contents.find_index!(|entry| { entry.key == key})
    }

    /// Find the index of `key` in `self`. Aborts if `key` is not in `self`.
    /// Note that map entries are stored in insertion order, *not* sorted by key.
    public fun get_idx<K: copy + drop + store, V: store>(self: &StorageMap<K,V>, key: K): u64 {
        let idx_opt = self.get_idx_opt(key);
        assert!(idx_opt.is_some(), EKeyDoesNotExist);
        idx_opt.destroy_some()
    }

    /// Insert the entry `key` |-> `value` into `self`.
    /// Aborts if `key` is already bound in `self`.
    public fun insert<K: copy + drop + store, V: store>(self: &mut StorageMap<K,V>, key: K, value: V) {
        assert!(!self.contains_key(key), EKeyAlreadyExists);
        self.contents.push_back(Entry { key, value })
    }

    // =======================================Value: drop + copy + store=======================================

    /// Adds a key-value pair to the self `self: &mut StorageMap<K, V>`
    /// Aborts with `sui::dynamic_field::EFieldAlreadyExists` if the self already has an entry with
    /// that key `k: K`.
    public fun set<K: copy + drop + store, V: copy + drop + store>(self: &mut StorageMap<K, V>, key: K, value: V) {
        let idx = self.get_idx_opt(key);
        if (idx.is_some()) {
            self.contents[idx.destroy_some()].value = value;
        } else {
            self.contents.push_back(Entry { key, value })
        }
    }

    /// Get a reference to the value bound to `key` in `self`.
    /// Aborts if `key` is not bound in `self`.
    public fun get<K: copy + drop + store, V: copy + drop + store>(self: &StorageMap<K,V>, key: K): V {
        let idx = self.get_idx(key);
        let entry = &self.contents[idx];
        entry.value
    }

    /// Safely try borrow a value bound to `key` in `self`.
    /// Return Some(V) if the value exists, None otherwise.
    /// Only works for a "copyable" value as references cannot be stored in `vector`.
    public fun try_get<K: copy + drop + store, V: copy + drop + store>(self: &StorageMap<K,V>, key: K): Option<V> {
        if (self.contains_key(key)) {
            option::some(get(self, key))
        } else {
            option::none()
        }
    }

    /// Remove the entry `key` |-> `value` from self. Aborts if `key` is not bound in `self`.
    public fun remove<K: copy + drop + store, V: copy + drop + store>(self: &mut StorageMap<K,V>, key: K) {
        let idx = self.get_idx_opt(key);
        if (idx.is_some()) {
            self.contents.remove(idx.destroy_some());
        }
    }

    // Returns a list of values in the map.
    // Do not assume any particular ordering.
    public fun values<K: copy + drop + store, V: copy + drop + store>(self: &StorageMap<K, V>): vector<V> {
        self.contents.map!(|entry| entry.value)
    }
}
