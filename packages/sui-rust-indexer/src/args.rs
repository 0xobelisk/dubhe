// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use clap::Args;
use clap::Parser;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use sui_sdk::SuiClient;
use sui_sdk::SuiClientBuilder;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct DubheIndexerArgs {
    /// Path to the configuration file
    #[arg(short, long, default_value = "dubhe.config.json")]
    pub config_json: String,
    /// Worker pool number
    #[arg(short, long, default_value = "1")]
    pub worker_pool_number: u32,
    /// Start checkpoint
    #[arg(long, default_value = "0")]
    pub start_checkpoint: u64,
    /// Force restart: clear indexer database (only for local nodes)
    #[arg(long, default_value = "false")]
    pub force: bool,
    /// Sui network
    #[arg(long, default_value = "localnet")]
    pub network: String,
    /// with graphql
    #[arg(long, default_value = "false")]
    pub with_graphql: bool,
}

impl DubheIndexerArgs {
    pub async fn get_sui_client(&self) -> Result<SuiClient> {
        match self.network.as_str() {
            "localnet" => Ok(SuiClientBuilder::default().build_localnet().await?),
            "testnet" => Ok(SuiClientBuilder::default().build_testnet().await?),
            "mainnet" => Ok(SuiClientBuilder::default().build_mainnet().await?),
            _ => Err(anyhow::anyhow!("Invalid network: {}", self.network)),
        }
    }

    pub fn get_local_path_and_store_url(&self) -> Result<(PathBuf, Option<String>)> {
        match self.network.as_str() {
            "localnet" => Ok((PathBuf::from("./chk"), None)),
            "testnet" => Ok((
                tempfile::tempdir()?.into_path(),
                Some("https://checkpoints.testnet.sui.io".to_string()),
            )),
            "mainnet" => Ok((
                tempfile::tempdir()?.into_path(),
                Some("https://checkpoints.mainnet.sui.io".to_string()),
            )),
            _ => Err(anyhow::anyhow!("Invalid network: {}", self.network)),
        }
    }

    pub fn get_start_checkpoint(&self, latest_checkpoint: u64) -> u64 {
        if self.start_checkpoint == 0 {
            latest_checkpoint
        } else {
            self.start_checkpoint
        }
    }

    pub fn get_config_json(&self) -> Result<Value> {
        let content = fs::read_to_string(self.config_json.clone())?;
        let json: Value = serde_json::from_str(&content)?;
        Ok(json)
    }
}
