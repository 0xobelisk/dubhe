module dubhe::table_metadata;

/// Table metadata structure
public struct TableMetadata has store {
    key_schemas: vector<vector<u8>>,
    key_names: vector<vector<u8>>,
    value_schemas: vector<vector<u8>>,
    value_names: vector<vector<u8>>
}

/// Create a new table metadata
public fun new(
    key_schemas: vector<vector<u8>>,
    key_names: vector<vector<u8>>,
    value_schemas: vector<vector<u8>>,
    value_names: vector<vector<u8>>
): TableMetadata {
    TableMetadata {
        key_schemas,
        key_names,
        value_schemas,
        value_names
    }
}

public fun get_key_schemas(self: &TableMetadata): vector<vector<u8>> {
    self.key_schemas
}

public fun get_key_names(self: &TableMetadata): vector<vector<u8>> {
    self.key_names
}

public fun get_value_schemas(self: &TableMetadata): vector<vector<u8>> {
    self.value_schemas
}

public fun get_value_names(self: &TableMetadata): vector<vector<u8>> {
    self.value_names
}

public(package) fun set_key_schemas(self: &mut TableMetadata, key_schemas: vector<vector<u8>>) {
    self.key_schemas = key_schemas;
}

public(package) fun set_key_names(self: &mut TableMetadata, key_names: vector<vector<u8>>) {
    self.key_names = key_names;
}

public(package) fun set_value_schemas(self: &mut TableMetadata, value_schemas: vector<vector<u8>>) {    
    self.value_schemas = value_schemas;
}

public(package) fun set_value_names(self: &mut TableMetadata, value_names: vector<vector<u8>>) {
    self.value_names = value_names;
}