# Dubhe Indexer GraphQL

A Rust-based GraphQL server that provides GraphQL API support for Dubhe Indexer.

## Features

- 🚀 High-performance GraphQL server based on `async-graphql` and `warp`
- 📊 Database query and real-time subscription support
- 🎮 Built-in GraphQL Playground interface
- 🔌 Extensible plugin system
- 🏥 Health check endpoints
- 📝 Complete logging

## Quick Start

### Running as a standalone server

```bash
# Set environment variables
export GRAPHQL_PORT=4000
export DATABASE_URL="sqlite://data.db"
export GRAPHQL_ENDPOINT="/graphql"

# Run the server
cargo run --bin dubhe-indexer-graphql
```

### Running as part of dubhe-indexer

```bash
# Start in dubhe-indexer (GraphQL server will be started automatically)
cargo run --bin dubhe-indexer
```

## Configuration

GraphQL server configuration is in `config.example.toml`:

```toml
[graphql]
port = 4000
cors = true
subscriptions = true
debug = false
query_timeout = 30000
max_connections = 1000
heartbeat_interval = 30000
enable_metrics = true
enable_live_queries = true
enable_pg_subscriptions = true
enable_native_websocket = true
```

## API Endpoints

- **GraphQL API**: `http://localhost:4000/graphql`
- **GraphQL Playground**: `http://localhost:4000/playground`
- **GraphiQL**: `http://localhost:4000/graphiql`
- **Health Check**: `http://localhost:4000/health`
- **Home Page**: `http://localhost:4000/`

## Plugin System

GraphQL Playground supports a plugin system for easy addition of new features.

### Using built-in plugins

```rust
use dubhe_indexer_graphql::playground::{PlaygroundService, GraphiQLPlugin};

// Create service
let service = PlaygroundService::new(config);

// Get Playground without plugins
let html = service.get_playground_html();

// Get Playground with explorer plugin
let html_with_explorer = service.get_playground_html_with_explorer();

// Get Playground with multiple plugins
let html_with_plugins = service.get_playground_html_with_plugins(&[
    GraphiQLPlugin::explorer("4"),
    // Can add more plugins
]);
```

### Creating custom plugins

```rust
use dubhe_indexer_graphql::playground::GraphiQLPlugin;

let custom_plugin = GraphiQLPlugin {
    name: "MyCustomPlugin".to_string(),
    constructor: "MyCustomPlugin.create".to_string(),
    head_assets: Some("<link rel=\"stylesheet\" href=\"path/to/style.css\" />".to_string()),
    body_assets: Some("<script src=\"path/to/script.js\"></script>".to_string()),
    pre_configs: Some("// Plugin configuration code".to_string()),
    props: Some("{}".to_string()),
};
```

## GraphQL Query Examples

### Get server information

```graphql
query {
  serverInfo {
    name
    version
    status
  }
}
```

### Get database table list

```graphql
query {
  tables {
    name
    schema
    columns {
      name
      dataType
      isNullable
    }
  }
}
```

### Query table data

```graphql
query {
  tableData(tableName: "events", limit: 10) {
    tableName
    totalCount
    data
  }
}
```

### Subscribe to real-time updates

```graphql
subscription {
  tableChanges(tableName: "events") {
    id
    tableName
    operation
    timestamp
    data
  }
}
```

## Database Support

- **SQLite**: Full support, including queries and subscriptions
- **PostgreSQL**: Basic support, query functionality implemented

## Development

### Running tests

```bash
cargo test
```

### Code checking

```bash
cargo check
cargo clippy
```

### Building

```bash
cargo build --release
```

## Architecture

```
dubhe-indexer-graphql/
├── src/
│   ├── lib.rs              # Library entry point
│   ├── main.rs             # Binary entry point
│   ├── config.rs           # Configuration management
│   ├── server.rs           # HTTP server
│   ├── schema.rs           # GraphQL Schema
│   ├── database.rs         # Database abstraction
│   ├── subscriptions.rs    # Real-time subscriptions
│   ├── health.rs           # Health checks
│   └── playground.rs       # GraphQL Playground
├── templates/
│   └── playground.hbs      # Playground HTML template
└── Cargo.toml
```

## Dependencies

- `async-graphql`: GraphQL framework
- `async-graphql-warp`: Warp integration
- `warp`: HTTP server
- `dubhe-common`: Database abstraction
- `handlebars`: Template engine
- `serde`: Serialization
- `tokio`: Async runtime

## License

MIT License 