pub mod client;
pub mod types;

#[cfg(test)]
pub mod tests;  

use tokio::sync::mpsc;
use anyhow::Result;
use async_trait::async_trait;

// Re-export from dubhe-indexer-grpc
pub use dubhe_indexer_grpc::types::{
    QueryRequest, QueryResponse, SubscribeRequest, TableChange,
    FilterCondition, FilterOperator, FilterValue, SortDirection,
    PaginationResponse, SortSpecification, PaginationRequest,
    filter_value, value_range
};

pub use client::DubheIndexerGrpcClient;

/// Client trait for table subscription
#[async_trait]
pub trait DubheClient: Send + Sync {
    /// Subscribe to table changes
    async fn subscribe_table(&self, table_names: Vec<String>) -> Result<mpsc::UnboundedReceiver<TableChange>>;
} 