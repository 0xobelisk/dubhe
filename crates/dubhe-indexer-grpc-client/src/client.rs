use anyhow::Result;
use tonic::transport::Channel;

use crate::types::{ApiResponse, Pagination};
use crate::{
    FilterCondition, PaginationRequest, QueryRequest, QueryResponse, SortSpecification,
    SubscribeRequest, TableChange,
};
use dubhe_indexer_grpc::types::dubhe_grpc_client::DubheGrpcClient;
use prost_types::Struct;
use prost_types::Value;

const MAX_PAGE_SIZE: u32 = 100;

pub struct DubheIndexerGrpcClient {
    client: DubheGrpcClient<Channel>,
}

impl DubheIndexerGrpcClient {
    pub async fn new(indexer_url: String) -> Result<Self> {
        let client = DubheGrpcClient::connect(indexer_url).await?;

        Ok(Self { client })
    }

    // /// Query data from a specific table using new protocol
    // pub async fn get_table(&mut self, table_name: &str) -> Result<ApiResponse<Struct>> {
    //     let request = QueryRequest {
    //         table_name: table_name.to_string(),
    //         ..Default::default()
    //     };

    //     let response = self.client.query_table(request).await?;
    //     let api_response = response.into_inner();
    //     Ok(api_response)
    // }

    // /// Subscribe to table updates
    // pub async fn subscribe_table(
    //     &mut self,
    //     table_ids: Vec<String>,
    // ) -> Result<tonic::codec::Streaming<TableChange>> {
    //     let request = SubscribeRequest { table_ids };

    //     let response = self.client.subscribe_table(request).await?;
    //     Ok(response.into_inner())
    // }
}
