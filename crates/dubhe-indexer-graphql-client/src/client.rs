use crate::types::*;
use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use url::Url;

/// GraphQL client
pub struct DubheIndexerGraphQLClient {
    graphql_url: String,
    websocket_url: String,
    http_client: Client,
}

impl DubheIndexerGraphQLClient {
    /// Create a new GraphQL client
    pub fn new(graphql_url: String) -> Self {
        let websocket_url = graphql_url
            .replace("http://", "ws://")
            .replace("https://", "wss://");
        
        Self {
            graphql_url,
            websocket_url,
            http_client: Client::new(),
        }
    }

    /// Execute GraphQL query
    pub async fn query<T>(&self, query: &str, variables: Option<HashMap<String, Value>>) -> Result<GraphQLResponse<T>>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        let request_body = json!({
            "query": query,
            "variables": variables.unwrap_or_default(),
        });

        let response = self
            .http_client
            .post(&self.graphql_url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let response_data: GraphQLResponse<T> = response.json().await?;
        Ok(response_data)
    }

    /// Subscribe to table changes
    pub async fn subscribe_table_changes(
        &self,
        table_name: String,
    ) -> Result<mpsc::UnboundedReceiver<TableChange>> {
        let (tx, rx) = mpsc::unbounded_channel();
        
        let subscription_query = format!(
            r#"
            subscription {{
                tableChanges(tableName: "{}") {{
                    id
                    tableName
                    operation
                    timestamp
                    data
                }}
            }}
            "#,
            table_name
        );

        let websocket_url = Url::parse(&self.websocket_url)?;
        let (ws_stream, _) = connect_async(websocket_url).await?;
        let (mut write, mut read) = ws_stream.split();

        // First, send connection initialization
        let init_message = json!({
            "type": "connection_init"
        });
        write.send(Message::Text(init_message.to_string())).await?;
        
        // Wait for connection_ack before sending subscription
        let mut connection_acked = false;
        while !connection_acked {
            if let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(msg_type) = data.get("type").and_then(|v| v.as_str()) {
                                if msg_type == "connection_ack" {
                                    connection_acked = true;
                                    break;
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        return Err(anyhow::anyhow!("WebSocket connection closed during initialization"));
                    }
                    Err(e) => {
                        return Err(anyhow::anyhow!("WebSocket error during initialization: {}", e));
                    }
                    _ => {}
                }
            }
        }

        // Now send subscription request
        let subscribe_message = json!({
            "type": "start",
            "id": "1",
            "payload": {
                "query": subscription_query,
                "variables": {}
            }
        });

        write.send(Message::Text(subscribe_message.to_string())).await?;

        // Handle WebSocket messages
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        println!("🔔 GraphQL client received WebSocket message: {}", text);
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            println!("📋 Parsed JSON: {}", serde_json::to_string_pretty(&data).unwrap_or_default());
                            if let Some(payload) = data.get("payload") {
                                println!("📦 Found payload");
                                if let Some(data) = payload.get("data") {
                                    println!("📊 Found data in payload");
                                    if let Some(table_changes) = data.get("tableChanges") {
                                        println!("🎯 Found tableChanges in data: {}", table_changes);
                                        if let Ok(table_change) = serde_json::from_value::<TableChange>(
                                            table_changes.clone()
                                        ) {
                                            println!("✅ Successfully parsed TableChange, sending to receiver");
                                            let _ = tx.send(table_change);
                                        } else {
                                            println!("❌ Failed to parse TableChange from: {}", table_changes);
                                        }
                                    } else {
                                        println!("⚠️ No tableChanges found in data. Available keys: {:?}", data.as_object().map(|obj| obj.keys().collect::<Vec<_>>()));
                                    }
                                } else {
                                    println!("⚠️ No data found in payload");
                                }
                            } else {
                                println!("⚠️ No payload found in message");
                            }
                        } else {
                            println!("❌ Failed to parse JSON from WebSocket message");
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(e) => {
                        log::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(rx)
    }

    /// Subscribe to events
    pub async fn subscribe_events(&self) -> Result<mpsc::UnboundedReceiver<Event>> {
        let (tx, rx) = mpsc::unbounded_channel();
        
        let subscription_query = r#"
            subscription {
                events {
                    id
                    eventType
                    timestamp
                    data
                }
            }
        "#;

        let websocket_url = Url::parse(&self.websocket_url)?;
        let (ws_stream, _) = connect_async(websocket_url).await?;
        let (mut write, mut read) = ws_stream.split();

        // First, send connection initialization
        let init_message = json!({
            "type": "connection_init"
        });
        write.send(Message::Text(init_message.to_string())).await?;
        
        // Wait for connection_ack before sending subscription
        let mut connection_acked = false;
        while !connection_acked {
            if let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(msg_type) = data.get("type").and_then(|v| v.as_str()) {
                                if msg_type == "connection_ack" {
                                    connection_acked = true;
                                    break;
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        return Err(anyhow::anyhow!("WebSocket connection closed during initialization"));
                    }
                    Err(e) => {
                        return Err(anyhow::anyhow!("WebSocket error during initialization: {}", e));
                    }
                    _ => {}
                }
            }
        }

        // Now send subscription request
        let subscribe_message = json!({
            "type": "start",
            "id": "2",
            "payload": {
                "query": subscription_query,
                "variables": {}
            }
        });

        write.send(Message::Text(subscribe_message.to_string())).await?;

        // Handle WebSocket messages
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(payload) = data.get("payload") {
                                if let Some(data) = payload.get("data") {
                                    if let Some(events) = data.get("events") {
                                        if let Ok(event) = serde_json::from_value::<Event>(
                                            events.clone()
                                        ) {
                                            let _ = tx.send(event);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(e) => {
                        log::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(rx)
    }

    /// Subscribe to checkpoint updates
    pub async fn subscribe_checkpoint_updates(&self) -> Result<mpsc::UnboundedReceiver<CheckpointUpdate>> {
        let (tx, rx) = mpsc::unbounded_channel();
        
        let subscription_query = r#"
            subscription {
                checkpointUpdates {
                    sequenceNumber
                    digest
                    timestamp
                    transactionsCount
                }
            }
        "#;

        let websocket_url = Url::parse(&self.websocket_url)?;
        let (ws_stream, _) = connect_async(websocket_url).await?;
        let (mut write, mut read) = ws_stream.split();

        // First, send connection initialization
        let init_message = json!({
            "type": "connection_init"
        });
        write.send(Message::Text(init_message.to_string())).await?;
        
        // Wait for connection_ack before sending subscription
        let mut connection_acked = false;
        while !connection_acked {
            if let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(msg_type) = data.get("type").and_then(|v| v.as_str()) {
                                if msg_type == "connection_ack" {
                                    connection_acked = true;
                                    break;
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        return Err(anyhow::anyhow!("WebSocket connection closed during initialization"));
                    }
                    Err(e) => {
                        return Err(anyhow::anyhow!("WebSocket error during initialization: {}", e));
                    }
                    _ => {}
                }
            }
        }

        // Now send subscription request
        let subscribe_message = json!({
            "type": "start",
            "id": "3",
            "payload": {
                "query": subscription_query,
                "variables": {}
            }
        });

        write.send(Message::Text(subscribe_message.to_string())).await?;

        // Handle WebSocket messages
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(payload) = data.get("payload") {
                                if let Some(data) = payload.get("data") {
                                    if let Some(checkpoint_updates) = data.get("checkpointUpdates") {
                                        if let Ok(checkpoint_update) = serde_json::from_value::<CheckpointUpdate>(
                                            checkpoint_updates.clone()
                                        ) {
                                            let _ = tx.send(checkpoint_update);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(e) => {
                        log::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(rx)
    }

    /// Query table data
    pub async fn query_table_data(
        &self,
        table_id: &str,
        query: &str,
        limit: i32,
        offset: i32,
    ) -> Result<QueryResponse> {
        let graphql_query = format!(
            r#"
            query {{
                queryData(
                    tableId: "{}"
                    query: "{}"
                    limit: {}
                    offset: {}
                ) {{
                    tableId
                    data
                    totalCount
                    limit
                    offset
                }}
            }}
            "#,
            table_id, query, limit, offset
        );

        let response: GraphQLResponse<HashMap<String, QueryResponse>> = self
            .query(&graphql_query, None)
            .await?;

        if let Some(data) = response.data {
            if let Some(query_response) = data.get("queryData") {
                return Ok(query_response.clone());
            }
        }

        Err(anyhow::anyhow!("Failed to get query response"))
    }

    /// Get table metadata
    pub async fn get_table_metadata(&self, table_id: &str) -> Result<TableMetadataResponse> {
        let graphql_query = format!(
            r#"
            query {{
                getTableMetadata(tableId: "{}") {{
                    tableId
                    tableType
                    fields {{
                        name
                        fieldType
                        isKey
                        isEnum
                    }}
                    createdAt
                    updatedAt
                }}
            }}
            "#,
            table_id
        );

        let response: GraphQLResponse<HashMap<String, TableMetadataResponse>> = self
            .query(&graphql_query, None)
            .await?;

        if let Some(data) = response.data {
            if let Some(metadata) = data.get("getTableMetadata") {
                return Ok(metadata.clone());
            }
        }

        Err(anyhow::anyhow!("Failed to get table metadata"))
    }

    /// List all tables
    pub async fn list_tables(&self, table_type: Option<String>) -> Result<ListTablesResponse> {
        let table_type_filter = table_type
            .map(|t| format!(r#", tableType: "{}""#, t))
            .unwrap_or_default();

        let graphql_query = format!(
            r#"
            query {{
                listTables(tableType: null{}) {{
                    tables {{
                        tableId
                        tableType
                        fieldCount
                        createdAt
                        updatedAt
                    }}
                    totalCount
                }}
            }}
            "#,
            table_type_filter
        );

        let response: GraphQLResponse<HashMap<String, ListTablesResponse>> = self
            .query(&graphql_query, None)
            .await?;

        if let Some(data) = response.data {
            if let Some(list_response) = data.get("listTables") {
                return Ok(list_response.clone());
            }
        }

        Err(anyhow::anyhow!("Failed to get tables list"))
    }

    /// Subscribe and print table changes
    pub async fn subscribe_and_print_table_changes(&self, table_names: Vec<String>) -> Result<()> {
        let mut receivers = Vec::new();

        // Create subscriptions for each table
        for table_name in table_names {
            let receiver = self.subscribe_table_changes(table_name.clone()).await?;
            receivers.push((table_name, receiver));
        }

        // Handle all subscriptions
        loop {
            for (table_name, receiver) in &mut receivers {
                if let Ok(change) = receiver.try_recv() {
                    println!("Received table change:");
                    println!("  Table: {}", change.table_name);
                    println!("  Operation: {}", change.operation);
                    println!("  Timestamp: {}", change.timestamp);
                    println!("  Data: {:?}", change.data);
                    println!();
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    }

    /// Subscribe and print events
    pub async fn subscribe_and_print_events(&self) -> Result<()> {
        let mut receiver = self.subscribe_events().await?;

        loop {
            if let Ok(event) = receiver.try_recv() {
                println!("Received event:");
                println!("  ID: {}", event.id);
                println!("  Type: {}", event.event_type);
                println!("  Timestamp: {}", event.timestamp);
                println!("  Data: {:?}", event.data);
                println!();
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    }

    /// Subscribe and print checkpoint updates
    pub async fn subscribe_and_print_checkpoint_updates(&self) -> Result<()> {
        let mut receiver = self.subscribe_checkpoint_updates().await?;

        loop {
            if let Ok(update) = receiver.try_recv() {
                println!("Received checkpoint update:");
                println!("  Sequence Number: {}", update.sequence_number);
                println!("  Digest: {}", update.digest);
                println!("  Timestamp: {}", update.timestamp);
                println!("  Transactions Count: {}", update.transactions_count);
                println!();
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    }
} 