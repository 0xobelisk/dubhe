use serde::Deserialize;
use std::fs;
use crate::{args::DubheIndexerArgs};
use anyhow::Result;
use sui_sdk::SuiClientBuilder;
use sui_sdk::SuiClient;

#[derive(Clone, Debug, Deserialize)]
pub struct DubheConfig {
    pub sui: SuiConfig,
    pub database: DatabaseConfig,
    pub grpc: GrpcConfig,
    pub subscription: SubscriptionConfig,
    pub logging: LoggingConfig,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SuiConfig {
    pub rpc_url: String,
    pub checkpoint_url: String,
    pub origin_package_id: String,
    pub start_checkpoint: u64,
}

#[derive(Clone, Debug, Deserialize)]
pub struct DatabaseConfig {
    pub db_type: String,
    pub url: String,
    pub max_connections: u32,
}

#[derive(Clone, Debug, Deserialize)]
pub struct GrpcConfig {
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