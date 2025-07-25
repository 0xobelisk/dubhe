module dubhe::dapp_service {
    use std::ascii::String;
    use dubhe::dubhe_events::{emit_store_set_field, emit_store_set_record, emit_store_delete_record};
    use std::type_name;
    use dubhe::dapp_store::DappStore;
    use dubhe::dapp_store;
    use sui::object_table;
    use sui::object_table::ObjectTable;
    use sui::bag::Bag;
    use dubhe::type_info;

    /// Error codes
    const EInvalidKey: u64 = 2;
    const ENoPermissionPackageId: u64 = 6;

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
    public(package) fun register_table<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        type_: String,
        table_id: String,
        key_schemas: vector<String>,
        key_names: vector<String>,
        value_schemas: vector<String>,
        value_names: vector<String>,
        offchain: bool,
        ctx: &mut TxContext
    ) {
        let dapp_key = type_info::get_type_name_string<DappKey>();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);
        dapp_store.register_table(
            type_,
            table_id, 
            key_schemas,
            key_names,
            value_schemas,
            value_names,
            offchain,
            ctx
        );
    }

     /// Set a record
    public(package) fun set_record_internal(
        self: &mut DappHub,
        dapp_key: String,
        table_id: String,
        key_tuple: vector<vector<u8>>,
        value_tuple: vector<vector<u8>>
    ) {
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        let table_metadata = dapp_store.get_table_metadatas().borrow(table_id);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);

        if(table_metadata.get_offchain()) {
            emit_store_set_record(
                dapp_key,
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
            dapp_key,
            table_id,
            key_tuple,
            value_tuple
        );
    }

    /// Set a record
    public(package) fun set_record<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: String,
        key_tuple: vector<vector<u8>>,
        value_tuple: vector<vector<u8>>,
        offchain: bool
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);

        if(offchain) {
            emit_store_set_record(
                dapp_key,
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
            dapp_key,
            table_id,
            key_tuple,
            value_tuple
        );
    }

    /// Set a field
    public(package) fun set_field<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: String,
        key_tuple: vector<vector<u8>>,
        field_index: u8,
        value: vector<u8>,
        offchain: bool
    ) {
        let dapp_key = type_info::get_type_name_string<DappKey>();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);

        if(offchain) {
            emit_store_set_field(
                dapp_key,
                table_id,
                key_tuple,
                field_index,
                value,
            );
            return
        };

        dapp_store::set_field(dapp_store, table_id, key_tuple, field_index, value);

         // Emit event
        emit_store_set_field(
            dapp_key,
            table_id,
            key_tuple,
            field_index,
            value
        );
    }

    public(package) fun delete_record<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        table_id: String,
        key_tuple: vector<vector<u8>>,
        offchain: bool
    ) {
        let dapp_key = type_info::get_type_name_string<DappKey>();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);

        if(offchain) {
            emit_store_delete_record(
                dapp_key,
                table_id,
                key_tuple
            );
            return
        };

        dapp_store::delete_record(dapp_store, table_id, key_tuple);

        // Emit event
        emit_store_delete_record(
            dapp_key,
            table_id,
            key_tuple
        );
    }

    /// Get a record
    public fun get_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: String,
        key_tuple: vector<vector<u8>>,
    ): vector<u8> {
        let dapp_key = type_info::get_type_name_string<DappKey>();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::get_record(dapp_store, table_id, key_tuple)
    }

    /// Get a field
    public fun get_field<DappKey: copy + drop>(
        self: &DappHub,
        table_id: String,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ): vector<u8> {
        let dapp_key = type_info::get_type_name_string<DappKey>();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::get_field(dapp_store, table_id, key_tuple, field_index)
    }


    public fun has_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: String,
        key_tuple: vector<vector<u8>>
    ): bool {
        let dapp_key = type_info::get_type_name_string<DappKey>();
        let dapp_store = self.dapp_stores.borrow(dapp_key);
        dapp_store::has_record(dapp_store, table_id, key_tuple)
    }

    public fun ensure_has_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: String,
        key_tuple: vector<vector<u8>>
    ) {
        assert!(has_record<DappKey>(self, table_id, key_tuple), EInvalidKey);
    }

    public fun ensure_not_has_record<DappKey: copy + drop>(
        self: &DappHub,
        table_id: String,
        key_tuple: vector<vector<u8>>
    ) {
        assert!(!has_record<DappKey>(self, table_id, key_tuple), EInvalidKey);
    }

    public(package) fun get_mut_dapp_objects<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
    ): &mut Bag {
        let dapp_key = type_name::get<DappKey>().into_string();
        let dapp_store = self.dapp_stores.borrow_mut(dapp_key);
        assert!(dapp_store.get_dapp_key() == dapp_key, ENoPermissionPackageId);
        dapp_store.get_mut_objects()
    }

    public(package) fun create_dapp<DappKey: copy + drop>(
        self: &mut DappHub,
        dapp_key: DappKey,
        ctx: &mut TxContext
    ) {
        let dapp_store = dapp_store::new(dapp_key, ctx);
        let dapp_key = type_info::get_type_name_string<DappKey>();
        self.dapp_stores.add(dapp_key, dapp_store);
    }

    #[test_only]
    public(package) fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
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