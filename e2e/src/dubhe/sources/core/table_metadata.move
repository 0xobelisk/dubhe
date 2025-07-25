module dubhe::table_metadata;

use std::ascii::String;

/// Table metadata structure
public struct TableMetadata has store {
    type_: String,
    key_schemas: vector<String>,
    key_names: vector<String>,
    value_schemas: vector<String>,
    value_names: vector<String>,
    offchain: bool,
}

/// Create a new table metadata
public fun new(
    type_: String,
    key_schemas: vector<String>,
    key_names: vector<String>,
    value_schemas: vector<String>,
    value_names: vector<String>,
    offchain: bool
): TableMetadata {
    TableMetadata { 
        type_,
        key_schemas,
        key_names,
        value_schemas,
        value_names,
        offchain
    }
}

public fun get_key_schemas(self: &TableMetadata): vector<String> {
    self.key_schemas
}

public fun get_key_names(self: &TableMetadata): vector<String> {
    self.key_names
}

public fun get_value_schemas(self: &TableMetadata): vector<String> {
    self.value_schemas
}

public fun get_value_names(self: &TableMetadata): vector<String> {
    self.value_names
}

public fun get_offchain(self: &TableMetadata): bool {
    self.offchain
}

public fun get_type_(self: &TableMetadata): String {
    self.type_
}

public(package) fun set_type_(self: &mut TableMetadata, type_: String) {
    self.type_ = type_;
}

public(package) fun set_key_schemas(self: &mut TableMetadata, key_schemas: vector<String>) {
    self.key_schemas = key_schemas;
}

public(package) fun set_key_names(self: &mut TableMetadata, key_names: vector<String>) {
    self.key_names = key_names;
}

public(package) fun set_value_schemas(self: &mut TableMetadata, value_schemas: vector<String>) {    
    self.value_schemas = value_schemas;
}

public(package) fun set_value_names(self: &mut TableMetadata, value_names: vector<String>) {
    self.value_names = value_names;
}

public(package) fun set_offchain(self: &mut TableMetadata, offchain: bool) {
    self.offchain = offchain;
}