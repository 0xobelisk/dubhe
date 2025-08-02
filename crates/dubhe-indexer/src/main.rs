// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::sui_data_ingestion_core as sdic;
use crate::sui_data_ingestion_core::{setup_single_workflow, ProgressStore};
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use diesel::QueryableByName;
use dotenvy::dotenv;
use sdic::{DataIngestionMetrics, FileProgressStore, IndexerExecutor};
use sdic::{ReaderOptions, Worker, WorkerPool};
use std::env;
use std::net::SocketAddr;
use sui_sdk::SuiClientBuilder;
use sui_types::full_checkpoint_content::CheckpointData;
use tokio::sync::oneshot;
use std::net::TcpListener;
use rand::Rng;

use prometheus::Registry;
use std::path::PathBuf;
use tempfile::TempDir;

mod args;
// mod sql;
mod sui_data_ingestion_core;
// mod tls;
mod worker;
mod config;
mod proxy;

use crate::args::DubheIndexerArgs;
// use crate::db::get_connection_pool;
use dubhe_common::{Database, Storage, TableMetadata};
use crate::worker::{DubheIndexerWorker, GrpcSubscribers};
use crate::config::DubheConfig;
use dubhe_common::SqliteStorage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use dubhe_indexer_grpc::grpc::start_grpc_server;
use dubhe_indexer_graphql::{GraphQLServerManager, GraphQLConfig, TableChange};
use tokio::sync::mpsc;

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = DubheIndexerArgs::parse();

    let mut config = DubheConfig::new(&args)?;

    match &args.origin_package_id {
        Some(package_id) => {
            config.sui.origin_package_id = package_id.clone();
        }
        None => { }
    };

    // Initialize logging system based on configuration
    config.init_logging()?;

    log::info!("Dubhe Indexer starting up");
    log::info!("Config file: {}, Worker pool: {}, Start checkpoint: {}", 
        args.config, args.worker_pool_number, args.start_checkpoint);

    log::debug!("Configuration loaded - RPC URL: {}, Package ID: {}, Database: {}, Server: {}", 
        config.sui.rpc_url, config.sui.origin_package_id, config.database.url, config.server.addr);

    let sui_client = config.get_sui_client().await?;
    let latest_checkpoint = sui_client
        .read_api()
        .get_latest_checkpoint_sequence_number()
        .await?;
    log::info!("Latest checkpoint: {:?}", latest_checkpoint);

    // // let start_checkpoint = args.get_start_checkpoint(latest_checkpoint);
    // let pg_pool = get_connection_pool().await;

    let config_json = args.get_config_json()?;
    let (package_id, start_checkpoint, tables) = TableMetadata::from_json(config_json)?;

    let database = Database::new(&config.database.url).await?;

    // Initialize subscribers for GRPC
    let subscribers: GrpcSubscribers = Arc::new(RwLock::new(HashMap::new()));
    
    // Create GraphQL subscribers manager
    let graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>> = 
        Arc::new(RwLock::new(HashMap::new()));
    
    let mut dubhe_indexer_worker = DubheIndexerWorker::new(
        config.clone(), 
        tables.clone(), 
        false, 
        subscribers.clone(),
        graphql_subscribers.clone(),
    ).await?;
    dubhe_indexer_worker.database.create_tables(&tables).await?;
    
    // Extract port from server.addr (format: "0.0.0.0:8080")
    let server_port = config.server.addr.split(':').last()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8080);

    // Create GraphQL configuration
    let graphql_config = dubhe_indexer_graphql::GraphQLConfig {
        port: server_port,
        database_url: config.database.url.clone(),
        schema: "public".to_string(),
        endpoint: "/graphql".to_string(),
        cors: config.graphql.cors,
        subscriptions: config.graphql.subscriptions,
        env: "development".to_string(),
        debug: config.graphql.debug,
        query_timeout: config.graphql.query_timeout,
        max_connections: config.graphql.max_connections,
        heartbeat_interval: config.graphql.heartbeat_interval,
        enable_metrics: config.graphql.enable_metrics,
        enable_live_queries: config.graphql.enable_live_queries,
        enable_pg_subscriptions: config.graphql.enable_pg_subscriptions,
        enable_native_websocket: config.graphql.enable_native_websocket,
        realtime_port: config.graphql.realtime_port,
    };
    
    // Parse server address
    let server_addr: std::net::SocketAddr = config.server.addr.parse()
        .map_err(|e| anyhow::anyhow!("Invalid server address {}: {}", config.server.addr, e))?;

    // Print startup banner
    println!("\n🚀 Dubhe Indexer Starting...");
    println!("================================");
    println!("🔌 gRPC Endpoint:    http://{}", server_addr);
    println!("📊 GraphQL Endpoint: http://{}/graphql", server_addr);
    println!("🏠 Welcome Page:     http://{}/welcome", server_addr);
    println!("🎮 Playground:       http://{}/playground", server_addr);
    println!("💚 Health Check:     http://{}/health", server_addr);
    
    log::info!("🔧 Configuration loaded from: {}", args.config);
    log::info!("📊 Database URL: {}", config.database.url);
    log::info!("🌐 Server listening on: {}", server_addr);

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
    
    log::info!("🏗️  Setting up torii-style architecture:");
    log::info!("   - Proxy Server:    {}", server_addr);
    log::info!("   - gRPC Backend:    {}", grpc_backend_addr);
    log::info!("   - GraphQL Backend: {}", graphql_backend_addr);
    
    let proxy_server = proxy::ProxyServer::new(
        server_addr,                  // Main proxy endpoint
        Some(grpc_backend_addr),      // Independent gRPC service
        Some(graphql_backend_addr),   // Independent GraphQL service
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

    // // Handle force restart for local nodes only
    // if args.force {
    //     if args.network == "localnet" {
    //         // Clear database only (not the node's checkpoint data)
    //         dubhe_indexer_worker.clear_all_data().await?;
    //     } else {
    //         return Err(anyhow::anyhow!(
    //             "Force restart is only supported for local nodes"
    //         ));
    //     }
    // }

    // // Create database tables from configuration
    // dubhe_indexer_worker.create_db_tables_from_config().await?;
    // dubhe_indexer_worker
    //     .create_reader_progress_db_table(
    //         start_checkpoint,
    //         latest_checkpoint,
    //         args.worker_pool_number,
    //     )
    //     .await?;

    let (exit_sender, exit_receiver) = oneshot::channel();
    let concurrency = 20;
    let metrics = DataIngestionMetrics::new(&Registry::new());
    let backfill_progress_file_path = config.sui.progress_file_path
        .clone()
        .unwrap_or_else(|| "./local_reader_progress".to_string());
    
    // Check if the progress file exists, if not create it with default content
    let progress_path = PathBuf::from(&backfill_progress_file_path);
    if !progress_path.exists() {
        log::info!("📁 Creating progress file: {}", backfill_progress_file_path);
        let default_content = r#"{ "latest_reader_progress": 0}"#;
        std::fs::write(&progress_path, default_content)?;
        log::info!("✅ Progress file created successfully");
    }
    
    let mut progress_store = FileProgressStore::new(progress_path);
    progress_store.save("latest_reader_progress".to_string(), latest_checkpoint).await?;
   
    let mut executor = IndexerExecutor::new(progress_store, 1, metrics.clone());
    executor
        .register(WorkerPool::new(
            dubhe_indexer_worker,
            "latest_reader_progress".to_string(),
            concurrency,
        ))
        .await?;
    let reader_options = ReaderOptions {
        gc_checkpoint_files: false,
        ..Default::default()
    };
    let (local_path, remote_store_url) = config.get_checkpoint_url()?;
    
    // Start indexer executor
    let executor_handle = tokio::spawn(async move {
        log::info!("🚀 Starting indexer executor...");
        executor
            .run(
                local_path,
                remote_store_url,
                vec![],
                reader_options,
                exit_receiver,
            )
            .await
    });

    // Wait for either proxy or executor to complete/fail
    log::info!("🎯 All services started successfully!");
    log::info!("📡 Dubhe Indexer is now running with unified gRPC/GraphQL endpoint");
    
    tokio::select! {
        result = proxy_handle => {
            match result {
                Ok(_) => log::info!("✅ Proxy server completed successfully"),
                Err(e) => log::error!("❌ Proxy server task failed: {}", e),
            }
        }
        result = executor_handle => {
            match result {
                Ok(Ok(_)) => log::info!("✅ Indexer executor completed successfully"),
                Ok(Err(e)) => log::error!("❌ Indexer executor failed: {}", e),
                Err(e) => log::error!("❌ Indexer executor task failed: {}", e),
            }
        }
    }
    
    Ok(())
}
