#[test_only]
module dubhe::storage_tests {
    use dubhe::storage_double_map;
    use dubhe::storage_map;
    use sui::test_scenario;
    use dubhe::storage_value;

    public struct TestValue has drop, copy, store {
        value: u64,
    }

    #[test]
    public fun test_value() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut value = storage_value::new(b"value", ctx);
        value.set(TestValue { value: 1 });
        assert!(value.contains() == true);
        assert!(value.get() == TestValue { value: 1 });
        assert!(value[] == TestValue { value: 1 });

        value.set(TestValue { value: 2 });
        assert!(value.get() == TestValue { value: 2 });
        value.set(TestValue { value: 3 });
        assert!(value.get() == TestValue { value: 3 });
        assert!(value.try_get() == option::some(TestValue { value: 3 }));
        assert!(value.is_empty() == false);

        value.remove();
        assert!(value.contains() == false);
        assert!(value.try_get() == option::none<TestValue>());
        assert!(value.is_empty() == true);

        value.set(TestValue { value: 4 });
        assert!(value.contains() == true);
        assert!(value.try_remove() == option::some(TestValue { value: 4 }));
        assert!(value.try_remove() == option::none<TestValue>());
        assert!(value.contains() == false);

        let x: u64 = 0;
        x.range_do!(1000, |x| {
            value.set(TestValue { value: x });
        });

        value.drop();
        scenario.end();
    }

    #[test]
    public fun test_map() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut map = storage_map::new(b"TestValueMap", ctx);
        assert!(map.is_empty() == true);
        assert!(map.length() == 0);
        map.set(0, TestValue { value: 0 });
        map.set(1, TestValue { value: 1 });
        map.set(2, TestValue { value: 2 });

        assert!(map[0] == TestValue { value: 0 });
        assert!(map.get(0) == TestValue { value: 0 });
        assert!(map.try_get(0) == option::some(TestValue { value: 0 }));
        assert!(map[1] == TestValue { value: 1 });
        assert!(map.get(1) == TestValue { value: 1 });
        assert!(map.try_get(1) == option::some(TestValue { value: 1 }));
        assert!(map[2] == TestValue { value: 2 });
        assert!(map.get(2) == TestValue { value: 2 });
        assert!(map.try_get(2) == option::some(TestValue { value: 2 }));
        assert!(map.try_get(3) == option::none());
        assert!(map.contains(0) == true);
        assert!(map.contains(1) == true);
        assert!(map.contains(2) == true);
        assert!(map.contains(3) == false);
        assert!(map.is_empty() == false);
        assert!(map.length() == 3);

        map.remove(1);
        assert!(map.try_get(1) == option::none());
        assert!(map.contains(0) == true);
        assert!(map.contains(1) == false);
        assert!(map.contains(2) == true);
        assert!(map.length() == 2);

        assert!(map.try_remove(2) == option::some(TestValue { value: 2 }));
        assert!(map.contains(2) == false);
        assert!(map.length() == 1);

        let x: u32 = 1000;
        x.range_do!(2000, |x| {
            map.set(x, TestValue { value: 2 });
        });

        map.drop();
        scenario.end();
    }

    #[test]
    public fun test_double_map() {
        let mut scenario = test_scenario::begin(@0x0001);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut double_map = storage_double_map::new(b"TestValueDoubleMap", ctx);

        double_map.set(0, 0, TestValue { value: 0 });
        double_map.set(0, 0, TestValue { value: 0 });
        double_map.set(0, 1, TestValue { value: 1 });
        double_map.set(0, 2, TestValue { value: 2 });

        assert!(double_map.contains(0, 0));
        assert!(double_map.contains(0, 1));
        assert!(double_map.contains(0, 2));
        assert!(double_map.length() == 3);
        assert!(double_map.is_empty() == false);

        assert!(double_map.get(0, 0) == TestValue { value: 0 });
        assert!(double_map[0, 0] == TestValue { value: 0 });
        assert!(double_map.try_get(0, 0) == option::some(TestValue { value: 0 }));
        assert!(double_map.get(0, 1) == TestValue { value: 1 });
        assert!(double_map[0, 1] == TestValue { value: 1 });
        assert!(double_map.try_get(0, 1) == option::some(TestValue { value: 1 }));
        assert!(double_map.get(0, 2) == TestValue { value: 2 });
        assert!(double_map[0, 2] == TestValue { value: 2 });
        assert!(double_map.try_get(0, 2) == option::some(TestValue { value: 2 }));

        double_map.remove(0, 1);
        assert!(double_map.try_get(0, 1) == option::none());
        assert!(double_map.contains(0, 1) == false);
        assert!(double_map.length() == 2);

        assert!(double_map.try_remove(0, 2) == option::some(TestValue { value: 2 }));
        assert!(double_map.try_get(0, 2) == option::none());
        assert!(double_map.contains(0, 2) == false);
        assert!(double_map.length() == 1);

        let x: u32 = 1000;
        x.range_do!(1000, |x| {
            double_map.set(x, x, TestValue { value: 2 });
        });

        double_map.drop();
        scenario.end();
    }

}