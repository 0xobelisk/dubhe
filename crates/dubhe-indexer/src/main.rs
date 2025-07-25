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
use sui_sdk::SuiClientBuilder;
use sui_types::full_checkpoint_content::CheckpointData;
use tokio::sync::oneshot;

use prometheus::Registry;
use std::path::PathBuf;
use tempfile::TempDir;

mod args;
// mod db;
mod sql;
mod sui_data_ingestion_core;
mod tls;
mod worker;
mod config;

use crate::args::DubheIndexerArgs;
// use crate::db::get_connection_pool;
use dubhe_common::{Database, Storage, TableMetadata};
use crate::worker::{DubheIndexerWorker, TableSubscribers};
use crate::config::DubheConfig;
use dubhe_common::SqliteStorage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use dubhe_indexer_api::grpc::start_grpc_server;

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = DubheIndexerArgs::parse();

    let config = DubheConfig::new(&args)?;

    // Initialize logging system based on configuration
    config.init_logging()?;

    log::info!("Dubhe Indexer starting up");
    log::info!("Config file: {}, Worker pool: {}, Start checkpoint: {}", 
        args.config, args.worker_pool_number, args.start_checkpoint);

    log::debug!("Configuration loaded - RPC URL: {}, Package ID: {}, Database: {}, GRPC: {}", 
        config.sui.rpc_url, config.sui.origin_package_id, config.database.url, config.grpc.addr);

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

    println!("tables: {:?}", tables);

    let database = Database::new(&config.database.url).await?;

    // Initialize subscribers for GRPC
    let subscribers: TableSubscribers = Arc::new(RwLock::new(HashMap::new()));
    
    let mut dubhe_indexer_worker = DubheIndexerWorker::new(config.clone(), tables.clone(), false, subscribers.clone()).await?;
    dubhe_indexer_worker.database.create_tables(&tables).await?;
    
    // Start GRPC server in background
    let grpc_addr = config.grpc.addr.clone();
    let grpc_subscribers = subscribers.clone();
    tokio::spawn(async move {
        if let Err(e) = start_grpc_server(grpc_addr, grpc_subscribers).await {
            log::error!("GRPC server error: {}", e);
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
    let concurrency = 2;
    let metrics = DataIngestionMetrics::new(&Registry::new());
    let backfill_progress_file_path =
        env::var("BACKFILL_PROGRESS_FILE_PATH").unwrap_or("crates/dubhe-indexer/local_reader_progress".to_string());
    let mut progress_store = FileProgressStore::new(PathBuf::from(backfill_progress_file_path));
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
    executor
        .run(
            local_path,
            remote_store_url,
            vec![],
            reader_options,
            exit_receiver,
        )
        .await?;
    Ok(())
}
