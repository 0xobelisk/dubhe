pub mod config;
pub mod server;
pub mod schema;
pub mod database;
pub mod subscriptions;
pub mod health;
pub mod playground;

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use tokio::sync::mpsc;

pub use config::GraphQLConfig;
pub use server::GraphQLServer;
pub use schema::QueryRoot;
pub use subscriptions::{SubscriptionRoot, TableChange};

/// Dynamic table information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DynamicTable {
    pub name: String,
    pub schema: String,
    pub columns: Vec<TableColumn>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TableColumn {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
}

/// Subscribers management
pub type GrpcSubscribers = Arc<RwLock<HashMap<String, Vec<String>>>>;

/// GraphQL server manager
pub struct GraphQLServerManager {
    config: GraphQLConfig,
    server: Option<GraphQLServer>,
    subscribers: GrpcSubscribers,
    graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
}

impl GraphQLServerManager {
    pub fn new(config: GraphQLConfig, graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>) -> Self {
        Self {
            config,
            server: None,
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            graphql_subscribers,
        }
    }

    /// Starts the GraphQL server
    pub async fn start(&mut self) -> Result<()> {
        log::info!("🚀 Starting GraphQL server...");
        
        let server = GraphQLServer::new(self.config.clone(), self.subscribers.clone(), self.graphql_subscribers.clone()).await?;
        
        // Start the server (this will block until the server shuts down)
        server.start().await?;
        
        log::info!("✅ GraphQL server started successfully");
        Ok(())
    }

    /// Stop GraphQL server
    pub async fn stop(&mut self) -> Result<()> {
        if let Some(server) = &mut self.server {
            server.shutdown().await?;
        }
        log::info!("🛑 GraphQL server stopped");
        Ok(())
    }

    /// Get subscribers
    pub fn get_subscribers(&self) -> GrpcSubscribers {
        self.subscribers.clone()
    }
} 