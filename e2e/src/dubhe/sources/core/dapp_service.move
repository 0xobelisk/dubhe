module dubhe::dapp_service {
    use std::ascii::String;
    use dubhe::table_id;
    use dubhe::dubhe_events::{emit_store_set_field, emit_store_set_record, emit_store_delete_record};
    use std::type_name;
    use dubhe::dapp_store::DappStore;
    use dubhe::dapp_store;
    use sui::clock::Clock;
    use sui::object_table;
    use sui::object_table::ObjectTable;
    use sui::bag::Bag;

    /// Error codes
    const EInvalidKey: u64 = 2;
    const EInvalidFieldIndex: u64 = 4;
    const ENoPermissionPackageId: u64 = 6;
    const EInvalidPackageId: u64 = 7;
    const ENoPermissionAdmin: u64 = 8;
    const EInvalidVersion: u64 = 9;
    const EDappAlreadyPaused: u64 = 10;


    /// Storage structure
    public struct DappHub has key, store {
        id: UID,
        dapp_stores: ObjectTable<String, DappStore>,
    }

    /// Create a new storage instance
    public(package) fun new(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            dapp_stores: object_table::new(ctx),
        }
    }

    fun init(ctx: &mut TxContext) {
        sui::transfer::public_share_object(
            new(ctx)
        );
    }

    /// Register a new table
    public fun register_table<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: vector<u8>,
        name: vector<u8>,
        key_schemas: vector<vector<u8>>,
        key_names: vector<vector<u8>>,
        value_schemas: vector<vector<u8>>,
        value_names: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        dapp_store.register_table(
            table_id, 
            name, 
            key_schemas, 
            key_names, 
            value_schemas, 
            value_names, 
            ctx
        );
    }

    /// Set a record
    public fun set_record<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        value_tuple: vector<vector<u8>>
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);


        // Charge set fee
        dapp_store.charge_fee(key_tuple, value_tuple);


        if(table_id::table_type(&table_id) == table_id::offchain_table_type()) {
            emit_store_set_record(
                table_id,
                key_tuple,
                value_tuple
            );
            return
        };

        // Set record
        dapp_store.set_record(table_id, key_tuple, value_tuple);

        // Emit event
        emit_store_set_record(
            table_id,
            key_tuple,
            value_tuple
        );
    }

    /// Set a field
    public fun set_field<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8,
        value: vector<u8>
    ) {

        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);

        // Charge fee
        dapp_store.charge_fee(key_tuple, vector[value]);

        if(table_id::table_type(&table_id) == table_id::offchain_table_type()) {
            emit_store_set_field(
                table_id,
                key_tuple,
                field_index,
                value
            );
            return
        };

        dapp_store::set_field(dapp_store, table_id, key_tuple, field_index, value);

         // Emit event
        emit_store_set_field(
            table_id,
            key_tuple,
            field_index,
            value
        );
    }

    public fun delete_record<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);

        if(table_id::table_type(&table_id) == table_id::offchain_table_type()) {
            emit_store_delete_record(table_id, key_tuple);
            return
        };

        dapp_store::delete_record(dapp_store, table_id, key_tuple);

        // Emit event
        emit_store_delete_record(table_id, key_tuple);
    }

    /// Get a record
    public fun get_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ): vector<u8> {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::get_record(dapp_store, table_id, key_tuple)
    }

    /// Get a field
    public fun get_field<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ): vector<u8> {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::get_field(dapp_store, table_id, key_tuple, field_index)
    }


    public fun has_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ): bool {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::has_record(dapp_store, table_id, key_tuple)
    }

    public fun has_field<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ): bool {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::has_field(dapp_store, table_id, key_tuple, field_index)
    }

    public fun ensure_has_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ) {
        assert!(has_record<DappKey>(self, table_id, key_tuple), EInvalidKey);
    }

    public fun ensure_not_has_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ) {
        assert!(!has_record<DappKey>(self, table_id, key_tuple), EInvalidKey);
    }

    public fun ensure_has_field<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ) {
        assert!(has_field<DappKey>(self, table_id, key_tuple, field_index), EInvalidFieldIndex);
    }

    public fun ensure_not_has_field<DappKey: copy + drop>(
        self: &DappHub,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ) {
        assert!(!has_field<DappKey>(self, table_id, key_tuple, field_index), EInvalidFieldIndex);
    }

    public fun get_objects<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
    ): &mut Bag {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        dapp_store.get_mut_objects()
    }

    public(package) fun get_dapp_store(
        self: &mut DappHub,
        dapp_key: String
    ): &mut DappStore {
        self.dapp_stores.borrow_mut(dapp_key)
    }

    public fun create_dapp<DappKey: copy + drop>(
        self: &mut DappHub,
        dapp_key: DappKey,
        name: vector<u8>,
        description: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let dapp_store = dapp_store::new(dapp_key, name, description, clock, ctx);
        let dapp_key = type_name::get<DappKey>().into_string();
        self.dapp_stores.add(dapp_key, dapp_store);
    }

    public fun upgrade_dapp<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        new_package_id: address,
        new_version: u32
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);
        let mut dapp_metadata = dapp_store.get_dapp_metadata();
        let mut package_ids = dapp_metadata.get_package_ids();
        assert!(!package_ids.contains(&new_package_id), EInvalidPackageId);
        assert!(new_version > dapp_metadata.get_version(), EInvalidVersion);
        package_ids.push_back(new_package_id);
        dapp_metadata.set_package_ids(package_ids);
        dapp_metadata.set_version(new_version);
        dapp_store.set_dapp_metadata(dapp_metadata);
    } 

    public fun set_pausable<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        pausable: bool
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);
        let mut dapp_metadata = dapp_store.get_dapp_metadata();
        dapp_metadata.set_pausable(pausable);
        dapp_store.set_dapp_metadata(dapp_metadata);
    }

    public fun ensure_dapp_admin<DappKey: copy + drop>(
        self: &DappHub,
        admin: address
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
         let dapp_metadata = dapp_store.get_dapp_metadata();
        assert!(dapp_metadata.get_admin() == admin, ENoPermissionAdmin);
    }

    public fun ensure_latest_version<DappKey: copy + drop>(
        self: &DappHub,
        version: u32
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        let dapp_metadata = dapp_store.get_dapp_metadata();
        assert!(dapp_metadata.get_version() == version, EInvalidVersion);
    }

    public fun ensure_not_pausable<DappKey: copy + drop>(
        self: &DappHub
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        let dapp_metadata = dapp_store.get_dapp_metadata();
        assert!(!dapp_metadata.get_pausable(), EDappAlreadyPaused);
    }

    #[test_only]
    public fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            dapp_stores: object_table::new(ctx),
        }
    }

    #[test_only]
    public fun destroy(self: DappHub) {
        let DappHub { id, dapp_stores } = self;
        object::delete(id);
        sui::transfer::public_freeze_object(dapp_stores);
    }
}