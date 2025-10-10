use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use tonic::{transport::Server, Request, Response, Status};

use crate::types::dubhe_grpc_server::{DubheGrpc, DubheGrpcServer};
use crate::types::{
    filter_value, value_range, FilterCondition, FilterOperator, FilterValue, PaginationResponse,
    QueryRequest, QueryResponse, SortDirection, SubscribeRequest, TableChange,
};
use dubhe_common::Database;

pub type GrpcSubscribers = Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>;

pub struct DubheGrpcService {
    subscribers: GrpcSubscribers,
    database: Arc<Database>,
}

impl DubheGrpcService {
    pub fn new(subscribers: GrpcSubscribers, database: Arc<Database>) -> Self {
        Self {
            subscribers,
            database,
        }
    }

    /// Build SQL query from QueryRequest
    async fn build_sql_query(
        &self,
        req: &QueryRequest,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let mut sql = String::new();

        // SELECT clause
        if req.select_fields.is_empty() {
            sql.push_str("SELECT *");
        } else {
            sql.push_str("SELECT ");
            sql.push_str(&req.select_fields.join(", "));
        }

        // FROM clause
        sql.push_str(&format!(" FROM store_{}", req.table_name));

        // WHERE clause
        if !req.filters.is_empty() {
            sql.push_str(" WHERE ");
            let mut conditions = Vec::new();

            for filter in &req.filters {
                let condition = self.build_filter_condition(filter)?;
                conditions.push(condition);
            }

            sql.push_str(&conditions.join(" AND "));
        }

        // ORDER BY clause
        if !req.sorts.is_empty() {
            sql.push_str(" ORDER BY ");
            let mut sorts = req.sorts.clone();

            // Sort by priority if specified
            sorts.sort_by_key(|s| s.priority.unwrap_or(0));

            let sort_clauses: Vec<String> = sorts
                .iter()
                .map(|sort| {
                    let direction = match sort.direction() {
                        SortDirection::Ascending => "ASC",
                        SortDirection::Descending => "DESC",
                    };
                    format!("{} {}", sort.field_name, direction)
                })
                .collect();

            sql.push_str(&sort_clauses.join(", "));
        }

        // LIMIT and OFFSET for pagination
        if let Some(pagination) = &req.pagination {
            let page_size = pagination.page_size.max(1);
            sql.push_str(&format!(" LIMIT {}", page_size));

            if let Some(offset) = pagination.offset {
                sql.push_str(&format!(" OFFSET {}", offset));
            } else {
                let page = pagination.page.max(1);
                let offset = (page - 1) * page_size;
                if offset > 0 {
                    sql.push_str(&format!(" OFFSET {}", offset));
                }
            }
        }

        println!("🔍 SQL: {}", sql);

        Ok(sql)
    }

    /// Build individual filter condition
    fn build_filter_condition(
        &self,
        filter: &FilterCondition,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let field = &filter.field_name;
        let operator = filter.operator();

        let condition = match operator {
            FilterOperator::Equals => {
                format!("{} = {}", field, self.format_filter_value(&filter.value)?)
            }
            FilterOperator::NotEquals => {
                format!("{} != {}", field, self.format_filter_value(&filter.value)?)
            }
            FilterOperator::GreaterThan => {
                format!("{} > {}", field, self.format_filter_value(&filter.value)?)
            }
            FilterOperator::GreaterThanEqual => {
                format!("{} >= {}", field, self.format_filter_value(&filter.value)?)
            }
            FilterOperator::LessThan => {
                format!("{} < {}", field, self.format_filter_value(&filter.value)?)
            }
            FilterOperator::LessThanEqual => {
                format!("{} <= {}", field, self.format_filter_value(&filter.value)?)
            }
            FilterOperator::Like => {
                format!(
                    "{} LIKE {}",
                    field,
                    self.format_filter_value(&filter.value)?
                )
            }
            FilterOperator::NotLike => {
                format!(
                    "{} NOT LIKE {}",
                    field,
                    self.format_filter_value(&filter.value)?
                )
            }
            FilterOperator::In => {
                if let Some(FilterValue {
                    value: Some(filter_value::Value::StringList(list)),
                }) = &filter.value
                {
                    let values: Vec<String> = list
                        .values
                        .iter()
                        .map(|v| format!("'{}'", v.replace("'", "''")))
                        .collect();
                    format!("{} IN ({})", field, values.join(", "))
                } else if let Some(FilterValue {
                    value: Some(filter_value::Value::IntList(list)),
                }) = &filter.value
                {
                    let values: Vec<String> = list.values.iter().map(|v| v.to_string()).collect();
                    format!("{} IN ({})", field, values.join(", "))
                } else {
                    return Err("IN operator requires string_list or int_list value".into());
                }
            }
            FilterOperator::NotIn => {
                if let Some(FilterValue {
                    value: Some(filter_value::Value::StringList(list)),
                }) = &filter.value
                {
                    let values: Vec<String> = list
                        .values
                        .iter()
                        .map(|v| format!("'{}'", v.replace("'", "''")))
                        .collect();
                    format!("{} NOT IN ({})", field, values.join(", "))
                } else if let Some(FilterValue {
                    value: Some(filter_value::Value::IntList(list)),
                }) = &filter.value
                {
                    let values: Vec<String> = list.values.iter().map(|v| v.to_string()).collect();
                    format!("{} NOT IN ({})", field, values.join(", "))
                } else {
                    return Err("NOT IN operator requires string_list or int_list value".into());
                }
            }
            FilterOperator::IsNull => {
                format!("{} IS NULL", field)
            }
            FilterOperator::IsNotNull => {
                format!("{} IS NOT NULL", field)
            }
            FilterOperator::Between => {
                if let Some(FilterValue {
                    value: Some(filter_value::Value::Range(range)),
                }) = &filter.value
                {
                    let start = self.format_range_value_start(&range.start)?;
                    let end = self.format_range_value_end(&range.end)?;
                    format!("{} BETWEEN {} AND {}", field, start, end)
                } else {
                    return Err("BETWEEN operator requires range value".into());
                }
            }
            FilterOperator::NotBetween => {
                if let Some(FilterValue {
                    value: Some(filter_value::Value::Range(range)),
                }) = &filter.value
                {
                    let start = self.format_range_value_start(&range.start)?;
                    let end = self.format_range_value_end(&range.end)?;
                    format!("{} NOT BETWEEN {} AND {}", field, start, end)
                } else {
                    return Err("NOT BETWEEN operator requires range value".into());
                }
            }
        };

        Ok(condition)
    }

    /// Format filter value for SQL
    fn format_filter_value(
        &self,
        value: &Option<FilterValue>,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(filter_value) = value {
            if let Some(v) = &filter_value.value {
                match v {
                    filter_value::Value::StringValue(s) => {
                        Ok(format!("'{}'", s.replace("'", "''")))
                    }
                    filter_value::Value::IntValue(i) => Ok(i.to_string()),
                    filter_value::Value::FloatValue(f) => Ok(f.to_string()),
                    filter_value::Value::BoolValue(b) => Ok(b.to_string()),
                    filter_value::Value::NullValue(_) => Ok("NULL".to_string()),
                    _ => Err("Unsupported filter value type".into()),
                }
            } else {
                Ok("NULL".to_string())
            }
        } else {
            Ok("NULL".to_string())
        }
    }

    /// Format range start value for SQL
    fn format_range_value_start(
        &self,
        value: &Option<value_range::Start>,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(v) = value {
            match v {
                value_range::Start::StringStart(s) => Ok(format!("'{}'", s.replace("'", "''"))),
                value_range::Start::IntStart(i) => Ok(i.to_string()),
                value_range::Start::FloatStart(f) => Ok(f.to_string()),
            }
        } else {
            Err("Range start value is required".into())
        }
    }

    /// Format range end value for SQL
    fn format_range_value_end(
        &self,
        value: &Option<value_range::End>,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(v) = value {
            match v {
                value_range::End::StringEnd(s) => Ok(format!("'{}'", s.replace("'", "''"))),
                value_range::End::IntEnd(i) => Ok(i.to_string()),
                value_range::End::FloatEnd(f) => Ok(f.to_string()),
            }
        } else {
            Err("Range end value is required".into())
        }
    }

    /// Convert sqlx JsonValue to prost Value
    fn convert_json_to_prost_value(
        &self,
        json_value: &sqlx::types::JsonValue,
    ) -> prost_types::Value {
        match json_value {
            sqlx::types::JsonValue::String(s) => prost_types::Value {
                kind: Some(prost_types::value::Kind::StringValue(s.clone())),
            },
            sqlx::types::JsonValue::Number(n) => {
                if let Some(f) = n.as_f64() {
                    prost_types::Value {
                        kind: Some(prost_types::value::Kind::NumberValue(f)),
                    }
                } else {
                    prost_types::Value {
                        kind: Some(prost_types::value::Kind::StringValue(n.to_string())),
                    }
                }
            }
            sqlx::types::JsonValue::Bool(b) => prost_types::Value {
                kind: Some(prost_types::value::Kind::BoolValue(*b)),
            },
            sqlx::types::JsonValue::Null => prost_types::Value {
                kind: Some(prost_types::value::Kind::NullValue(0)),
            },
            sqlx::types::JsonValue::Array(arr) => {
                let list_values: Vec<prost_types::Value> = arr
                    .iter()
                    .map(|v| self.convert_json_to_prost_value(v))
                    .collect();
                prost_types::Value {
                    kind: Some(prost_types::value::Kind::ListValue(
                        prost_types::ListValue {
                            values: list_values,
                        },
                    )),
                }
            }
            sqlx::types::JsonValue::Object(obj) => {
                let struct_fields: std::collections::BTreeMap<String, prost_types::Value> = obj
                    .iter()
                    .map(|(k, v)| (k.clone(), self.convert_json_to_prost_value(v)))
                    .collect();
                prost_types::Value {
                    kind: Some(prost_types::value::Kind::StructValue(prost_types::Struct {
                        fields: struct_fields,
                    })),
                }
            }
        }
    }

    /// Get total count for pagination
    async fn get_total_count(
        &self,
        database: &Database,
        req: &QueryRequest,
    ) -> Result<i64, Box<dyn std::error::Error + Send + Sync>> {
        let mut count_sql = format!("SELECT COUNT(*) as count FROM store_{}", req.table_name);

        // Add WHERE clause if filters exist
        if !req.filters.is_empty() {
            count_sql.push_str(" WHERE ");
            let mut conditions = Vec::new();

            for filter in &req.filters {
                let condition = self.build_filter_condition(filter)?;
                conditions.push(condition);
            }

            count_sql.push_str(&conditions.join(" AND "));
        }

        match database.query(&count_sql).await {
            Ok(results) => {
                if let Some(first_row) = results.first() {
                    if let Some(count_value) = first_row.get("count") {
                        if let Some(count) = count_value.as_i64() {
                            return Ok(count);
                        }
                        if let Some(count) = count_value.as_u64() {
                            return Ok(count as i64);
                        }
                    }
                }
                Ok(0)
            }
            Err(e) => Err(e.into()),
        }
    }

    pub async fn broadcast_update(&self, table_id: &str, update: TableChange) {
        let subscribers = self.subscribers.read().await;
        if let Some(senders) = subscribers.get(table_id) {
            for sender in senders {
                let _ = sender.send(update.clone());
            }
        }
    }
}

#[tonic::async_trait]
impl DubheGrpc for DubheGrpcService {
    async fn query_table(
        &self,
        request: Request<QueryRequest>,
    ) -> Result<Response<QueryResponse>, Status> {
        let req = request.into_inner();
        let start_time = std::time::Instant::now();

        // Get database instance
        let database = &self.database;

        println!("🔍 gRPC query_table: table_name={}", req.table_name);
        // Build SQL query
        match self.build_sql_query(&req).await {
            Ok(sql) => {
                log::debug!("Generated SQL: {}", sql);

                match database.query(&sql).await {
                    Ok(results) => {
                        println!("🔍 gRPC query_table: results={:?}", results);
                        // Convert results to protobuf format using google.protobuf.Value
                        let mut rows = Vec::new();
                        for result in &results {
                            let struct_value = dubhe_common::json_to_proto_struct(result).unwrap();
                            rows.push(struct_value);
                        }

                        println!("🔍 gRPC query_table: rows={:?}", rows);

                        // Handle pagination
                        let pagination_info = if let Some(pagination) = &req.pagination {
                            // Always get the actual total count for accurate pagination
                            let total_items =
                                self.get_total_count(database, &req).await.unwrap_or(0);

                            let page_size = pagination.page_size.max(1);
                            let current_page = pagination.page.max(1);
                            let total_pages = if total_items == 0 {
                                1
                            } else {
                                ((total_items as f64) / (page_size as f64)).ceil() as i32
                            };

                            Some(PaginationResponse {
                                current_page,
                                page_size,
                                total_items,
                                total_pages,
                                has_next_page: current_page < total_pages,
                                has_previous_page: current_page > 1,
                            })
                        } else {
                            None
                        };

                        let response = QueryResponse {
                            rows,
                            pagination: pagination_info,
                        };

                        log::info!(
                            "✅ gRPC query_table successful: returned {} rows",
                            results.len()
                        );
                        Ok(Response::new(response))
                    }
                    Err(e) => {
                        let error_msg = format!("Failed to execute query: {}", e);
                        log::error!("❌ gRPC query_table failed: {}", error_msg);

                        let response = QueryResponse {
                            rows: vec![],
                            pagination: None,
                        };
                        Ok(Response::new(response))
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to build SQL query: {}", e);
                log::error!("❌ gRPC query_table failed: {}", error_msg);

                let response = QueryResponse {
                    rows: vec![],
                    pagination: None,
                };
                Ok(Response::new(response))
            }
        }
    }

    type SubscribeTableStream =
        tokio_stream::wrappers::UnboundedReceiverStream<Result<TableChange, Status>>;

    async fn subscribe_table(
        &self,
        request: Request<SubscribeRequest>,
    ) -> Result<Response<Self::SubscribeTableStream>, Status> {
        let req = request.into_inner();
        let (tx, rx) = mpsc::unbounded_channel();

        println!("🔔 gRPC subscribe_table: table_ids={:?}", req.table_ids);

        // Add subscriber for each table
        for table_id in req.table_ids.clone() {
            let mut subscribers = self.subscribers.write().await;
            let senders = subscribers.entry(table_id.clone()).or_insert_with(Vec::new);
            senders.push(tx.clone());
            println!("✅ Added subscriber for table: {}", table_id);
        }

        // Convert UnboundedReceiver<TableChange> to UnboundedReceiver<Result<TableChange, Status>>
        let (result_tx, result_rx) = mpsc::unbounded_channel::<Result<TableChange, Status>>();

        // Start a background task to convert the stream
        let mut rx_clone = rx;
        tokio::spawn(async move {
            while let Some(item) = rx_clone.recv().await {
                let _ = result_tx.send(Ok(item));
            }
        });

        let output_stream = tokio_stream::wrappers::UnboundedReceiverStream::new(result_rx);
        Ok(Response::new(output_stream))
    }
}

pub async fn start_grpc_server(
    addr: String,
    subscribers: GrpcSubscribers,
    database: Arc<Database>,
) -> Result<(), Box<dyn std::error::Error>> {
    let addr = addr.parse()?;
    let service = DubheGrpcService::new(subscribers, database);

    println!("GRPC server listening on {}", addr);

    Server::builder()
        .add_service(DubheGrpcServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}
