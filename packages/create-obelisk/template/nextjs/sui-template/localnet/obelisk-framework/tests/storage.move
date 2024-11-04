#[test_only]
module obelisk::storage_tests {
    use obelisk::storage_double_map::StorageDoubleMap;
    use obelisk::storage_map::StorageMap;
    use obelisk::storage_double_map;
    use obelisk::storage_map;
    use obelisk::storage_value::StorageValue;
    use sui::test_scenario;
    use sui::transfer::public_share_object;
    use obelisk::storage_value;

    public struct TestValue has drop, copy, store {
        value: u64,
    }

    public struct TestStoreValue has store {
        value: u64,
    }

    /// Destroy a TestStoreValue`.
    public fun destroy_value(value: TestStoreValue) {
        let TestStoreValue { value: _ } = value;
    }

    public struct TestObject has key, store {
        id: UID,
        value: StorageValue<TestValue>,
        immutable_value: StorageValue<TestStoreValue>,
        map: StorageMap<u32, TestValue>,
        immutable_map: StorageMap<u32, TestStoreValue>,
        double_map: StorageDoubleMap<u32, u32, TestValue>,
        immutable_double_map: StorageDoubleMap<u32, u32, TestStoreValue>,
    }

    public fun value(self: &mut TestObject): &mut StorageValue<TestValue> {
        &mut self.value
    }


    #[test]
    public fun test_double_map() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut double_map = storage_double_map::new();

        double_map.insert(0, 0, TestValue { value: 0 });
        double_map.insert(0, 1, TestValue { value: 1 });
        double_map.insert(0, 2, TestValue { value: 2 });

        assert!(double_map.contains_key(0, 0));
        assert!(double_map.contains_key(0, 1));
        assert!(double_map.contains_key(0, 2));
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0, 0, 0], 0);
        assert!(keys2 == vector[0, 1, 2], 0);
        assert!(double_map.values() == vector[TestValue { value: 0 }, TestValue { value: 1 }, TestValue { value: 2 }]);
        assert!(double_map.length() == 3);
        assert!(double_map.borrow(0, 0).value == 0);
        assert!(double_map.borrow(0, 1).value == 1);
        assert!(double_map.borrow_mut(0, 2).value == 2);
        assert!(double_map.get(0, 0).value == 0);
        assert!(double_map.get(0, 1).value == 1);
        assert!(double_map.get(0, 2).value == 2);
        assert!(double_map.try_get(0, 0) == option::some(TestValue { value: 0 }));
        assert!(double_map.try_get(0, 1) == option::some(TestValue { value: 1 }));
        assert!(double_map.try_get(0, 2) == option::some(TestValue { value: 2 }));
        assert!(double_map.try_get(0, 3) == option::none());

        double_map.take(0, 1);

        assert!(double_map.contains_key(0, 0));
        assert!(!double_map.contains_key(0, 1));
        assert!(double_map.contains_key(0, 2));
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0, 0]);
        assert!(keys2 == vector[0, 2]);
        assert!(double_map.values() == vector[TestValue { value: 0 }, TestValue { value: 2 }]);
        assert!(double_map.length() == 2);
        assert!(double_map.borrow(0, 0).value == 0);
        assert!(double_map.borrow_mut(0, 2).value == 2);

        double_map.mutate!(0, 0,  |value| {
            *value = TestValue { value: 2 };
        });

        assert!(double_map.contains_key(0, 0));
        assert!(!double_map.contains_key(0, 1));
        assert!(double_map.contains_key(0, 2));
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0, 0]);
        assert!(keys2 == vector[0, 2]);
        assert!(double_map.values() == vector[TestValue { value: 2 }, TestValue { value: 2 }]);
        assert!(double_map.length() == 2);
        assert!(double_map.borrow(0, 0).value == 2);
        assert!(double_map.borrow_mut(0, 2).value == 2);

        double_map.remove(0, 0);
        assert!(!double_map.contains_key(0,0));
        assert!(double_map.length() == 1);
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0]);
        assert!(keys2 == vector[2]);
        assert!(double_map.values() == vector[TestValue { value: 2 }]);

        double_map.remove(0,3);
        assert!(double_map.length() == 1);
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0]);
        assert!(keys2 == vector[2]);
        assert!(double_map.values() == vector[TestValue { value: 2 }]);

        double_map.set(0,3, TestValue { value: 0 });
        assert!(double_map.contains_key(0,3));
        assert!(double_map.length() == 2);
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0, 0]);
        assert!(keys2 == vector[2, 3]);
        assert!(double_map.values() == vector[TestValue { value: 2 }, TestValue { value: 0 }]);
        assert!(double_map.get(0,3).value == 0);

        double_map.set(0,3, TestValue { value: 3 });
        assert!(double_map.contains_key(0,3));
        assert!(double_map.length() == 2);
        let (keys1, keys2) = double_map.keys();
        assert!(keys1 == vector[0, 0]);
        assert!(keys2 == vector[2, 3]);
        assert!(double_map.values() == vector[TestValue { value: 2 }, TestValue { value: 3 }]);
        assert!(double_map.get(0,3).value == 3);

        public_share_object(TestObject {
            id: object::new(ctx),
            value: storage_value::new(),
            immutable_value: storage_value::new(),
            map: storage_map::new(),
            immutable_map: storage_map::new(),
            double_map,
            immutable_double_map: storage_double_map::new(),
        });

        scenario.end();
    }

    #[test]
    public fun test_value() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut value = storage_value::new();
        value.set(TestValue { value: 1 });
        assert!(value.get() == TestValue { value: 1 });
        assert!(*value.borrow() == TestValue { value: 1 });
        assert!(*value.borrow_mut() == TestValue { value: 1 });

        value.set(TestValue { value: 2 });
        assert!(value.get() == TestValue { value: 2 });

        value.mutate!(|value| {
            *value = TestValue { value: 3 };
        });
        assert!(value.get() == TestValue { value: 3 });

        value.set(TestValue { value: 4 });
        assert!(value.get() == TestValue { value: 4 });


        let mut immutable_value = storage_value::new();
        immutable_value.put(TestStoreValue { value: 1 });
        assert!(immutable_value.borrow().value == 1);

        immutable_value.mutate!(|store_value| {
            store_value.value = 2;
        });
        assert!(immutable_value.borrow().value == 2);
        assert!(immutable_value.borrow_mut().value == 2);

        immutable_value.mutate!(|store_value| {
            store_value.value = 3;
        });
        assert!(immutable_value.borrow().value == 3);
        assert!(immutable_value.borrow_mut().value == 3);

        public_share_object(TestObject {
            id: object::new(ctx),
            value,
            immutable_value,
            map: storage_map::new(),
            immutable_map: storage_map::new(),
            double_map: storage_double_map::new(),
            immutable_double_map: storage_double_map::new(),
        });

        scenario.end();
    }

    #[test]
    public fun test_map() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut map = storage_map::new();
        map.insert(0, TestValue { value: 0 });
        map.insert(1, TestValue { value: 1 });
        map.insert(2, TestValue { value: 2 });

        assert!(map.contains_key(0));
        assert!(map.contains_key(1));
        assert!(map.contains_key(2));
        assert!(map.keys() == vector[0, 1, 2]);
        assert!(map.values() == vector[TestValue { value: 0 }, TestValue { value: 1 }, TestValue { value: 2 }]);
        assert!(map.length() == 3);
        assert!(map.borrow(0).value == 0);
        assert!(map.borrow(1).value == 1);
        assert!(map.borrow_mut(2).value == 2);
        assert!(map.get(0).value == 0);
        assert!(map.get(1).value == 1);
        assert!(map.get(2).value == 2);
        assert!(map.try_get(0) == option::some(TestValue { value: 0 }));
        assert!(map.try_get(1) == option::some(TestValue { value: 1 }));
        assert!(map.try_get(2) == option::some(TestValue { value: 2 }));
        assert!(map.try_get(3) == option::none());

        map.take(1);

        assert!(map.contains_key(0));
        assert!(!map.contains_key(1));
        assert!(map.contains_key(2));
        assert!(map.keys() == vector[0, 2]);
        assert!(map.values() == vector[TestValue { value: 0 }, TestValue { value: 2 }]);
        assert!(map.length() == 2);
        assert!(map.borrow(0).value == 0);
        assert!(map.borrow_mut(2).value == 2);


        map.mutate!(0, |store_value| {
            store_value.value = 2;
        });
        assert!(map.contains_key(0));
        assert!(!map.contains_key(1));
        assert!(map.contains_key(2));
        assert!(map.keys() == vector[0, 2]);
        assert!(map.values() == vector[TestValue { value: 2 }, TestValue { value: 2 }]);
        assert!(map.length() == 2);
        assert!(map.borrow(0).value == 2);
        assert!(map.borrow_mut(2).value == 2);

        map.remove(0);
        assert!(!map.contains_key(0));
        assert!(map.length() == 1);
        assert!(map.keys() == vector[2]);
        assert!(map.values() == vector[TestValue { value: 2 }]);

        map.remove(3);
        assert!(map.length() == 1);
        assert!(map.keys() == vector[2]);
        assert!(map.values() == vector[TestValue { value: 2 }]);

        map.set(3, TestValue { value: 0 });
        assert!(map.contains_key(3));
        assert!(map.length() == 2);
        assert!(map.keys() == vector[2, 3]);
        assert!(map.values() == vector[TestValue { value: 2 }, TestValue { value: 0 }]);
        assert!(map.get(3).value == 0);

        map.set(3, TestValue { value: 3 });
        assert!(map.contains_key(3));
        assert!(map.length() == 2);
        assert!(map.keys() == vector[2, 3]);
        assert!(map.values() == vector[TestValue { value: 2 }, TestValue { value: 3 }]);
        assert!(map.get(3).value == 3);

        public_share_object(TestObject {
            id: object::new(ctx),
            value: storage_value::new(),
            immutable_value: storage_value::new(),
            map,
            immutable_map: storage_map::new(),
            double_map: storage_double_map::new(),
            immutable_double_map: storage_double_map::new(),
        });

        scenario.end();
    }

    #[test]
    public fun test_immutable_map() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut immutable_map = storage_map::new();
        immutable_map.insert(0, TestStoreValue { value: 0 });
        immutable_map.insert(1, TestStoreValue { value: 1 });
        immutable_map.insert(2, TestStoreValue { value: 2 });

        assert!(immutable_map.contains_key(0));
        assert!(immutable_map.contains_key(1));
        assert!(immutable_map.contains_key(2));
        assert!(immutable_map.keys() == vector[0, 1, 2]);
        assert!(immutable_map.length() == 3);
        assert!(immutable_map.borrow(0).value == 0);
        assert!(immutable_map.borrow(1).value == 1);
        assert!(immutable_map.borrow_mut(2).value == 2);

        let detele_store_value = immutable_map.take(1);
        destroy_value(detele_store_value);
        assert!(immutable_map.contains_key(0));
        assert!(!immutable_map.contains_key(1));
        assert!(immutable_map.contains_key(2));
        assert!(immutable_map.keys() == vector[0, 2]);
        assert!(immutable_map.length() == 2);
        assert!(immutable_map.borrow(0).value == 0);
        assert!(immutable_map.borrow_mut(2).value == 2);


        immutable_map.mutate!(0, |store_value| {
            store_value.value = 2;
        });
        assert!(immutable_map.contains_key(0));
        assert!(!immutable_map.contains_key(1));
        assert!(immutable_map.contains_key(2));
        assert!(immutable_map.keys() == vector[0, 2]);
        assert!(immutable_map.length() == 2);
        assert!(immutable_map.borrow(0).value == 2);
        assert!(immutable_map.borrow_mut(2).value == 2);

        public_share_object(TestObject {
            id: object::new(ctx),
            value: storage_value::new(),
            immutable_value: storage_value::new(),
            map: storage_map::new(),
            immutable_map,
            double_map: storage_double_map::new(),
            immutable_double_map: storage_double_map::new(),
        });

        scenario.end();
    }

    // #[test]
    // public fun test_immutable_map2() {
    //     let mut scenario = test_scenario::begin(@0x0001);
    //     let ctx = test_scenario::ctx(&mut scenario);
    //
    //     let mut immutable_map = storage_immutable_map::new(ctx);
    //     immutable_map.set(0, TestValue { value: 1 });
    //
    //     // immutable_map.mutate!(|store_value| {
    //     //     store_value.value = 2;
    //     // });
    //     // assert!(immutable_map.get().value == 2);
    //     // assert!(immutable_map.borrow_mut().value == 2);
    //     //
    //     // immutable_map.mutate!(|store_value| {
    //     //     store_value.value = 3;
    //     // });
    //     // assert!(immutable_map.get().value == 3);
    //     // assert!(immutable_map.borrow_mut().value == 3);
    //
    //     public_share_object(TestObject2 {
    //         id: object::new(ctx),
    //         value: storage_value::new(TestValue { value: 1 }),
    //         immutable_value: storage_value::new(TestStoreValue { value: 1 }),
    //         immutable_map,
    //     });
    //
    //     scenario.end();
    // }

    // #[test]
    // public fun test_object() {
    //     let sender = @0x0001;
    //     let mut scenario_val = test_scenario::begin(sender);
    //     let scenario = &mut scenario_val;
    //
    //     let obj = TestObject {
    //         id: object::new(test_scenario::ctx(scenario)),
    //         value: storage_value::empty(),
    //     };
    //     public_share_object(obj);
    //
    //     test_scenario::next_tx(scenario, sender);
    //
    //     let mut obj = test_scenario::take_shared<TestObject>(scenario);
    //
    //     obj.value.set(TestValue { value: 1 });
    //     assert!(obj.value.contains());
    //     assert!(!obj.value.is_empty());
    //     assert!(obj.value.get() == TestValue { value: 1 });
    //
    //     obj.value.set(TestValue { value: 2 });
    //     assert!(obj.value.contains());
    //     assert!(!obj.value.is_empty());
    //     assert!(obj.value.get() == TestValue { value: 2 });
    //
    //     test_scenario::return_shared<TestObject>(obj);
    //     test_scenario::end(scenario_val);
    // }
}