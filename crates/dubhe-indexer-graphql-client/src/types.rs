use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// GraphQL query response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLResponse<T> {
    pub data: Option<T>,
    pub errors: Option<Vec<GraphQLError>>,
}

/// GraphQL error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLError {
    pub message: String,
    pub locations: Option<Vec<GraphQLLocation>>,
    pub path: Option<Vec<String>>,
}

/// GraphQL location information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLLocation {
    pub line: i32,
    pub column: i32,
}

/// Table change event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableChange {
    pub id: String,
    #[serde(rename = "tableName")]
    pub table_name: String,
    pub operation: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

/// Event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

/// Checkpoint update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckpointUpdate {
    #[serde(rename = "sequenceNumber")]
    pub sequence_number: i64,
    pub digest: String,
    pub timestamp: String,
    #[serde(rename = "transactionsCount")]
    pub transactions_count: i32,
}

/// Query response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResponse {
    #[serde(rename = "tableId")]
    pub table_id: String,
    pub data: Vec<serde_json::Value>,
    #[serde(rename = "totalCount")]
    pub total_count: i64,
    pub limit: i32,
    pub offset: i32,
}

/// Table metadata response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableMetadataResponse {
    pub table_id: String,
    pub table_type: String,
    pub fields: Vec<TableField>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Table field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableField {
    pub name: String,
    pub field_type: String,
    pub is_key: bool,
    pub is_enum: bool,
}

/// Table list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTablesResponse {
    pub tables: Vec<TableInfo>,
    pub total_count: i64,
}

/// Table information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub table_id: String,
    pub table_type: String,
    pub field_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
