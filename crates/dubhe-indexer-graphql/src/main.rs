use anyhow::Result;
use dubhe_indexer_graphql::{GraphQLConfig, GraphQLServerManager, TableChange};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();

    // Create config
    let config = GraphQLConfig::from_env();
    
    // Create GraphQL subscribers
    let graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>> = 
        Arc::new(RwLock::new(HashMap::new()));
    
    log::info!("🚀 Starting Dubhe GraphQL server...");
    log::info!("📊 Configuration: {:?}", config);

    // Create server manager
    let mut manager = GraphQLServerManager::new(config, graphql_subscribers);
    
    // Start the server
    manager.start().await?;

    Ok(())
} 