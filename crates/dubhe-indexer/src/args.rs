// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use clap::{Parser, ValueEnum};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use sui_indexer_alt_framework::IndexerArgs;
use url::Url;

use sui_indexer_alt_framework::postgres::DbArgs;

/// Sui network to index.
///
/// * `localnet` / `devnet` — Dubhe framework is redeployed fresh each time; framework package IDs
///   are read exclusively from `original_dubhe_package_id` in `dubhe.config.json`.
/// * `testnet` / `mainnet` — Framework package IDs come from the hardcoded list in
///   `framework_ids.rs`, which must be updated after each framework upgrade.
#[derive(ValueEnum, Clone, Debug, PartialEq, Eq)]
pub enum Network {
    Localnet,
    Devnet,
    Testnet,
    Mainnet,
}

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
    /// Sui network being indexed.
    /// For localnet/devnet the Dubhe framework is redeployed each time, so its package ID is
    /// read from `original_dubhe_package_id` in dubhe.config.json.
    /// For testnet/mainnet the hardcoded list in framework_ids.rs is used instead.
    #[arg(long, value_enum, default_value = "localnet")]
    pub network: Network,
    /// sui rpc url
    #[arg(long, default_value = "http://localhost:9000")]
    pub rpc_url: String,
    /// Checkpoint source: local directory path (e.g. .chk) or http URL for a remote store.
    /// For localnet: the sui node (v1.66+) writes {seq}.binpb.zst files to this directory,
    /// and the indexer (v1.66.2) reads them directly. No extra flags needed.
    /// For testnet/mainnet: pass the remote store URL (e.g. https://checkpoints.testnet.sui.io).
    #[arg(long, default_value = ".chk")]
    pub checkpoint_url: String,
    /// Use RPC (gRPC) to fetch checkpoints instead of local path or remote store.
    /// Only needed when you have a full node with gRPC checkpoint API (not typical for localnet).
    #[arg(long, default_value = "false")]
    pub use_rpc_ingestion: bool,
    /// database url
    #[arg(long, default_value = "postgres://postgres@localhost:5432/postgres")]
    pub database_url: String,
    /// server port (proxy: health, graphql, welcome, etc.)
    #[arg(long, default_value = "8080")]
    pub port: u16,
    /// gRPC backend port (direct gRPC, must differ from graphql-port)
    #[arg(long, default_value = "8085")]
    pub grpc_port: u16,
    /// GraphQL backend port (independent GraphQL service, must differ from grpc-port)
    #[arg(long, default_value = "8089")]
    pub graphql_port: u16,
    #[command(flatten)]
    pub db_args: DbArgs,
}

impl DubheIndexerArgs {
    pub fn get_config_json(&self) -> Result<Value> {
        let content = fs::read_to_string(self.config_json.clone())?;
        let json: Value = serde_json::from_str(&content)?;
        Ok(json)
    }

    pub fn get_checkpoint_url(&self) -> Result<(Option<PathBuf>, Option<Url>)> {
        if self.checkpoint_url.starts_with("http") {
            Ok((None, Some(Url::parse(&self.checkpoint_url).unwrap())))
        } else {
            Ok((Some(PathBuf::from(self.checkpoint_url.clone())), None))
        }
    }
}
