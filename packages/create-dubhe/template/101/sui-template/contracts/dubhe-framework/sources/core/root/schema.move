module dubhe::root_schema {
    use dubhe::storage_value;
    use dubhe::storage_value::StorageValue;
    use sui::transfer::public_share_object;

    public struct Root has key, store {
        id: UID,
        key: StorageValue<address>,
    }


    public(package) fun borrow_mut_key(self: &mut Root): &mut StorageValue<address> {
        &mut self.key
    }

    public fun borrow_key(self: &Root): &StorageValue<address> {
        &self.key
    }

    fun init(ctx: &mut TxContext) {
        let mut key = storage_value::new();
        key.set(ctx.sender());
        public_share_object(Root {
            id: object::new(ctx),
            key,
        });
    }

    #[test_only]
    public fun init_root_for_testing(ctx: &mut TxContext){
        init(ctx)
    }
}