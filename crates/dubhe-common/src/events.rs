use serde::{Deserialize, Serialize};

use crate::{sql::DBData, TableMetadata};
use anyhow::Result;
use log;
use serde_json::Value;

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
            .ok_or_else(|| {
                anyhow::anyhow!("Table metadata not found for table_id: {}", self.table_id)
            })?;
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

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub enum Event {
    StoreSetRecord(StoreSetRecord),
    StoreSetField(StoreSetField),
    StoreDeleteRecord(StoreDeleteRecord),
}

impl Event {
    pub fn original_package_id(&self) -> Option<String> {
        match self {
            Event::StoreSetRecord(event) => event
                .dapp_key
                .split("::")
                .next()
                .and_then(|s| Some(format!("0x{}", s))),
            Event::StoreSetField(event) => event
                .dapp_key
                .split("::")
                .next()
                .and_then(|s| Some(format!("0x{}", s))),
            Event::StoreDeleteRecord(event) => event
                .dapp_key
                .split("::")
                .next()
                .and_then(|s| Some(format!("0x{}", s))),
        }
    }

    pub fn table_id(&self) -> &str {
        match self {
            Event::StoreSetRecord(event) => &event.table_id,
            Event::StoreSetField(event) => &event.table_id,
            Event::StoreDeleteRecord(event) => &event.table_id,
        }
    }

    pub fn from_bytes(name: &str, bytes: &[u8]) -> Result<Self> {
        // Parse the event from bytes, maybe it's a StoreSetRecord, StoreSetField, or StoreDeleteRecord
        // if it's a StoreSetRecord, return Event::StoreSetRecord
        // if it's a StoreSetField, return Event::StoreSetField
        // if it's a StoreDeleteRecord, return Event::StoreDeleteRecord
        match name {
            "Dubhe_Store_SetRecord" => bcs::from_bytes::<StoreSetRecord>(bytes)
                .map(Event::StoreSetRecord)
                .map_err(|_| anyhow::anyhow!("Failed to parse bytes into StoreSetRecord")),
            "Dubhe_Store_SetField" => bcs::from_bytes::<StoreSetField>(bytes)
                .map(Event::StoreSetField)
                .map_err(|_| anyhow::anyhow!("Failed to parse bytes into StoreSetField")),
            "Dubhe_Store_DeleteRecord" => bcs::from_bytes::<StoreDeleteRecord>(bytes)
                .map(Event::StoreDeleteRecord)
                .map_err(|_| anyhow::anyhow!("Failed to parse bytes into StoreDeleteRecord")),
            _ => Err(anyhow::anyhow!("Invalid event name: {}", name)),
        }
    }
}
