pub mod client;
pub mod types;

#[cfg(test)]
pub mod tests;

use anyhow::Result;
use async_trait::async_trait;
use tokio::sync::mpsc;

// Re-export from dubhe-indexer-grpc
pub use dubhe_indexer_grpc::types::{
    filter_value, value_range, FilterCondition, FilterOperator, FilterValue, PaginationRequest,
    PaginationResponse, QueryRequest, QueryResponse, SortDirection, SortSpecification,
    SubscribeRequest, TableChange,
};

pub use client::DubheIndexerGrpcClient;

/// Client trait for table subscription
#[async_trait]
pub trait DubheClient: Send + Sync {
    /// Subscribe to table changes
    async fn subscribe_table(
        &self,
        table_names: Vec<String>,
    ) -> Result<mpsc::UnboundedReceiver<TableChange>>;
}
