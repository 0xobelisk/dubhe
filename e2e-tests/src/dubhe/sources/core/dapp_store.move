module dubhe::dapp_store {
    use sui::table::{Self, Table};
    use std::ascii::String;
    use std::ascii::string;
    use std::type_name;
    use sui::bag;
    use sui::bag::Bag;
    use sui::clock::{Self, Clock};
    use dubhe::dapp_metadata;
    use dubhe::dapp_metadata::DappMetadata;
    use dubhe::table_metadata;
    use dubhe::table_metadata::TableMetadata;
    use dubhe::dapp_fee_state;
    use dubhe::dapp_fee_state::DappFeeState;

    /// Error codes
    const EInvalidTableId: u64 = 1;
    const EInvalidKey: u64 = 2;
    const EInvalidValue: u64 = 3;

    /// Storage structure for DApp data and state management
    public struct DappStore has key, store {
        /// The unique identifier of the DappStore instance
        id: UID,
        /// The unique key identifier for the DApp
        dapp_key: String,
        /// Metadata containing DApp information like name, description, and version
        dapp_metadata: DappMetadata,
        /// State for managing transaction fees and usage statistics
        dapp_fee_state: DappFeeState,
        /// Stores metadata for each table, indexed by table_id
        table_metadatas: Table<vector<u8>, TableMetadata>,
        /// Stores the actual data tables, where each table contains key-value pairs
        /// table_id => (key_tuple => value_tuple)
        tables: Table<vector<u8>, Table<vector<vector<u8>>, vector<vector<u8>>>>,
        /// Storage for miscellaneous objects that don't fit into the table structure
        objects: Bag,
    }

    /// Create a new storage instance
    public(package) fun new<DappKey: copy + drop>(
        _: DappKey, 
        name: vector<u8>,
        description: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ): DappStore {
        let dapp_key = type_name::get<DappKey>().into_string();
        DappStore {
            id: object::new(ctx),
            dapp_key,
            dapp_metadata: dapp_metadata::new(
                string(name), 
                string(description), 
                string(b""),
                vector::empty(), 
                vector::empty(), 
                vector::empty(), 
                clock::timestamp_ms(clock),
                ctx.sender(),
                1,
                false
            ),
            dapp_fee_state: dapp_fee_state::default(),
            tables: table::new(ctx),
            table_metadatas: table::new(ctx),
            objects: bag::new(ctx),
        }
    }

    /// Register a new table
    public(package) fun register_table(
        self: &mut DappStore,
        table_id: vector<u8>,
        name: vector<u8>,
        key_schemas: vector<vector<u8>>,
        key_names: vector<vector<u8>>,
        value_schemas: vector<vector<u8>>,
        value_names: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        // Create table metadata
        let metadata = table_metadata::new(
            name,
            key_schemas,
            key_names,
            value_schemas,
            value_names
        );
        // Add table metadata
        self.table_metadatas.add(table_id, metadata);

        // Create table data storage
        self.tables.add(table_id, table::new(ctx));
    }

    /// Set a record
    public(package) fun set_record(
        self: &mut DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        value_tuple: vector<vector<u8>>
    ) {
        assert!(self.tables.contains(table_id), EInvalidTableId);
        
        // Get table data
        let table = self.tables.borrow_mut(table_id);
        
        // Store data
        if (table.contains(key_tuple)) {
            let value = table.borrow_mut(key_tuple);
            *value = value_tuple;
        } else {
            table.add(key_tuple, value_tuple);
        };
    }

    /// Set a field
    public(package) fun set_field(
        self: &mut DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8,
        value: vector<u8>
    ) {
        assert!(self.tables.contains(table_id), EInvalidTableId);
        
        // Get table data
        let table = self.tables.borrow_mut(table_id);
        
        // Get existing data
        let value_tuple = if (table.contains(key_tuple)) {
            table.borrow_mut(key_tuple)
        } else {
            // Create a new record
            let mut new_value = vector::empty();
            let metadata = self.table_metadatas.borrow(table_id);
            let field_len = metadata.get_value_schemas().length();
            let mut i = 0;
            while (i < field_len) {
                new_value.push_back(vector::empty());
                i = i + 1;
            };
            table.add(key_tuple, new_value);
            table.borrow_mut(key_tuple)
        };

        // Update field
        *value_tuple.borrow_mut(field_index as u64) = value;
    }

    /// Get a record
    public fun get_record(
        self: &DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ): vector<u8> {
        assert!(self.tables.contains(table_id), EInvalidTableId);
        let table = self.tables.borrow(table_id);
        assert!(table.contains(key_tuple), EInvalidKey);
        let value_tuple = table.borrow(key_tuple);
        let mut result = vector::empty();
        let mut i = 0;
        while (i < vector::length(value_tuple)) {
            let value = vector::borrow(value_tuple, i);
            assert!(!value.is_empty(), EInvalidValue);
            vector::append(&mut result, *value);
            i = i + 1;
        };
       result
    }

    /// Get a field
    public fun get_field(
        self: &DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ): vector<u8> {
        assert!(self.tables.contains(table_id), EInvalidTableId);
        let table = self.tables.borrow(table_id);
        assert!(table.contains(key_tuple), EInvalidKey);
        let field = vector::borrow(table.borrow(key_tuple), field_index as u64);
        assert!(!field.is_empty(), EInvalidValue);
        *field
    }

    public fun has_record(
        self: &DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ): bool {
        if (!self.tables.contains(table_id)) {
            return false
        };
        let table = self.tables.borrow(table_id);
        if (!table.contains(key_tuple)) {
            return false
        };
        let value_tuple = table.borrow(key_tuple);
        let mut i = 0;
        while (i < value_tuple.length()) {
            if (value_tuple.borrow(i).is_empty()) {
                return false
            };
            i = i + 1;
        };
        true
    }

    public fun has_field(
        self: &DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>,
        field_index: u8
    ): bool {
        if (!self.tables.contains(table_id)) {
            return false
        };
        let table = self.tables.borrow(table_id);
        if (!table.contains(key_tuple)) {
            return false
        };
        let value_tuple = table.borrow(key_tuple);
        if (value_tuple.length() <= field_index as u64) {
            return false
        };
        if (value_tuple.borrow(field_index as u64).is_empty()) {
            return false
        };
        true
    }

    public fun delete_record(
        self: &mut DappStore,
        table_id: vector<u8>,
        key_tuple: vector<vector<u8>>
    ): vector<vector<u8>> {
        assert!(self.tables.contains(table_id), EInvalidTableId);
        self.tables.borrow_mut(table_id).remove(key_tuple)
    }

public(package) fun calculate_bytes_size_and_fee(fee_state: &DappFeeState, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>): (u256, u256) {
    let mut total_bytes_size = 0;

    let mut i = 0;
    while (i < key_tuple.length()) {
        let key_bytes_size = key_tuple[i].length();
        total_bytes_size = total_bytes_size + key_bytes_size;
        i = i + 1;
    };

    let mut j = 0;
    while (j < value_tuple.length()) {
        let value_bytes_size = value_tuple[j].length();
        total_bytes_size = total_bytes_size + value_bytes_size;
        j = j + 1;
    };

    (total_bytes_size as u256, total_bytes_size as u256 * fee_state.get_byte_fee() + fee_state.get_base_fee())
}

public(package) fun charge_fee(self: &mut DappStore, key_tuple: vector<vector<u8>>, value_tuple: vector<vector<u8>>) {
   let ( bytes_size, fee ) = calculate_bytes_size_and_fee(&self.dapp_fee_state, key_tuple, value_tuple);
   let fee_state = &mut self.dapp_fee_state;
   let total_bytes_size = fee_state.get_total_bytes_size();
   let total_paid = fee_state.get_total_paid();
   let total_recharged = fee_state.get_total_recharged();
   fee_state.set_total_bytes_size(total_bytes_size + bytes_size);
   fee_state.set_total_paid(total_paid + fee);
   fee_state.set_total_recharged(total_recharged - fee);
}

public(package) fun recharge(self: &mut DappStore, amount: u256) {
    let fee_state = &mut self.dapp_fee_state;
    let total_recharged = fee_state.get_total_recharged();
    fee_state.set_total_recharged(total_recharged + amount);
}

    public fun get_dapp_key(self: &DappStore): String {
        self.dapp_key
    }

    public fun get_dapp_metadata(self: &DappStore): DappMetadata {
        self.dapp_metadata
    }

    public fun get_objects(self: &DappStore): &Bag {
        &self.objects
    }

    public(package) fun get_mut_objects(self: &mut DappStore): &mut Bag {
        &mut self.objects
    }

    public(package) fun set_dapp_metadata(self: &mut DappStore, dapp_metadata: DappMetadata) {
        self.dapp_metadata = dapp_metadata
    }
}