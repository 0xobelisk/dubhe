module dubhe::dapp_store;
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
use dubhe::type_info;
use std::u8;

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
    /// Metadata for the tables
    table_metadatas: Table<String, TableMetadata>,
    /// Stores the actual data tables, where each table contains key-value pairs
    /// table_id => (key_tuple => value_tuple)
    tables: Table<String, Table<vector<vector<u8>>, vector<vector<u8>>>>,
    /// Storage for miscellaneous objects that don't fit into the table structure
    objects: Bag,
}

/// Create a new storage instance
public(package) fun new<DappKey: copy + drop>(
    _: DappKey, 
    ctx: &mut TxContext
): DappStore {
    DappStore {
        id: object::new(ctx),
        dapp_key: type_info::get_type_name_string<DappKey>(),
        table_metadatas: table::new(ctx),
        tables: table::new(ctx),
        objects: bag::new(ctx)
    }
}

/// Register a new table
public(package) fun register_table(
    self: &mut DappStore,
    type_: String,
    table_id: String,
    key_schemas: vector<String>,
    key_names: vector<String>,
    value_schemas: vector<String>,
    value_names: vector<String>,
    offchain: bool,
    ctx: &mut TxContext
) {
    let table_metadata = table_metadata::new(
        type_,
        key_schemas, 
        key_names, 
        value_schemas, 
        value_names,
        offchain
    );
    self.table_metadatas.add(table_id, table_metadata);
    // Create table data storage
    self.tables.add(table_id, table::new(ctx));
}

/// Set a record
public(package) fun set_record(
    self: &mut DappStore,
    table_id: String,
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
    table_id: String,
    key_tuple: vector<vector<u8>>,
    field_index: u8,
    value: vector<u8>
) {
    assert!(self.tables.contains(table_id), EInvalidTableId);
    
    // Get table data
    let table = self.tables.borrow_mut(table_id);

    assert!(table.contains(key_tuple), EInvalidKey);
    
    // Get existing data
    let value_tuple = table.borrow_mut(key_tuple);

    // Update field
    *value_tuple.borrow_mut(field_index as u64) = value;
}

/// Get a record
public fun get_record(
    self: &DappStore,
    table_id: String,
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
        vector::append(&mut result, *value);
        i = i + 1;
    };
    result
}

/// Get a field
public fun get_field(
    self: &DappStore,
    table_id: String,
    key_tuple: vector<vector<u8>>,
    field_index: u8
): vector<u8> {
    assert!(self.tables.contains(table_id), EInvalidTableId);
    let table = self.tables.borrow(table_id);
    assert!(table.contains(key_tuple), EInvalidKey);
    let field = vector::borrow(table.borrow(key_tuple), field_index as u64);
    *field
}

public fun has_record(
    self: &DappStore,
    table_id: String,
    key_tuple: vector<vector<u8>>
): bool {
    assert!(self.tables.contains(table_id), EInvalidTableId);
    let table = self.tables.borrow(table_id);
    table.contains(key_tuple)
}

public(package) fun delete_record(
    self: &mut DappStore,
    table_id: String,
    key_tuple: vector<vector<u8>>
): vector<vector<u8>> {
    assert!(self.tables.contains(table_id), EInvalidTableId);
    let table = self.tables.borrow_mut(table_id);
    assert!(table.contains(key_tuple), EInvalidKey);
    table.remove(key_tuple)
}

public fun get_dapp_key(self: &DappStore): String {
    self.dapp_key
}

public fun get_table_metadatas(self: &DappStore): &Table<String, TableMetadata> {
    &self.table_metadatas
}

public fun get_tables(self: &DappStore): &Table<String, Table<vector<vector<u8>>, vector<vector<u8>>>> {
    &self.tables
}

public fun get_objects(self: &DappStore): &Bag {
    &self.objects
}

public(package) fun get_mut_objects(self: &mut DappStore): &mut Bag {
    &mut self.objects
}