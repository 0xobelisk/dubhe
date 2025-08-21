# Dubhe Indexer Client

A GRPC client for connecting to the Dubhe Indexer API and subscribing to real-time table updates.

## Features

- Connect to Dubhe Indexer GRPC server
- Subscribe to real-time table updates
- Print table data as it arrives
- Simple and lightweight client

## Usage

### Basic Usage

```rust
use dubhe_indexer_grpc_client::DubheIndexerClient;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to GRPC server
    let mut client = DubheIndexerClient::new("http://127.0.0.1:50051".to_string()).await?;

    // Subscribe to table updates
    let table_ids = vec!["counter".to_string()];
    client.subscribe_and_print(table_ids).await?;

    Ok(())
}
```

### Running the Client

```bash
# Build the client
cargo build --bin dubhe-indexer-grpc-client

# Run the client (subscribes to "counter" table by default)
cargo run --bin dubhe-indexer-grpc-client
```

### Customizing Table Subscriptions

Edit `src/main.rs` to change the table IDs you want to subscribe to:

```rust
let table_ids = vec!["counter".to_string(), "player".to_string()]; // Subscribe to multiple tables
```

## API Methods

### `DubheIndexerClient::new(addr: String) -> Result<Self>`

Connect to a GRPC server at the specified address.

### `subscribe_and_print(table_ids: Vec<String>) -> Result<()>`

Subscribe to table updates and print them to console.

### `subscribe_to_table(table_ids: Vec<String>) -> Result<Streaming<TableUpdate>>`

Subscribe to table updates and return a stream.

### `query_data(table_id: &str, query: &str, limit: i32, offset: i32) -> Result<QueryResponse>`

Query data from a specific table.

### `get_table_metadata(table_id: &str) -> Result<TableMetadataResponse>`

Get metadata for a specific table.

### `list_tables(table_type: Option<String>) -> Result<ListTablesResponse>`

List all available tables.

## Output Format

When data is received, the client prints:

```
Received update:
  Table ID: counter
  Operation: INSERT
  Checkpoint: 12345
  Timestamp: 1703123456
  Data fields:
    value: 42
    created_at: 1703123456
    updated_at: 1703123456
    last_updated_checkpoint: 12345
```

## Requirements

- Rust 1.70+
- Tokio runtime
- GRPC server running at `http://127.0.0.1:50051` (default)

## Dependencies

- `tonic` - GRPC client
- `tokio` - Async runtime
- `anyhow` - Error handling
- `futures` - Stream utilities
