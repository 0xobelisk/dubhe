// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use clap::Args;
use clap::Parser;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use sui_indexer_alt_framework::IndexerArgs;
use sui_sdk::SuiClient;
use sui_sdk::SuiClientBuilder;
use url::Url;

use sui_indexer_alt_framework::postgres::DbArgs;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct DubheIndexerArgs {
    /// Configuration file path
    #[arg(long, default_value = "config.example.toml")]
    pub config: String,
    #[command(flatten)]
    pub indexer_args: IndexerArgs,
    /// Path to the configuration file
    #[arg(short, long, default_value = "dubhe.config.json")]
    pub config_json: String,
    /// Force restart: clear indexer database (only for local nodes)
    #[arg(long, default_value = "false")]
    pub force: bool,
    /// sui rpc url
    #[arg(long, default_value = "http://localhost:9000")]
    pub rpc_url: String,
    /// checkpoint url
    #[arg(long, default_value = ".chk")]
    pub checkpoint_url: String,
    /// database url
    #[arg(long, default_value = "postgres://postgres@localhost:5432/postgres")]
    pub database_url: String,
    /// server port
    #[arg(long, default_value = "8080")]
    pub port: u16,
    #[command(flatten)]
    pub db_args: DbArgs,
}

impl DubheIndexerArgs {
    pub fn get_config_json(&self) -> Result<Value> {
        let content = fs::read_to_string(self.config_json.clone())?;
        let json: Value = serde_json::from_str(&content)?;
        Ok(json)
    }

    pub async fn get_sui_client(&self) -> Result<SuiClient> {
        let sui_client = SuiClientBuilder::default().build(&self.rpc_url).await?;
        Ok(sui_client)
    }

    pub fn get_checkpoint_url(&self) -> Result<(Option<PathBuf>, Option<Url>)> {
        if self.checkpoint_url.starts_with("http") {
            Ok((None, Some(Url::parse(&self.checkpoint_url).unwrap())))
        } else {
            Ok((Some(PathBuf::from(self.checkpoint_url.clone())), None))
        }
    }
}
