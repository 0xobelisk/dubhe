use crate::DubheIndexerGrpcClient;
use anyhow::Result;
use dubhe_indexer_grpc::PaginationRequest;
use futures_util::StreamExt;

#[tokio::test]
async fn test_grpc_client_subscribe() -> Result<()> {
        
    let mut client = DubheIndexerGrpcClient::new("http://localhost:8080".to_string()).await.unwrap();

    let mut receiver = match client.subscribe_table(vec!["resource0".to_string(), "component0".to_string()]).await {
        Ok(receiver) => {
            receiver
        }
        Err(e) => {
            return Err(e);
        }
    };
    
    loop {
        tokio::select! {
            Some(change) = receiver.next() => {
                match change {
                    Ok(change) => {
                        println!("[gRPC] Table: {} | Data: {:?}", change.table_id, change.data);
                    }
                    Err(e) => {
                        println!("❌ gRPC stream error: {}", e);
                        break;
                    }
                }
            }
            _ = tokio::signal::ctrl_c() => {
                println!("\n🛑 Received Ctrl+C, shutting down gRPC client...");
                break;
            }
            else => {
                println!("❌ gRPC subscription closed");
                break;
            }
        }
    }
    
    Ok(())
} 

#[tokio::test]
async fn test_grpc_client_query() -> Result<()> {
    let mut client = DubheIndexerGrpcClient::new("http://localhost:8080".to_string()).await?;
    let res = client.get_table("component0").await?;
    println!("📋 Raw gRPC response: {:?}", res);
    Ok(())
}
