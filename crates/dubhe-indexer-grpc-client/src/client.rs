use tonic::transport::Channel;
use anyhow::Result;

use dubhe_indexer_grpc::types::dubhe_grpc_client::DubheGrpcClient;
use crate::{
    QueryRequest, QueryResponse, SubscribeRequest, TableChange,
    FilterCondition, SortSpecification, PaginationRequest,
};
use prost_types::Value;
use crate::types::{ApiResponse, Pagination};
use prost_types::Struct;

const MAX_PAGE_SIZE: u32 = 100;

pub struct DubheIndexerGrpcClient {
    client: DubheGrpcClient<Channel>,
}

impl DubheIndexerGrpcClient {
    pub async fn new(indexer_url: String) -> Result<Self> {
        let client = DubheGrpcClient::connect(indexer_url).await?;
        
        Ok(Self { client })
    }

    /// Query data from a specific table using new protocol
    pub async fn get_table(
        &mut self,
        table_name: &str,
    ) -> Result<ApiResponse<serde_json::Value>> {
        let request = QueryRequest {
            table_name: table_name.to_string(),
            ..Default::default()
        };

        let response = self.client.query_table(request).await?;
        let api_response = Self::convert_query_response(response.into_inner());
        Ok(api_response)
    }

    /// Subscribe to table updates
    pub async fn subscribe_table(
        &mut self,
        table_ids: Vec<String>,
    ) -> Result<tonic::codec::Streaming<TableChange>> {
        let request = SubscribeRequest { table_ids };

        let response = self.client.subscribe_table(request).await?;
        Ok(response.into_inner())
    }

    /// Convert protobuf Value to serde_json::Value
    fn convert_protobuf_value(value: &Value) -> serde_json::Value {
        match &value.kind {
            Some(prost_types::value::Kind::StringValue(s)) => serde_json::Value::String(s.clone()),
            Some(prost_types::value::Kind::NumberValue(n)) => {
                serde_json::json!(n)
            },
            Some(prost_types::value::Kind::BoolValue(b)) => serde_json::Value::Bool(*b),
            Some(prost_types::value::Kind::NullValue(_)) => serde_json::Value::Null,
            Some(prost_types::value::Kind::StructValue(s)) => {
                let mut map = serde_json::Map::new();
                for (key, val) in &s.fields {
                    map.insert(key.clone(), Self::convert_protobuf_value(val));
                }
                serde_json::Value::Object(map)
            },
            Some(prost_types::value::Kind::ListValue(l)) => {
                let vec: Vec<serde_json::Value> = l.values.iter()
                    .map(|v| Self::convert_protobuf_value(v))
                    .collect();
                serde_json::Value::Array(vec)
            },
            None => serde_json::Value::Null,
        }
    }

    /// Convert protobuf Value to serde_json::Map
    fn convert_protobuf_value_to_map(value: &Value) -> serde_json::Value {
        match &value.kind {
            Some(prost_types::value::Kind::StructValue(s)) => {
                let mut map = serde_json::Map::new();
                for (key, val) in &s.fields {
                    map.insert(key.clone(), Self::convert_protobuf_value(val));
                }
                serde_json::Value::Object(map)
            },
            _ => {
                // If it's not a struct, create a map with a single "value" key
                let mut map = serde_json::Map::new();
                map.insert("value".to_string(), Self::convert_protobuf_value(value));
                serde_json::Value::Object(map)
            }
        }
    }

    /// Convert protobuf Struct to serde_json::Value
    fn convert_protobuf_struct_to_value(value: &Struct) -> serde_json::Value {
        let mut map = serde_json::Map::new();
        for (key, val) in &value.fields {
            map.insert(key.clone(), Self::convert_protobuf_value(val));
        }
        serde_json::Value::Object(map)
    }


    fn convert_query_response(response: QueryResponse) -> ApiResponse<serde_json::Value> {
        ApiResponse {
            data: response.rows.iter().map(|v| Self::convert_protobuf_struct_to_value(v)).collect(),
            pagination: response.pagination.map(|p| Pagination {
                total: p.total_items as u64,
                page: p.current_page as u32,
                page_size: p.page_size as u32,
                total_pages: p.total_pages as u32,
            }),
        }
    }
}