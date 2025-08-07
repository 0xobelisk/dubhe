use serde::{Deserialize, Serialize};

use crate::TableMetadata;
use serde_json::Value;
use anyhow::Result;
use log;
use crate::primitives::ParsedMoveValue;

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct DBData {
    pub column_name: String,
    pub column_type: String,
    pub column_value: ParsedMoveValue,
    pub is_primary_key: bool,
}

impl DBData {
    pub fn new(column_name: String, column_type: String, column_value: ParsedMoveValue, is_primary_key: bool) -> Self {
        Self { column_name, column_type, column_value, is_primary_key }
    }
}

pub fn into_google_protobuf_struct(values: Vec<DBData>) -> prost_types::Struct {
    let mut fields = std::collections::BTreeMap::new();
    for value in values {
        fields.insert(value.column_name, value.column_value.into_google_protobuf_value());
    }
    prost_types::Struct { fields }
}