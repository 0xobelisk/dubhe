use serde::{Deserialize, Serialize};

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreRegisterTable {
    pub table_id: Vec<u8>,
    pub key_schemas: Vec<Vec<u8>>,
    pub key_names: Vec<Vec<u8>>,
    pub value_schemas: Vec<Vec<u8>>,
    pub value_names: Vec<Vec<u8>>,
}

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StorageSetRecord {
    pub table_id: Vec<u8>,
    pub key_tuple: Vec<Vec<u8>>,
    pub value_tuple: Vec<Vec<u8>>,
}

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreSetField {
    pub table_id: Vec<u8>,
    pub key_tuple: Vec<Vec<u8>>,
    pub field_index: u8,
    pub value: Vec<u8>,
}
