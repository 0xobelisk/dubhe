// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// docs::#processordeps
use anyhow::Result;
use dubhe_common::DubheConfig;
use dubhe_common::Event;
use dubhe_indexer_graphql::TableChange;
use dubhe_indexer_grpc::types::TableChange as GrpcTableChange;
use std::collections::HashMap;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_types::effects::TransactionEffectsAPI;
use sui_types::full_checkpoint_content::Checkpoint;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use prost_types::Value;

pub type GrpcSubscribers =
    Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<GrpcTableChange>>>>>;
pub type GraphQLSubscribers = Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>;

pub struct DubheEventHandler {
    pub dubhe_config: DubheConfig,
    pub grpc_subscribers: GrpcSubscribers,
    pub graphql_subscribers: GraphQLSubscribers,
}

impl DubheEventHandler {
    pub fn new(
        dubhe_config: DubheConfig,
        grpc_subscribers: GrpcSubscribers,
        graphql_subscribers: GraphQLSubscribers,
    ) -> Self {
        Self {
            dubhe_config,
            grpc_subscribers,
            graphql_subscribers,
        }
    }
}

/// Event type short names emitted by the Dubhe framework (module dubhe_events).
const DUBHE_EVENT_SET_RECORD: &str = "Dubhe_Store_SetRecord";
const DUBHE_EVENT_SET_FIELD: &str = "Dubhe_Store_SetField";
const DUBHE_EVENT_DELETE_RECORD: &str = "Dubhe_Store_DeleteRecord";

/// Extract short struct name from a full Sui event type (StructTag).
/// e.g. "0x123::dubhe_events::Dubhe_Store_SetRecord" -> "Dubhe_Store_SetRecord"
fn event_type_short_name(full_type: &str) -> &str {
    full_type.rsplit("::").next().unwrap_or(full_type)
}

fn is_dubhe_store_event(short_name: &str) -> bool {
    short_name == DUBHE_EVENT_SET_RECORD
        || short_name == DUBHE_EVENT_SET_FIELD
        || short_name == DUBHE_EVENT_DELETE_RECORD
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
            if count > 0 {
                log::info!("  tx {} has {} events", current_digest, count);
            }
            for event in &events_ref.data {
                let type_str = event.type_.name.to_string();
                let short_name = event_type_short_name(&type_str);
                if is_dubhe_store_event(short_name) {
                    dubhe_events_seen += 1;
                    log::info!(
                        "  🎯 dubhe event type={} table (after parse) will be checked",
                        short_name
                    );
                    let parsed_event = match Event::from_bytes(short_name, event.contents.as_slice())
                    {
                        Ok(e) => e,
                        Err(e) => {
                            log::warn!("  ⚠️ failed to parse event {}: {}", short_name, e);
                            continue;
                        }
                    };
                    log::info!("  📋 parsed table_id={}", parsed_event.table_id());
                    if let Err(e) = self.dubhe_config.can_convert_event_to_sql(&parsed_event) {
                        log::warn!(
                            "  ⚠️ skip event (can_convert_event_to_sql): table_id={} err={}",
                            parsed_event.table_id(),
                            e
                        );
                        continue;
                    }
                            let table_name = parsed_event.table_id().to_string();
                            let mut proto_struct = self
                                .dubhe_config
                                .convert_event_to_proto_struct(&parsed_event)?;

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

                            // Spawn async task to send update without blocking
                            let subscribers = self.grpc_subscribers.clone();
                            let table_name_for_send = table_name.clone();
                            tokio::spawn(async move {
                                let table_change = dubhe_indexer_grpc::types::TableChange {
                                    table_id: table_name_for_send.clone(),
                                    data: Some(proto_struct),
                                };

                                // Send to GRPC subscribers
                                let subscribers = subscribers.read().await;
                                if let Some(senders) = subscribers.get(&table_name_for_send) {
                                    for sender in senders {
                                        let _ = sender.send(table_change.clone());
                                    }
                                }
                            });

                            let sql = self.dubhe_config.convert_event_to_sql(
                                parsed_event,
                                timestamp_ms,
                                current_digest.clone(),
                            )?;
                            log::info!("  ✅ indexed table={} digest={}", table_name, current_digest);
                            parsed_events.push(sql);
                    }
                    // if event.type_.name.to_string() == "Dubhe_Store_SetRecord" {
                    //     let set_record: StoreSetRecord =
                    //         bcs::from_bytes(event.contents.as_slice())
                    //             .expect("Failed to parse set record");

                    //     let expect_dapp_key = format!("{}::dapp_key::DappKey", self.origin_package_id);
                    //     let event_dapp_key = format!("0x{}", set_record.dapp_key);
                    //     if  expect_dapp_key == event_dapp_key {
                    //         println!("Set record: {:?}", set_record);

                    //         // Process StoreSetRecord event
                    //         let (table_name, values) = set_record.parse(&self.tables)?;

                    //         let table_change = dubhe_indexer_grpc::types::TableChange {
                    //             table_id: table_name.clone(),
                    //             data: Some(dubhe_common::into_google_protobuf_struct(values.clone())),
                    //         };
                    //         parsed_events.push(values);

                    //         println!("📤 Sending table change to GRPC subscriber: {:?}", table_name);
                    //         println!("📤 Sending table change to GRPC subscriber: {:?}", table_change);

                    //         // Spawn async task to send update without blocking
                    //         let subscribers = self.grpc_subscribers.clone();
                    //         let graphql_subscribers = self.graphql_subscribers.clone();
                    //         let table_name_clone = table_name.clone();
                    //         tokio::spawn(async move {
                    //             // Send to GRPC subscribers
                    //             let subscribers = subscribers.read().await;
                    //             println!("📤 Subscribers: {:?}", subscribers);
                    //             if let Some(senders) = subscribers.get(&table_name_clone) {
                    //                 for sender in senders {
                    //                     println!("📤 Sending table change to GRPC subscriber: {:?}", table_name_clone);
                    //                     let _ = sender.send(table_change.clone());
                    //                 }
                    //             }

                    //             // Send to GraphQL subscribers
                    //             // let graphql_subscribers = graphql_subscribers.read().await;
                    //             // if let Some(senders) = graphql_subscribers.get(&table_name_clone) {
                    //             //     let table_change = TableChange {
                    //             //         id: Uuid::new_v4().to_string(),
                    //             //         table_name: table_name_clone.clone(),
                    //             //         operation: "INSERT".to_string(),
                    //             //         timestamp: chrono::Utc::now().to_rfc3339(),
                    //             //         data: serde_json::json!({
                    //             //             "table_id": table_name_clone,
                    //             //             "operation": "INSERT",
                    //             //             "checkpoint": update.checkpoint,
                    //             //             "timestamp": update.timestamp,
                    //             //             "fields": update.data.as_ref().map(|data| {
                    //             //                 data.fields.iter().map(|(k, v)| (k.clone(), v.clone())).collect::<HashMap<String, String>>()
                    //             //             }),
                    //             //         }),
                    //             //     };
                    //             //     for sender in senders {
                    //             //         println!("📤 Sending table change to GraphQL subscriber: {:?}", table_name_clone);
                    //             //         let result = sender.send(table_change.clone());
                    //             //         if result.is_err() {
                    //             //             println!("❌ Failed to send table change to GraphQL subscriber: {:?}", result.err());
                    //             //         } else {
                    //             //             println!("✅ Successfully sent table change to GraphQL subscriber");
                    //             //         }
                    //             //     }
                    //             // }
                    //         });

                    //         // Insert data into database after sending to subscribers
                    //         // self.database.insert(&table_name, values, current_checkpoint).await?;

                    //         // set_record_count += 1;
                    //     }
                    // }

                    // if event.type_.name.to_string() == "Dubhe_Store_SetField" {
                    //     let set_field: StoreSetField =
                    //         bcs::from_bytes(event.contents.as_slice())
                    //             .expect("Failed to parse set field");
                    //     let expect_dapp_key = format!("{}::dapp_key::DappKey", self.origin_package_id);
                    //     let event_dapp_key = format!("0x{}", set_field.dapp_key);
                    //     if  expect_dapp_key == event_dapp_key {
                    //         println!("Set field: {:?}", set_field);
                    //         // Process StoreSetField event
                    //         // self.handle_store_set_field(current_checkpoint, &set_field)
                    //          //     .await?;
                    //         // set_field_count += 1;
                    //     }
                    // }

                    // if event.type_.name.to_string() == "Dubhe_Store_DeleteRecord" {
                    //     let delete_record: StoreDeleteRecord =
                    //         bcs::from_bytes(event.contents.as_slice())
                    //             .expect("Failed to parse delete record");
                    //     let expect_dapp_key = format!("{}::dapp_key::DappKey", self.origin_package_id);
                    //     let event_dapp_key = format!("0x{}", delete_record.dapp_key);
                    //     if  expect_dapp_key == event_dapp_key {
                    //         println!("Delete record: {:?}", delete_record);
                    //         // Process StoreDeleteRecord event
                    //         // self.handle_store_delete_record(current_checkpoint, &delete_record)
                    //         //     .await?;
                    //     }
                    // }
                }
            }

        // Always log a summary at info so we can see why no data is indexed
        if total_events == 0 && num_tx > 0 {
            // System transactions (genesis, epoch change, gas, etc.) carry no Dubhe events.
            // This is expected for early checkpoints and is not an error.
            log::debug!(
                "  checkpoint seq={}: {} tx, no Dubhe events (system transactions)",
                seq, num_tx
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
