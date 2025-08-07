use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use crate::grpc::start_grpc_server;
use dubhe_common::Database;


#[tokio::test]
async fn test_grpc_server() {
    let subscribers = Arc::new(RwLock::new(HashMap::new()));
    let database = Arc::new(Database::new("/Volumes/project/dubhe/crates/dubhe-indexer/indexer.db").await.unwrap());
    let addr = "127.0.0.1:50051".to_string();
    start_grpc_server(addr, subscribers, database).await.unwrap();
}


