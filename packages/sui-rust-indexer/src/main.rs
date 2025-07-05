// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::sui_data_ingestion_core as sdic;
use crate::sui_data_ingestion_core::PostgressProgressStore;
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

mod args;
mod db;
mod events;
mod notify;
mod simple_notify;
mod sql;
mod sui_data_ingestion_core;
mod table;
mod tls;
mod worker;

use crate::args::DubheIndexerArgs;
use crate::db::get_connection_pool;
use crate::table::TableMetadata;
use crate::worker::DubheIndexerWorker;

// testnet
// cargo run -- --config dubhe.config.json --worker-pool-number 3 --store-url https://checkpoints.testnet.sui.io --start-checkpoint 1000
// localnet
// cargo run -- --config dubhe.config.json --worker-pool-number 3 --store-url ./chk --start-checkpoint 1
// localnet with force restart (clear indexer database only)
// cargo run -- --config dubhe.config.json --worker-pool-number 3 --store-url ./chk --start-checkpoint 1 --force

#[tokio::main]
async fn main() -> Result<()> {
    // // Parse command line arguments
    let args = DubheIndexerArgs::parse();

    // Set log level
    std::env::set_var("RUST_LOG", "error");
    let guard = mysten_service::logging::init();
    dotenv().ok();

    let sui_client = args.get_sui_client().await?;
    let latest_checkpoint = sui_client
        .read_api()
        .get_latest_checkpoint_sequence_number()
        .await?;
    println!("Latest checkpoint: {:?}", latest_checkpoint);
    // let start_checkpoint = args.get_start_checkpoint(latest_checkpoint);
    let pg_pool = get_connection_pool().await;

    let config_json = args.get_config_json()?;
    let (package_id, start_checkpoint, tables) = TableMetadata::from_json(config_json)?;

    let mut dubhe_indexer_worker = DubheIndexerWorker {
        pg_pool,
        package_id,
        tables,
        with_graphql: args.with_graphql,
    };

    // Handle force restart for local nodes only
    if args.force {
        if args.network == "localnet" {
            // Clear database only (not the node's checkpoint data)
            dubhe_indexer_worker.clear_all_data().await?;
        } else {
            return Err(anyhow::anyhow!(
                "Force restart is only supported for local nodes"
            ));
        }
    }

    // Create database tables from configuration
    dubhe_indexer_worker.create_db_tables_from_config().await?;
    dubhe_indexer_worker
        .create_reader_progress_db_table(
            start_checkpoint,
            latest_checkpoint,
            args.worker_pool_number,
        )
        .await?;

    let concurrency = 1;
    let metrics = DataIngestionMetrics::new(&Registry::new());
    let progress_store = PostgressProgressStore::new(get_connection_pool().await);

    let (exit_sender, exit_receiver) = oneshot::channel();
    let mut executor = IndexerExecutor::new(progress_store, 1, metrics.clone());

    executor
        .register(WorkerPool::new(
            dubhe_indexer_worker,
            "latest_reader_progress".to_string(),
            concurrency,
        ))
        .await?;

    let (local_path, remote_store_url) = args.get_local_path_and_store_url()?;

    let reader_options = ReaderOptions {
        gc_checkpoint_files: false,
        ..Default::default()
    };

    executor
        .run(
            local_path,
            remote_store_url,
            vec![],
            reader_options,
            exit_receiver,
        )
        .await?;
    drop(guard);
    Ok(())
}
