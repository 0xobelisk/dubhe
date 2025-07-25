use dubhe_indexer_client::DubheIndexerClient;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to the Dubhe Indexer GRPC server
    let mut client = DubheIndexerClient::new("http://127.0.0.1:50051".to_string()).await?;
    
    // Subscribe to table data updates
    let table_ids = vec!["resource0".to_string()]; // 可以根据需要修改表名
    println!("Subscribing to tables: {:?}", table_ids);
    
    // Start subscribing and printing data
    client.subscribe_and_print(table_ids).await?;
    
    Ok(())
} 