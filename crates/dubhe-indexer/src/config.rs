use serde::Deserialize;
use std::fs;
use crate::{args::DubheIndexerArgs};
use anyhow::Result;
use sui_sdk::SuiClientBuilder;
use sui_sdk::SuiClient;
use std::path::PathBuf;
use tempfile::TempDir;

#[derive(Clone, Debug, Deserialize)]
pub struct DubheConfig {
    pub sui: SuiConfig,
    pub database: DatabaseConfig,
    pub server: ServerConfig,
    pub subscription: SubscriptionConfig,
    pub logging: LoggingConfig,
    pub graphql: GraphQLConfig,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SuiConfig {
    pub rpc_url: String,
    pub checkpoint_url: String,
    pub origin_package_id: String,
    pub start_checkpoint: u64,
    pub progress_file_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ServerConfig {
    pub addr: String,
    pub tls_cert: Option<String>,
    pub tls_key: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SubscriptionConfig {
    pub max_clients: usize,
    pub channel_capacity: usize,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct GraphQLConfig {
    pub port: u16,
    pub cors: bool,
    pub subscriptions: bool,
    pub debug: bool,
    pub query_timeout: u64,
    pub max_connections: u32,
    pub heartbeat_interval: u64,
    pub enable_metrics: bool,
    pub enable_live_queries: bool,
    pub enable_pg_subscriptions: bool,
    pub enable_native_websocket: bool,
    pub realtime_port: Option<u16>,
}

impl DubheConfig {
    pub fn new(args: &DubheIndexerArgs) -> Result<Self> {
        let config_content = fs::read_to_string(&args.config)
            .map_err(|e| anyhow::anyhow!(format!("Failed to read config file: {}", e)))?;
            
        let mut config: DubheConfig = if args.config.ends_with(".yaml") || args.config.ends_with(".yml") {
            serde_yaml::from_str(&config_content)
                .map_err(|e| anyhow::anyhow!(format!("YAML parsing error: {}", e)))?
        } else if args.config.ends_with(".toml") {
            toml::from_str(&config_content)
                .map_err(|e| anyhow::anyhow!(format!("TOML parsing error: {}", e)))?
        } else {
            return Err(anyhow::anyhow!("Unsupported config file format"));
        };
        
        Ok(config)
    }

    pub async fn get_sui_client(&self) -> Result<SuiClient> {
        let sui_client = SuiClientBuilder::default().build(&self.sui.rpc_url).await?;
        Ok(sui_client)
    }

    pub fn get_checkpoint_url(&self) -> Result<(PathBuf, Option<String>)> {
        if self.sui.checkpoint_url.starts_with("http") {
            Ok((TempDir::new()?.path().to_path_buf(), Some(self.sui.checkpoint_url.clone())))
        } else {
            Ok((PathBuf::from(self.sui.checkpoint_url.clone()), None))
        }
    }

    /// Initialize logging system based on configuration
    pub fn init_logging(&self) -> Result<()> {
        // Set log level from config
        std::env::set_var("RUST_LOG", &self.logging.level);
        
        // Initialize env_logger
        env_logger::init();
        
        log::info!("Logging system initialized with level: {}", self.logging.level);
        
        Ok(())
    }
} 