use serde::{Deserialize, Serialize};
use std::env;

/// GraphQL server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLConfig {
    /// Server port
    pub port: u16,
    /// Database connection URL
    pub database_url: String,
    /// Database schema
    pub schema: String,
    /// GraphQL endpoint path
    pub endpoint: String,
    /// Enable CORS
    pub cors: bool,
    /// Enable subscriptions
    pub subscriptions: bool,
    /// Environment mode
    pub env: String,
    /// Enable debug mode
    pub debug: bool,
    /// Query timeout (milliseconds)
    pub query_timeout: u64,
    /// Maximum connections
    pub max_connections: u32,
    /// Heartbeat interval (milliseconds)
    pub heartbeat_interval: u64,
    /// Enable metrics
    pub enable_metrics: bool,
    /// Enable live queries
    pub enable_live_queries: bool,
    /// Enable PostgreSQL subscriptions
    pub enable_pg_subscriptions: bool,
    /// Enable native WebSocket
    pub enable_native_websocket: bool,
    /// Real-time port
    pub realtime_port: Option<u16>,
}

impl Default for GraphQLConfig {
    fn default() -> Self {
        Self {
            port: get_env_u16("GRAPHQL_PORT", 4000),
            database_url: get_env_string(
                "DATABASE_URL",
                "postgres://postgres:postgres@127.0.0.1:5432/postgres",
            ),
            schema: get_env_string("PG_SCHEMA", "public"),
            endpoint: get_env_string("GRAPHQL_ENDPOINT", "/graphql"),
            cors: get_env_bool("ENABLE_CORS", true),
            subscriptions: get_env_bool("ENABLE_SUBSCRIPTIONS", true),
            env: get_env_string("NODE_ENV", "development"),
            debug: get_env_bool("DEBUG", false),
            query_timeout: get_env_u64("QUERY_TIMEOUT", 30000),
            max_connections: get_env_u32("MAX_CONNECTIONS", 1000),
            heartbeat_interval: get_env_u64("HEARTBEAT_INTERVAL", 30000),
            enable_metrics: get_env_bool("ENABLE_METRICS", true),
            enable_live_queries: get_env_bool("ENABLE_LIVE_QUERIES", true),
            enable_pg_subscriptions: get_env_bool("ENABLE_PG_SUBSCRIPTIONS", true),
            enable_native_websocket: get_env_bool("ENABLE_NATIVE_WEBSOCKET", true),
            realtime_port: get_env_u16_opt("REALTIME_PORT"),
        }
    }
}

impl GraphQLConfig {
    /// Create configuration from environment variables
    pub fn from_env() -> Self {
        Self::default()
    }

    /// Get GraphQL endpoint URL
    pub fn graphql_endpoint(&self) -> String {
        format!("http://localhost:{}{}", self.port, self.endpoint)
    }

    /// Get WebSocket endpoint URL
    pub fn websocket_endpoint(&self) -> String {
        format!("ws://localhost:{}{}", self.port, self.endpoint)
    }

    /// Get health check endpoint
    pub fn health_endpoint(&self) -> String {
        format!("http://localhost:{}/health", self.port)
    }

    /// Get Playground endpoint
    pub fn playground_endpoint(&self) -> String {
        format!("http://localhost:{}/playground", self.port)
    }

    /// Get subscription configuration
    pub fn subscription_config(&self) -> SubscriptionConfig {
        SubscriptionConfig {
            enabled: self.subscriptions,
            method: "pg-subscriptions".to_string(),
            graphql_endpoint: self.graphql_endpoint(),
            subscription_endpoint: self.websocket_endpoint(),
        }
    }
}

/// Subscription configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionConfig {
    pub enabled: bool,
    pub method: String,
    pub graphql_endpoint: String,
    pub subscription_endpoint: String,
}

// Helper functions
fn get_env_string(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

fn get_env_u16(key: &str, default: u16) -> u16 {
    env::var(key)
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

fn get_env_u16_opt(key: &str) -> Option<u16> {
    env::var(key).ok().and_then(|s| s.parse().ok())
}

fn get_env_u32(key: &str, default: u32) -> u32 {
    env::var(key)
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

fn get_env_u64(key: &str, default: u64) -> u64 {
    env::var(key)
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

fn get_env_bool(key: &str, default: bool) -> bool {
    env::var(key)
        .ok()
        .map(|s| s.to_lowercase() == "true")
        .unwrap_or(default)
}
