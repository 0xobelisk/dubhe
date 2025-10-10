use crate::DubheIndexerGrpcClient;
use anyhow::Result;
use dubhe_indexer_grpc::types::dubhe_grpc_client::DubheGrpcClient;
use dubhe_indexer_grpc::types::QueryRequest;
use dubhe_indexer_grpc::PaginationRequest;
use futures_util::StreamExt;

// #[tokio::test]

// async fn test_grpc_client_subscribe() -> Result<()> {
//     let mut client = DubheIndexerGrpcClient::new("http://localhost:8080".to_string())
//         .await
//         .unwrap();

//     let mut receiver = match client
//         .subscribe_table(vec![
//             // // vector<u32>
//             // "component25".to_string(),
//             // // vector<address>
//             // "component29".to_string(),
//             // // vector<bool>
//             // "component30".to_string(),
//             // // vector<String>
//             // "component33".to_string(),
//             // // vector<vector<u8>>
//             // "component31".to_string(),
//             // enum
//             "component11".to_string()
//         ])
//         .await
//     {
//         Ok(receiver) => receiver,
//         Err(e) => {
//             return Err(e);
//         }
//     };

//     loop {
//         tokio::select! {
//             Some(change) = receiver.next() => {
//                 match change {
//                     Ok(change) => {
//                         println!("[gRPC] Table: {} | Data: {:?}", change.table_id, change.data);
//                     }
//                     Err(e) => {
//                         println!("❌ gRPC stream error: {}", e);
//                         break;
//                     }
//                 }
//             }
//             _ = tokio::signal::ctrl_c() => {
//                 println!("\n🛑 Received Ctrl+C, shutting down gRPC client...");
//                 break;
//             }
//             else => {
//                 println!("❌ gRPC subscription closed");
//                 break;
//             }
//         }
//     }

//     Ok(())
// }

#[tokio::test]
async fn test_grpc_client_query() -> Result<()> {
    let mut client = DubheGrpcClient::connect("http://localhost:8080".to_string()).await?;
    let request = QueryRequest {
        table_name: "component11".to_string(),
        pagination: Some(PaginationRequest {
            page: 2,
            page_size: 100,
            offset: None,
        }),
        ..Default::default()
    };
    let response = client.query_table(request).await?;
    println!("📋 Raw gRPC response: {:#?}", response);
    Ok(())
}
