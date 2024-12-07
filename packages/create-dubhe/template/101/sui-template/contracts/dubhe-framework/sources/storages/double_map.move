#[allow(unused_variable)]
module dubhe::storage_double_map {

    // This key does not exist in the map
    const EKeyDoesNotExist: u64 = 0;

    /// This key already exists in the map
    const EKeyAlreadyExists: u64 = 1;

    // An entry in the map
    public struct Entry<K1: copy + drop + store, K2: copy + drop + store, V: store> has copy, drop, store {
        key1: K1,
        key2: K2,
        value: V,
    }

    // A map data structure backed by a vector. The map is guaranteed not to contain duplicate keys, but entries
    public struct StorageDoubleMap<K1: copy + drop + store, K2: copy + drop + store, V: store> has store {
        contents: vector<Entry<K1, K2, V>>,
    }

    // Create an empty `StorageDoubleMap`
    public fun new<K1: copy + drop + store, K2: copy + drop + store, V: store>(): StorageDoubleMap<K1, K2,V> {
        StorageDoubleMap { contents: vector[] }
    }

    // Return true if `self` contains_key an entry for `key`, false otherwise
    public fun contains_key<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): bool {
        get_idx_opt(self, key1, key2).is_some()
    }

    // Return the number of entries in `self`
    public fun length<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &StorageDoubleMap<K1, K2, V>): u64 {
        self.contents.length()
    }

    // Get a reference to the value bound to `key` in `self`.
    // Aborts if `key` is not bound in `self`.
    public fun borrow<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): &V {
        let idx = self.get_idx(key1, key2);
        let entry = &self.contents[idx];
        &entry.value
    }

    // Get a mutable reference to the value bound to `key` in `self`.
    // Aborts if `key` is not bound in `self`.
    public fun borrow_mut<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &mut StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): &mut V {
        let idx = self.get_idx(key1, key2);
        let entry = &mut self.contents[idx];
        &mut entry.value
    }

    // Remove the entry `key` |-> `value` from self. Aborts if `key` is not bound in `self`.
    public fun take<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &mut StorageDoubleMap<K1, K2,V>, key1: K1, key2: K2): V {
        let idx = self.get_idx(key1, key2);
        let Entry { key1, key2, value } = self.contents.remove(idx);
        value
    }

    public macro fun mutate<$K1: copy + drop, $K2: copy + drop, $V: copy + drop>(
        $self: &mut StorageDoubleMap<$K1, $K2, $V>,
        $key1: $K1,
        $key2: $K2,
        $f: |&mut $V|
    ) {
        let self = $self;
        let key1 = $key1;
        let key2 = $key2;
        $f(borrow_mut(self, key1, key2));
    }

    // Returns a list of keys in the map.
    // Do not assume any particular ordering.
    public fun keys<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &StorageDoubleMap<K1, K2, V>): (vector<K1>, vector<K2>) {
        let mut i = 0;
        let n = self.contents.length();
        let mut keys1 = vector[];
        let mut keys2 = vector[];
        while (i < n) {
            let entry = self.contents.borrow(i);
            keys1.push_back(entry.key1);
            keys2.push_back(entry.key2);
            i = i + 1;
        };
        (keys1, keys2)
    }

    // Find the index of `key` in `self`. Return `None` if `key` is not in `self`.
    // Note that map entries are stored in insertion order, *not* sorted by key.
    public fun get_idx_opt<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): Option<u64> {
        self.contents.find_index!(|entry| { entry.key1 == key1 && entry.key2 == key2 })
    }

    // Find the index of `key` in `self`. Aborts if `key` is not in `self`.
    // Note that map entries are stored in insertion order, *not* sorted by key.
    public fun get_idx<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): u64 {
        let idx_opt = self.get_idx_opt(key1, key2);
        assert!(idx_opt.is_some(), EKeyDoesNotExist);
        idx_opt.destroy_some()
    }

    /// Insert the entry `key` |-> `value` into `self`.
    /// Aborts if `key` is already bound in `self`.
    public fun insert<K1: copy + drop + store, K2: copy + drop + store, V: store>(self: &mut StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2, value: V) {
        assert!(!self.contains_key(key1, key2), EKeyAlreadyExists);
        self.contents.push_back(Entry { key1, key2, value })
    }

    // =======================================Value: drop + copy + store=======================================

    // Insert the entry `key` |-> `value` into `self`.
    public fun set<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(self: &mut StorageDoubleMap<K1, K2,V>, key1: K1, key2: K2, value: V) {
        let idx = self.get_idx_opt(key1, key2);
        if (idx.is_some()) {
            self.contents[idx.destroy_some()].value = value;
        } else {
            self.contents.push_back(Entry { key1, key2, value })
        }
    }

    // Get a reference to the value bound to `key` in `self`.
    // Aborts if `key` is not bound in `self`.
    public fun get<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(self: &StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): V {
        let idx = self.get_idx(key1, key2);
        let entry = &self.contents[idx];
        entry.value
    }

    // Safely try borrow a value bound to `key` in `self`.
    // Return Some(V) if the value exists, None otherwise.
    // Only works for a "copyable" value as references cannot be stored in `vector`.
    public fun try_get<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(self: &StorageDoubleMap<K1, K2, V>, key1: K1, key2: K2): Option<V> {
        if (self.contains_key(key1, key2)) {
            option::some(get(self, key1, key2))
        } else {
            option::none()
        }
    }

    // Remove the entry `key` |-> `value` from self.
    public fun remove<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(self: &mut StorageDoubleMap<K1, K2,V>, key1: K1, key2: K2) {
        let idx = self.get_idx_opt(key1, key2);
        if (idx.is_some()) {
            self.contents.remove(idx.destroy_some());
        }
    }

    // Returns a list of values in the map.
    // Do not assume any particular ordering.
    public fun values<K1: copy + drop + store, K2: copy + drop + store, V: copy + drop + store>(self: &StorageDoubleMap<K1, K2, V>): vector<V> {
        self.contents.map!(|entry| entry.value)
    }
}