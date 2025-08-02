use serde::{Deserialize, Serialize};

use crate::{sql::DBData, TableMetadata};
use serde_json::Value;
use anyhow::Result;
use log;


pub trait EventParser {
    /// Parse a raw event into a structured event.
    fn parse(&self, table_metadatas: &[TableMetadata]) -> Result<(String, Vec<DBData>)>;
}

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreSetRecord {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
    pub value_tuple: Vec<Vec<u8>>,
}

impl EventParser for StoreSetRecord {
    fn parse(&self, table_metadatas: &[TableMetadata]) -> Result<(String, Vec<DBData>)> {
        let table_metadata = table_metadatas
            .iter()
            .find(|t| t.name == self.table_id)
            .ok_or_else(|| anyhow::anyhow!("Table metadata not found for table_id: {}", self.table_id))?;
        // Convert the record to a JSON value
        let values = table_metadata.parse(self.key_tuple.clone(), self.value_tuple.clone())?;
        Ok((self.table_id.clone(), values))
    }
}

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreSetField {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
    pub field_index: u8,
    pub value: Vec<u8>,
}

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreDeleteRecord {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
}
