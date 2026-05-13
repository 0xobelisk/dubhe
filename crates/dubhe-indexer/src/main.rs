// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::handlers::{DubheEventHandler, GrpcSubscribers};
use anyhow::Result;
use clap::Parser;
use std::net::SocketAddr;
use sui_indexer_alt_framework::cluster::IndexerCluster;
use sui_indexer_alt_framework::ingestion::ingestion_client::IngestionClientArgs;
use sui_indexer_alt_framework::ingestion::ClientArgs;
use sui_indexer_alt_framework::IndexerArgs;
use url::Url;

mod args;
mod config;
mod framework_ids;
mod handlers;
mod proxy;

use crate::args::DubheIndexerArgs;
use dubhe_common::Database;
use dubhe_indexer_graphql::TableChange;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

use dubhe_common::DubheConfig as DubheConfigCommon;

#[tokio::main]
async fn main() -> Result<()> {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info");
    }
    env_logger::init();

    // Parse command line arguments
    let args = DubheIndexerArgs::parse();

    let config_json = args.get_config_json()?;
    let mut dubhe_config = DubheConfigCommon::from_json(config_json.clone())?;

    // Inject Dubhe framework package IDs into known_package_ids.
    //
    // ALL dubhe_events are emitted from the framework package (not the DApp package),
    // so its address must be trusted for event.type_.address validation to pass.
    //
    // Strategy per network:
    //   localnet / devnet → framework is re-deployed fresh each run; use
    //                        original_dubhe_package_id from dubhe.config.json only
    //                        (already inserted by DubheConfig::from_json).
    //   testnet / mainnet → use the hardcoded historical list so that old checkpoints
    //                        (from before an upgrade) remain indexable.
    let framework_ids = framework_ids::framework_package_ids_for_network(&args.network);
    for id in framework_ids {
        dubhe_config.known_package_ids.insert(id.to_string());
    }
    log::info!(
        "🔐 Network: {:?} | known_package_ids: {} entries (DApp + framework)",
        args.network,
        dubhe_config.known_package_ids.len()
    );

    let database = Database::new(&args.database_url).await?;

    if args.force {
        database.clear().await?;
    }

    let client_args = if args.use_rpc_ingestion {
        log::info!("📂 Checkpoint source: RPC (gRPC) at {}", args.rpc_url);
        ClientArgs {
            ingestion: IngestionClientArgs {
                rpc_api_url: Some(Url::parse(&args.rpc_url)?),
                ..Default::default()
            },
            ..Default::default()
        }
    } else {
        let (local_ingestion_path, remote_store_url) = args.get_checkpoint_url()?;
        match (&local_ingestion_path, &remote_store_url) {
            (Some(p), None) => log::info!(
                "📂 Checkpoint source: local path {:?} (reads {{seq}}.binpb.zst written by sui v1.66+)",
                p
            ),
            (None, Some(u)) => log::info!("📂 Checkpoint source: remote store {}", u),
            _ => log::info!("📂 Checkpoint source: (default)"),
        }
        ClientArgs {
            ingestion: IngestionClientArgs {
                local_ingestion_path,
                remote_store_url,
                ..Default::default()
            },
            ..Default::default()
        }
    };

    // Always ensure store tables exist (required for handler commit); after --force DB is empty
    database.create_tables(&dubhe_config).await?;

    let first_cp = dubhe_config
        .start_checkpoint
        .parse::<u64>()
        .ok()
        .map(|n| {
            log::info!("📌 Will ingest from checkpoint {} (from dubhe.config.json)", n);
            n
        });
    let indexer_args = IndexerArgs {
        first_checkpoint: first_cp,
        ..Default::default()
    };

    let mut cluster = IndexerCluster::builder()
        .with_indexer_args(indexer_args)
        .with_database_url(Url::parse(&args.database_url).unwrap())
        .with_client_args(client_args)
        .build()
        .await?;

    // Initialize subscribers for GRPC
    let subscribers: GrpcSubscribers = Arc::new(RwLock::new(HashMap::new()));

    // Create GraphQL subscribers manager
    let graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>> =
        Arc::new(RwLock::new(HashMap::new()));

    let (dubhe_event_handler, last_processed_checkpoint) = DubheEventHandler::new(
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
    let mut handle = cluster.run().await?;

    // Watchdog: warn when no checkpoint has been processed for a while.
    // This typically means the configured start_checkpoint is not yet available in the
    // checkpoint CDN — the framework retries silently at DEBUG level, leaving the user
    // with no visible output. The watchdog surfaces this as a periodic WARN.
    let watchdog_last = last_processed_checkpoint.clone();
    let watchdog_start_cp = first_cp;
    tokio::spawn(async move {
        // Give the ingestion layer an initial window before we start complaining.
        const FIRST_WARN_SECS: u64 = 30;
        const REPEAT_WARN_SECS: u64 = 60;
        tokio::time::sleep(tokio::time::Duration::from_secs(FIRST_WARN_SECS)).await;

        loop {
            if watchdog_last.load(std::sync::atomic::Ordering::Relaxed) != u64::MAX {
                // At least one checkpoint has been processed — stop watching.
                break;
            }
            let hint = match watchdog_start_cp {
                Some(cp) => format!(
                    "start_checkpoint={cp}. \
                     The CDN may not have uploaded this checkpoint yet. \
                     Run with RUST_LOG=sui_indexer_alt_framework::ingestion=debug to see retries."
                ),
                None => "no start_checkpoint configured.".to_string(),
            };
            log::warn!(
                "⚠️  No checkpoint has been processed yet since startup ({hint})"
            );
            tokio::time::sleep(tokio::time::Duration::from_secs(REPEAT_WARN_SECS)).await;
        }
    });

    // Start unified proxy server with independent GraphQL and gRPC backends (torii-style architecture)
    // Fixed ports via --grpc-port and --graphql-port (defaults 8085, 8089)
    if args.grpc_port == args.graphql_port {
        anyhow::bail!(
            "grpc-port and graphql-port must differ (got {}). Use --grpc-port and --graphql-port.",
            args.grpc_port
        );
    }
    let grpc_backend_addr: SocketAddr = format!("0.0.0.0:{}", args.grpc_port)
        .parse()
        .map_err(|e| anyhow::anyhow!("Invalid grpc-port {}: {}", args.grpc_port, e))?;
    let graphql_backend_addr: SocketAddr = format!("0.0.0.0:{}", args.graphql_port)
        .parse()
        .map_err(|e| anyhow::anyhow!("Invalid graphql-port {}: {}", args.graphql_port, e))?;

    // Print startup banner
    println!("\n🚀 Dubhe Indexer Starting...");
    println!("================================");
    println!("🌐 Proxy Server:     http://0.0.0.0:{}", args.port);
    println!("🔌 gRPC Service:     http://0.0.0.0:{} (direct)", grpc_backend_addr.port());
    println!("   Via Proxy:        http://0.0.0.0:{}/dubhe_grpc.*", args.port);
    println!("📊 GraphQL Endpoint: http://0.0.0.0:{}/graphql", args.port);
    println!("🏠 Welcome Page:     http://0.0.0.0:{}/welcome", args.port);
    println!(
        "🎮 Playground:       http://0.0.0.0:{}/playground",
        args.port
    );
    println!("💚 Health Check:     http://0.0.0.0:{}/health", args.port);
    println!("📋 Metadata:         http://0.0.0.0:{}/metadata", args.port);
    println!("\n💡 For gRPC clients, use: http://localhost:{}", grpc_backend_addr.port());

    let server_addr = format!("0.0.0.0:{}", args.port)
        .parse::<SocketAddr>()
        .map_err(|e| anyhow::anyhow!("Invalid server address {}: {}", args.port, e))?;
    let proxy_server = proxy::ProxyServer::new(
        server_addr,                // Main proxy endpoint
        Some(grpc_backend_addr),    // Independent gRPC service
        Some(graphql_backend_addr), // Independent GraphQL service
        subscribers.clone(),
        graphql_subscribers.clone(),
        Arc::new(config_json.clone()),
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
        result = handle.join() => {
            match result {
                Ok(_) => log::info!("✅ Indexer executor completed successfully"),
                Err(e) => log::error!("❌ Indexer executor task failed: {}", e),
            }
        }
    }

    Ok(())
}
