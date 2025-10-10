// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// docs::#processordeps
use anyhow::Result;
use dubhe_common::DBData;
use dubhe_common::DubheConfig;
use dubhe_common::Event;
use dubhe_common::PostgresStorage;
use dubhe_common::{
    Database, EventParser, StoreDeleteRecord, StoreSetField, StoreSetRecord, TableMetadata,
};
use dubhe_indexer_graphql::TableChange;
use dubhe_indexer_grpc::types::TableChange as GrpcTableChange;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use sui_indexer_alt_framework::{
    pipeline::Processor, types::full_checkpoint_content::CheckpointData,
};
use sui_types::base_types::ObjectID;
use sui_types::message_envelope::Message;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

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

// docs::#processor
impl Processor for DubheEventHandler {
    const NAME: &'static str = "dubhe_event_handler";

    type Value = String;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> Result<Vec<Self::Value>> {
        let current_checkpoint = checkpoint.checkpoint_summary.sequence_number;
        println!("current_checkpoint: {:?}", current_checkpoint);
        let current_checkpoint = checkpoint.checkpoint_summary.timestamp_ms;
        let mut parsed_events = Vec::new();
        for transaction in &checkpoint.transactions {
            let current_digest = transaction.transaction.digest().base58_encode().clone();
            let maybe_events = &transaction.events;
            if let Some(events) = maybe_events {
                println!("current_digest: {:?}", current_digest);
                for event in &events.data {
                    if event.type_.name.to_string() == "Dubhe_Store_SetRecord"
                        || event.type_.name.to_string() == "Dubhe_Store_SetField"
                        || event.type_.name.to_string() == "Dubhe_Store_DeleteRecord"
                    {
                        let parsed_event = Event::from_bytes(
                            event.type_.name.as_str(),
                            event.contents.as_slice(),
                        )?;
                        if self
                            .dubhe_config
                            .can_convert_event_to_sql(&parsed_event)
                            .is_ok()
                        {
                            let table_name = parsed_event.table_id().to_string();
                            let proto_struct = self
                                .dubhe_config
                                .convert_event_to_proto_struct(&parsed_event)?;

                            // Spawn async task to send update without blocking
                            let subscribers = self.grpc_subscribers.clone();
                            tokio::spawn(async move {
                                let table_change = dubhe_indexer_grpc::types::TableChange {
                                    table_id: table_name.clone(),
                                    data: Some(proto_struct),
                                };

                                // Send to GRPC subscribers
                                let subscribers = subscribers.read().await;
                                println!("📤 Subscribers: {:?}", subscribers);
                                if let Some(senders) = subscribers.get(&table_name) {
                                    for sender in senders {
                                        println!(
                                            "📤 Sending table change to GRPC subscriber: {:?}",
                                            table_name
                                        );
                                        let _ = sender.send(table_change.clone());
                                    }
                                }
                            });

                            let sql = self.dubhe_config.convert_event_to_sql(
                                parsed_event,
                                current_checkpoint,
                                current_digest.clone(),
                            )?;
                            parsed_events.push(sql);
                        }
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

    fn batch(batch: &mut Self::Batch, values: Vec<Self::Value>) {
        println!("🔄 Batching values: {:?}", values);
        batch.extend(values);
    }

    async fn commit<'a>(batch: &Self::Batch, conn: &mut Connection<'a>) -> Result<usize> {
        for sql in batch {
            println!("🔄 Executing SQL: {}", sql);
            diesel::sql_query(sql).execute(conn).await?;
        }
        Ok(0)
    }
}
