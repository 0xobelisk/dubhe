use tonic::transport::Channel;
use anyhow::Result;
use futures::stream::StreamExt;
use crate::types::dubhe_grpc_client::DubheGrpcClient;
use crate::types::{
    QueryRequest, QueryResponse, SubscribeRequest, TableUpdate,
    TableMetadataRequest, TableMetadataResponse, ListTablesRequest, ListTablesResponse
};

pub struct DubheIndexerClient {
    client: DubheGrpcClient<Channel>,
}

impl DubheIndexerClient {
    pub async fn new(addr: String) -> Result<Self> {
        let client = DubheGrpcClient::connect(addr).await?;
        Ok(Self { client })
    }

    /// Query data from a specific table
    pub async fn query_data(
        &mut self,
        table_id: &str,
        query: &str,
        limit: i32,
        offset: i32,
    ) -> Result<QueryResponse> {
        let request = QueryRequest {
            table_id: table_id.to_string(),
            query: query.to_string(),
            limit,
            offset,
        };

        let response = self.client.query_data(request).await?;
        Ok(response.into_inner())
    }

    /// Subscribe to table updates
    pub async fn subscribe_to_table(
        &mut self,
        table_ids: Vec<String>,
    ) -> Result<tonic::codec::Streaming<TableUpdate>> {
        let request = SubscribeRequest { table_ids };

        let response = self.client.subscribe_to_table(request).await?;
        Ok(response.into_inner())
    }

    /// Get table metadata
    pub async fn get_table_metadata(
        &mut self,
        table_id: &str,
    ) -> Result<TableMetadataResponse> {
        let request = TableMetadataRequest {
            table_id: table_id.to_string(),
        };

        let response = self.client.get_table_metadata(request).await?;
        Ok(response.into_inner())
    }

    /// List all available tables
    pub async fn list_tables(
        &mut self,
        table_type: Option<String>,
    ) -> Result<ListTablesResponse> {
        let request = ListTablesRequest {
            table_type: table_type.unwrap_or_default(),
        };

        let response = self.client.list_tables(request).await?;
        Ok(response.into_inner())
    }

    /// Subscribe to table updates and print them to console
    pub async fn subscribe_and_print(
        &mut self,
        table_ids: Vec<String>,
    ) -> Result<()> {
        let mut stream = self.subscribe_to_table(table_ids).await?;

        println!("Subscribed to table updates. Waiting for data...");

        while let Some(update_result) = stream.next().await {
            match update_result {
                Ok(update) => {
                    println!("Received update:");
                    println!("  Table ID: {}", update.table_id);
                    println!("  Operation: {}", update.operation);
                    println!("  Checkpoint: {}", update.checkpoint);
                    println!("  Timestamp: {}", update.timestamp);
                    
                    if let Some(data) = update.data {
                        println!("  Data fields:");
                        for (key, value) in &data.fields {
                            println!("    {}: {}", key, value);
                        }
                    }
                    println!();
                }
                Err(e) => {
                    eprintln!("Error receiving update: {}", e);
                }
            }
        }

        Ok(())
    }
} 