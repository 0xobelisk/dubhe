module dubhe::schema {
    use std::ascii::{string};
    use sui::bag::{Self};
    use dubhe::world::{World, AdminCap};
    use dubhe::access_control;

    /// Schema does not exist
    const ESchemaDoesNotExist: u64 = 0;
    /// Schema already exists
    const ESchemaAlreadyExists: u64 = 1;
    /// Not the right admin for this world
    const ENotAdmin: u64 = 2;

    public fun get<T : store>(world: &World, _dubhe_schema_id: vector<u8>): &T {
        assert!(bag::contains(world.schemas(), _dubhe_schema_id), ESchemaDoesNotExist);
        bag::borrow<vector<u8>, T>(world.schemas(), _dubhe_schema_id)
    }

    public fun add<T : store>(_dubhe_world: &mut World, _dubhe_schema_id: vector<u8>, schema: T, admin_cap: &AdminCap){
        assert!(_dubhe_world.admin() == object::id(admin_cap), ENotAdmin);
        assert!(!bag::contains(_dubhe_world.schemas(), _dubhe_schema_id), ESchemaAlreadyExists);
        vector::push_back(_dubhe_world.mut_schema_names(), string(_dubhe_schema_id));
        bag::add<vector<u8>,T>(_dubhe_world.mut_schemas(), _dubhe_schema_id, schema);
    }

    public fun contains(_dubhe_world: &mut World, _dubhe_schema_id: vector<u8>): bool {
        bag::contains(_dubhe_world.schemas(), _dubhe_schema_id)
    }

    // === Protected features ===
    public fun get_mut<T : store, App: drop>(_: App, world: &mut World, _dubhe_schema_id: vector<u8>): &mut T {
        access_control::assert_app_is_authorized<App>(world);
        assert!(bag::contains(world.schemas(), _dubhe_schema_id), ESchemaDoesNotExist);
        bag::borrow_mut<vector<u8>, T>(world.mut_schemas(), _dubhe_schema_id)
    }
}
