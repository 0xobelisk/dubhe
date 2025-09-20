use crate::GrpcSubscribers;
use async_graphql::{Context, SimpleObject, Subscription};
use futures_util::Stream;
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Subscription root type
pub struct SubscriptionRoot {
    subscribers: GrpcSubscribers,
    graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
}

impl SubscriptionRoot {
    pub fn new(
        subscribers: GrpcSubscribers,
        graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
    ) -> Self {
        Self {
            subscribers,
            graphql_subscribers,
        }
    }

    /// Get GraphQL subscribers manager
    pub fn get_graphql_subscribers(
        &self,
    ) -> Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>> {
        self.graphql_subscribers.clone()
    }
}

#[Subscription]
impl SubscriptionRoot {
    /// Subscribe to table data changes
    async fn tableChanges(
        &self,
        _ctx: &Context<'_>,
        table_name: String,
    ) -> Pin<Box<dyn Stream<Item = TableChange> + Send>> {
        let graphql_subscribers = self.graphql_subscribers.clone();

        let stream = async_stream::stream! {
            // Create a sender for this subscription
            let (tx, mut rx) = mpsc::unbounded_channel::<TableChange>();

            // Add sender to subscribers list
            {
                let mut subscribers = graphql_subscribers.write().await;
                subscribers.entry(table_name.clone()).or_insert_with(Vec::new).push(tx);
                println!("📝 GraphQL subscription registered for table: {}", table_name);
                println!("📊 Total GraphQL subscribers count: {}", subscribers.len());
                for (table, senders) in subscribers.iter() {
                    println!("   Table '{}': {} subscribers", table, senders.len());
                }
            }

            // Listen for data from worker
            while let Some(change) = rx.recv().await {
                yield change;
            }
        };

        Box::pin(stream)
    }

    /// Subscribe to event stream
    async fn events(&self, _ctx: &Context<'_>) -> Pin<Box<dyn Stream<Item = Event> + Send>> {
        let stream = async_stream::stream! {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(2));

            loop {
                interval.tick().await;

                yield Event {
                    id: Uuid::new_v4().to_string(),
                    event_type: "move_event".to_string(),
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    data: serde_json::json!({
                        "package_id": "0x123...",
                        "module": "counter",
                        "function": "increment",
                        "sequence_number": 12345
                    }),
                };
            }
        };

        Box::pin(stream)
    }

    /// Subscribe to checkpoint updates
    async fn checkpointUpdates(
        &self,
        _ctx: &Context<'_>,
    ) -> Pin<Box<dyn Stream<Item = CheckpointUpdate> + Send>> {
        let stream = async_stream::stream! {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(10));
            let mut sequence_number = 1000;

            loop {
                interval.tick().await;
                sequence_number += 1;

                yield CheckpointUpdate {
                    sequence_number,
                    digest: format!("0x{:x}", Uuid::new_v4().as_u128()),
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    transactions_count: ((sequence_number % 100) + 50) as i32,
                };
            }
        };

        Box::pin(stream)
    }
}

/// Table change event
#[derive(SimpleObject, Clone)]
pub struct TableChange {
    pub id: String,
    pub table_name: String,
    pub operation: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

/// Event
#[derive(SimpleObject)]
pub struct Event {
    pub id: String,
    pub event_type: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

/// Checkpoint update
#[derive(SimpleObject)]
pub struct CheckpointUpdate {
    pub sequence_number: i64,
    pub digest: String,
    pub timestamp: String,
    pub transactions_count: i32,
}
