// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::handlers::DubheEventHandler;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use diesel::QueryableByName;
use dotenvy::dotenv;
use rand::Rng;
use std::env;
use std::net::SocketAddr;
use std::net::TcpListener;
use sui_indexer_alt_framework::cluster::{Args, IndexerCluster};
use sui_indexer_alt_framework::ingestion::ClientArgs;
use sui_indexer_alt_framework::pipeline::sequential::SequentialConfig;
use sui_indexer_alt_framework::IndexerArgs;
use sui_sdk::SuiClientBuilder;
use sui_types::full_checkpoint_content::CheckpointData;
use tokio::sync::oneshot;
use url::Url;

use prometheus::Registry;
use std::path::PathBuf;
use tempfile::TempDir;

mod args;
mod config;
mod handlers;
mod proxy;
mod worker;

use crate::args::DubheIndexerArgs;
// use crate::db::get_connection_pool;
use crate::config::DubheConfig;
use crate::worker::{DubheIndexerWorker, GrpcSubscribers};
use dubhe_common::SqliteStorage;
use dubhe_common::{Database, Storage, TableMetadata};
use dubhe_indexer_graphql::{GraphQLConfig, GraphQLServerManager, TableChange};
use dubhe_indexer_grpc::grpc::start_grpc_server;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

use dubhe_common::DubheConfig as DubheConfigCommon;

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = DubheIndexerArgs::parse();

    // let mut config = DubheConfig::new(&args)?;

    let sui_client = args.get_sui_client().await?;
    let latest_checkpoint = sui_client
        .read_api()
        .get_latest_checkpoint_sequence_number()
        .await?;

    let config_json = args.get_config_json()?;
    let dubhe_config = DubheConfigCommon::from_json(config_json)?;

    let database = Database::new(&args.database_url).await?;

    if args.force {
        database.clear().await?;
    }

    let (local_ingestion_path, remote_store_url) = args.get_checkpoint_url()?;

    let client_args = ClientArgs {
        local_ingestion_path,
        remote_store_url,
        ..Default::default()
    };

    let mut cluster = if !database.is_empty().await? {
        database.create_tables(&dubhe_config).await?;
        let indexer_args = IndexerArgs {
            first_checkpoint: Some(dubhe_config.start_checkpoint.parse::<u64>().unwrap()),
            ..Default::default()
        };
        println!("🔄 Indexer args: {:?}", args.indexer_args);
        IndexerCluster::builder()
            .with_indexer_args(indexer_args)
            .with_database_url(Url::parse(&args.database_url).unwrap())
            .with_client_args(client_args)
            .build()
            .await?
    } else {
        IndexerCluster::builder()
            .with_database_url(Url::parse(&args.database_url).unwrap())
            .with_client_args(client_args)
            .build()
            .await?
    };

    // Initialize subscribers for GRPC
    let subscribers: GrpcSubscribers = Arc::new(RwLock::new(HashMap::new()));

    // Create GraphQL subscribers manager
    let graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>> =
        Arc::new(RwLock::new(HashMap::new()));

    let dubhe_event_handler = DubheEventHandler::new(
        dubhe_config,
        subscribers.clone(),
        graphql_subscribers.clone(),
    );

    // Register our custom sequential pipeline with the cluster
    cluster
        .sequential_pipeline(
            dubhe_event_handler, // Our processor/handler implementation
            Default::default(),  // Use default batch sizes and checkpoint lag
        )
        .await?;

    // Start the indexer and wait for completion
    let handle = cluster.run().await?;

    // Print startup banner
    println!("\n🚀 Dubhe Indexer Starting...");
    println!("================================");
    println!("🔌 gRPC Endpoint:    http://0.0.0.0:{}/", args.port);
    println!("📊 GraphQL Endpoint: http://0.0.0.0:{}/graphql", args.port);
    println!("🏠 Welcome Page:     http://0.0.0.0:{}/welcome", args.port);
    println!(
        "🎮 Playground:       http://0.0.0.0:{}/playground",
        args.port
    );
    println!("💚 Health Check:     http://0.0.0.0:{}/health", args.port);

    // Start unified proxy server with independent GraphQL and gRPC backends (torii-style architecture)
    // If the port is occupied, generate a new port
    let grpc_backend_addr: SocketAddr = loop {
        let port = rand::thread_rng().gen_range(8081..=8089);
        let addr = format!("0.0.0.0:{}", port);
        if TcpListener::bind(addr.parse::<SocketAddr>().unwrap()).is_ok() {
            break addr.parse::<SocketAddr>().unwrap();
        }
    };

    let graphql_backend_addr: SocketAddr = loop {
        let port = rand::thread_rng().gen_range(8081..=8089);
        let addr = format!("0.0.0.0:{}", port);
        if TcpListener::bind(addr.parse::<SocketAddr>().unwrap()).is_ok() {
            break addr.parse::<SocketAddr>().unwrap();
        }
    };

    let server_addr = format!("0.0.0.0:{}", args.port)
        .parse::<SocketAddr>()
        .map_err(|e| anyhow::anyhow!("Invalid server address {}: {}", args.port, e))?;
    let proxy_server = proxy::ProxyServer::new(
        server_addr,                // Main proxy endpoint
        Some(grpc_backend_addr),    // Independent gRPC service
        Some(graphql_backend_addr), // Independent GraphQL service
        subscribers.clone(),
        graphql_subscribers.clone(),
    );

    // Start proxy server in the main task (it will spawn backend services internally)
    let proxy_handle = tokio::spawn(async move {
        if let Err(e) = proxy_server.start(Arc::new(database)).await {
            log::error!("❌ Proxy server failed: {}", e);
            std::process::exit(1);
        }
    });

    tokio::select! {
        result = proxy_handle => {
            match result {
                Ok(_) => log::info!("✅ Proxy server completed successfully"),
                Err(e) => log::error!("❌ Proxy server task failed: {}", e),
            }
        }
        result = handle => {
            match result {
                Ok(_) => log::info!("✅ Indexer executor completed successfully"),
                Err(e) => log::error!("❌ Indexer executor task failed: {}", e),
            }
        }
    }

    Ok(())
}
