use dubhe_indexer_grpc::grpc::{start_grpc_server, GrpcSubscribers};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // // Initialize subscribers
    // let subscribers: GrpcSubscribers = Arc::new(RwLock::new(HashMap::new()));
    
    // // Start GRPC server
    // let addr = "127.0.0.1:50051".to_string();
    // start_grpc_server(addr, subscribers).await?;
    
    Ok(())
} 