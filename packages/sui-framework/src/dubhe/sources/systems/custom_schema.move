module dubhe::custom_schema {
    use dubhe::storage;
    use dubhe::dubhe_schema::Schema;
    use sui::bag;
    use sui::bag::Bag;

    public struct WrapperCoin<phantom T> has drop, copy, store { }

    public fun new<T>(): WrapperCoin<T> {
        WrapperCoin {}
    }

    public(package) fun add_to_schema(schema: &mut Schema, ctx: &mut TxContext) {
        storage::add_field(schema.id(), b"wrapper_pools", bag::new(ctx));
        storage::add_field(schema.id(), b"wrapper_assets", bag::new(ctx));
        storage::add_field(schema.id(), b"bridge_assets", bag::new(ctx));
        storage::add_field(schema.id(), b"package_assets", bag::new(ctx));
    }

    public(package) fun wrapper_pools(schema: &mut Schema): &mut Bag {
        storage::borrow_mut_field(schema.id(), b"wrapper_pools")
    }

    public(package) fun wrapper_assets(schema: &mut Schema): &mut Bag {
        storage::borrow_mut_field(schema.id(), b"wrapper_assets")
    }

    public(package) fun bridge_assets(schema: &mut Schema): &mut Bag {
        storage::borrow_mut_field(schema.id(), b"bridge_assets")
    }

    public(package) fun package_assets(schema: &mut Schema): &mut Bag {
        storage::borrow_mut_field(schema.id(), b"package_assets")
    }

    public(package) fun borrow_wrapper_pools(schema: &Schema): &Bag {
        storage::borrow_field(schema.borrow_id(), b"wrapper_pools")
    }

    public(package) fun borrow_wrapper_assets(schema: &Schema): &Bag {
        storage::borrow_field(schema.borrow_id(), b"wrapper_assets")
    }

    public(package) fun borrow_bridge_assets(schema: &Schema): &Bag {
        storage::borrow_field(schema.borrow_id(), b"bridge_assets")
    }

    public(package) fun borrow_package_assets(schema: &Schema): &Bag {
        storage::borrow_field(schema.borrow_id(), b"package_assets")
    }
}