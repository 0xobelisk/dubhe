// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// docs::#processordeps
use anyhow::Result;
use std::sync::Arc;
use dubhe_common::DubheConfig;
use dubhe_common::Event;
use dubhe_indexer_graphql::TableChange;
use dubhe_indexer_grpc::types::TableChange as GrpcTableChange;
use prost_types::Value;
use std::collections::HashMap;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_types::effects::TransactionEffectsAPI;
use sui_types::full_checkpoint_content::Checkpoint;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

pub type GrpcSubscribers =
    Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<GrpcTableChange>>>>>;
pub type GraphQLSubscribers = Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>;

pub struct DubheEventHandler {
    pub dubhe_config: DubheConfig,
    pub grpc_subscribers: GrpcSubscribers,
    pub graphql_subscribers: GraphQLSubscribers,
    /// Tracks the last checkpoint sequence number processed by this handler.
    /// Initialized to u64::MAX to distinguish "not yet started" from checkpoint 0.
    pub last_processed_checkpoint: Arc<std::sync::atomic::AtomicU64>,
}

impl DubheEventHandler {
    pub fn new(
        dubhe_config: DubheConfig,
        grpc_subscribers: GrpcSubscribers,
        graphql_subscribers: GraphQLSubscribers,
    ) -> (Self, Arc<std::sync::atomic::AtomicU64>) {
        let last_processed_checkpoint = Arc::new(std::sync::atomic::AtomicU64::new(u64::MAX));
        let handler = Self {
            dubhe_config,
            grpc_subscribers,
            graphql_subscribers,
            last_processed_checkpoint: last_processed_checkpoint.clone(),
        };
        (handler, last_processed_checkpoint)
    }
}

/// Event type short names emitted by the Dubhe framework (module dubhe_events).
const DUBHE_EVENT_SET_RECORD: &str = "Dubhe_Store_SetRecord";
const DUBHE_EVENT_SET_FIELD: &str = "Dubhe_Store_SetField";
const DUBHE_EVENT_DELETE_RECORD: &str = "Dubhe_Store_DeleteRecord";
const DUBHE_EVENT_DELETE_FIELD: &str = "Dubhe_Store_DeleteField";

/// Extract short struct name from a full Sui event type (StructTag).
/// e.g. "0x123::dubhe_events::Dubhe_Store_SetRecord" -> "Dubhe_Store_SetRecord"
fn event_type_short_name(full_type: &str) -> &str {
    full_type.rsplit("::").next().unwrap_or(full_type)
}

fn sql_string(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn is_dubhe_framework_event(short_name: &str) -> bool {
    matches!(
        short_name,
        DUBHE_EVENT_SET_RECORD
            | DUBHE_EVENT_SET_FIELD
            | DUBHE_EVENT_DELETE_RECORD
            | DUBHE_EVENT_DELETE_FIELD
            | "Dubhe_UserStorage_Created"
            | "Dubhe_Object_Created"
            | "Dubhe_Object_Destroyed"
            | "Dubhe_Object_SetField"
            | "Dubhe_Object_DeleteField"
            | "Dubhe_Scene_Created"
            | "Dubhe_Scene_Destroyed"
            | "Dubhe_Scene_SetField"
            | "Dubhe_Scene_DeleteField"
            | "Dubhe_ScenePermit_Created"
            | "Dubhe_ScenePermit_Accept"
            | "Dubhe_ScenePermit_Join"
            | "Dubhe_ScenePermit_Leave"
            | "Dubhe_ScenePermit_Expire"
            | "ItemListed"
            | "ItemSold"
            | "ListingCancelled"
            | "ListingExpired"
            | "DappCreated"
            | "DappUpgraded"
            | "CreditRecharged"
            | "SessionActivated"
            | "SessionDeactivated"
            | "DappPausedChanged"
            | "WritesSettled"
            | "SettlementSkipped"
            | "SettlementPartial"
            | "FreeCreditGranted"
            | "FreeCreditRevoked"
            | "FreeCreditExtended"
            | "SettlementModeChanged"
            | "DappRevenueWithdrawn"
            | "MarketplaceFeeSettled"
            | "DappRevenueShareSet"
            | "DappFeeStateUpdated"
            | "DappRevenueStateUpdated"
    )
}

// docs::#processor
#[async_trait::async_trait]
impl Processor for DubheEventHandler {
    const NAME: &'static str = "dubhe_event_handler";

    type Value = String;

    async fn process(&self, checkpoint: &Arc<Checkpoint>) -> Result<Vec<Self::Value>> {
        let seq = checkpoint.summary.sequence_number;
        let timestamp_ms = checkpoint.summary.timestamp_ms;
        let num_tx = checkpoint.transactions.len();

        self.last_processed_checkpoint
            .store(seq, std::sync::atomic::Ordering::Relaxed);

        log::info!(
            "📥 process checkpoint seq={} ts_ms={} num_tx={}",
            seq,
            timestamp_ms,
            num_tx
        );

        let mut parsed_events = Vec::new();
        let mut total_events = 0usize;
        let mut dubhe_events_seen = 0usize;

        for transaction in &checkpoint.transactions {
            let current_digest = transaction.effects.transaction_digest().base58_encode();
            let maybe_events = &transaction.events;
            let (events_ref, count) = match maybe_events {
                Some(events) => {
                    let n = events.data.len();
                    total_events += n;
                    (events, n)
                }
                None => continue,
            };
            let mut tx_logged = false;
            for (event_seq, event) in events_ref.data.iter().enumerate() {
                let module_name = event.type_.module.to_string();
                if module_name != "dubhe_events" {
                    continue;
                }
                // Verify the event originates from a known package address.
                // event.type_.address is set by the Sui node and cannot be forged in the BCS
                // payload — this prevents other contracts from injecting events by copying
                // the dapp_key string (which any contract can obtain via type_name::get<T>()).
                let event_pkg = format!("{:0>64}", event.type_.address.to_hex()).to_lowercase();
                if !self.dubhe_config.known_package_ids.contains(&event_pkg) {
                    log::debug!(
                        "  skip event from unknown package: address={} (not in known_package_ids)",
                        event_pkg
                    );
                    continue;
                }
                let type_str = event.type_.name.to_string();
                let short_name = event_type_short_name(&type_str);
                if is_dubhe_framework_event(short_name) {
                    if !tx_logged {
                        log::info!("  tx {} has {} events", current_digest, count);
                        tx_logged = true;
                    }
                    dubhe_events_seen += 1;
                    log::info!(
                        "  🎯 dubhe event type={} table (after parse) will be checked",
                        short_name
                    );
                    let parsed_event =
                        match Event::from_bytes(short_name, event.contents.as_slice()) {
                            Ok(e) => e,
                            Err(e) => {
                                let msg = e.to_string();
                                if msg.starts_with("UNIMPLEMENTED_FRAMEWORK_EVENT") {
                                    // This is a known Dubhe framework event that is whitelisted
                                    // but not yet fully implemented in the indexer.
                                    log::warn!("  ⚠️ {}", msg);
                                } else {
                                    // BCS deserialization failure — expected for events emitted by
                                    // other DApps' dubhe_events modules (e.g. older framework
                                    // versions). They pose no data-integrity risk; the dapp_key
                                    // check below would reject them anyway.
                                    log::debug!(
                                        "  skip event {}: bcs parse failed (likely another dapp): {}",
                                        short_name,
                                        e
                                    );
                                }
                                continue;
                            }
                        };
                    log::info!("  📋 parsed table_id={}", parsed_event.table_id());
                    let table_name = parsed_event.table_id().to_string();
                    let mut proto_struct = if parsed_event.is_schema_backed_store_event() {
                        if let Err(e) = self.dubhe_config.can_convert_event_to_sql(&parsed_event) {
                            log::warn!(
                                "  ⚠️ skip event (can_convert_event_to_sql): table_id={} err={}",
                                parsed_event.table_id(),
                                e
                            );
                            continue;
                        }
                        // Schema-backed events also need dapp_key filtering so that a shared
                        // indexer instance only writes rows that belong to the configured DApp.
                        // (e.g. dapp_fee_state is DApp-specific, not a global framework table)
                        if parsed_event.dapp_key() != self.dubhe_config.dapp_key {
                            log::debug!(
                                "  ⏭️ skip schema-backed event from other dapp: table={} dapp_key={} expected={}",
                                parsed_event.table_id(),
                                parsed_event.dapp_key(),
                                self.dubhe_config.dapp_key
                            );
                            continue;
                        }
                        self.dubhe_config
                            .convert_event_to_proto_struct(&parsed_event)?
                    } else {
                        prost_types::Struct {
                            fields: std::collections::BTreeMap::new(),
                        }
                    };

                    // proto_struct append updated_at_timestamp_ms, last_update_digest and is_deleted
                    proto_struct.fields.insert(
                        "updated_at_timestamp_ms".to_string(),
                        Value {
                            kind: Some(prost_types::value::Kind::StringValue(
                                timestamp_ms.to_string(),
                            )),
                        },
                    );
                    proto_struct.fields.insert(
                        "last_update_digest".to_string(),
                        Value {
                            kind: Some(prost_types::value::Kind::StringValue(
                                current_digest.clone(),
                            )),
                        },
                    );
                    proto_struct.fields.insert(
                        "is_deleted".to_string(),
                        Value {
                            kind: Some(prost_types::value::Kind::BoolValue(false)),
                        },
                    );

                    let sql = if parsed_event.is_schema_backed_store_event() {
                        self.dubhe_config.convert_event_to_sql(
                            parsed_event,
                            timestamp_ms,
                            current_digest.clone(),
                        )?
                    } else {
                        // Non-schema-backed system events (marketplace, sessions, user_storages,
                        // dapp_fee_state, dapp_revenue_state, etc.) are filtered by dapp_key here.
                        // Schema-backed events (Dubhe_Store_SetRecord, etc.) are filtered above
                        // in the is_schema_backed_store_event branch.
                        if parsed_event.dapp_key() != self.dubhe_config.dapp_key {
                            log::debug!(
                                "  ⏭️ skip system event from other dapp: dapp_key={} expected={}",
                                parsed_event.dapp_key(),
                                self.dubhe_config.dapp_key
                            );
                            continue;
                        }
                        parsed_event.convert_indexer_event_to_sql(
                            timestamp_ms,
                            &current_digest,
                            event_seq as u64,
                        )?
                    };

                    // Notify GRPC subscribers only after dapp_key has been verified.
                    let subscribers = self.grpc_subscribers.clone();
                    let table_name_for_send = table_name.clone();
                    tokio::spawn(async move {
                        let table_change = dubhe_indexer_grpc::types::TableChange {
                            table_id: table_name_for_send.clone(),
                            data: Some(proto_struct),
                        };
                        let subscribers = subscribers.read().await;
                        if let Some(senders) = subscribers.get(&table_name_for_send) {
                            for sender in senders {
                                let _ = sender.send(table_change.clone());
                            }
                        }
                    });
                    log::info!(
                        "  ✅ indexed table={} digest={}",
                        table_name,
                        current_digest
                    );
                    parsed_events.push(sql);
                }
            }
        }
        // Always log a summary at info so we can see why no data is indexed
        if total_events == 0 && num_tx > 0 {
            // System transactions (genesis, epoch change, gas, etc.) carry no Dubhe events.
            // This is expected for early checkpoints and is not an error.
            log::debug!(
                "  checkpoint seq={}: {} tx, no Dubhe events (system transactions)",
                seq,
                num_tx
            );
        } else {
            log::info!(
                "  checkpoint seq={}: total_events={} dubhe_matched={} sql_count={}",
                seq,
                total_events,
                dubhe_events_seen,
                parsed_events.len()
            );
        }

        Ok(parsed_events)
    }
}
// docs::/#processor
// docs::#handler
use diesel_async::RunQueryDsl;
use sui_indexer_alt_framework::{
    pipeline::sequential::Handler,
    postgres::{Connection, Db},
};

#[async_trait::async_trait]
impl Handler for DubheEventHandler {
    type Store = Db;
    type Batch = Vec<Self::Value>;

    fn batch(&self, batch: &mut Self::Batch, values: std::vec::IntoIter<Self::Value>) {
        batch.extend(values);
    }

    async fn commit<'a>(&self, batch: &Self::Batch, conn: &mut Connection<'a>) -> Result<usize> {
        let n = batch.len();
        if n > 0 {
            log::info!("🔄 commit: executing {} SQL statement(s)", n);
        }
        for sql in batch {
            log::debug!("  SQL: {}", sql);
            diesel::sql_query(sql).execute(conn).await?;
        }
        Ok(0)
    }
}
