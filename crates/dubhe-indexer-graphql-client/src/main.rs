use dubhe_indexer_graphql_client::DubheIndexerGraphQLClient;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to the GraphQL server
    let client = DubheIndexerGraphQLClient::new("http://127.0.0.1:4000/graphql".to_string());
    
    println!("Connecting to GraphQL server at: http://127.0.0.1:4000/graphql");
    
    // Subscribe to table changes
    let table_names = vec!["resource0".to_string()];
    println!("Subscribing to table changes for tables: {:?}", table_names);
    
    // Start subscribing and printing data
    client.subscribe_and_print_table_changes(table_names).await?;
    
    Ok(())
} 