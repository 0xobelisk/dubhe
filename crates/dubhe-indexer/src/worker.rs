use crate::config::DubheConfig;
use crate::sui_data_ingestion_core::Worker;
use anyhow::Result;
use async_trait::async_trait;
use bcs;
use notify::event;
use serde_json::Value;
use sui_types::full_checkpoint_content::CheckpointData;
use std::str::FromStr;
use sui_types::base_types::ObjectID;

use dubhe_common::{Database, EventParser, StoreDeleteRecord, StoreSetField, StoreSetRecord, TableMetadata};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use dubhe_indexer_api::types::{TableUpdate, TableRow};

pub type TableSubscribers = Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableUpdate>>>>>;

pub struct DubheIndexerWorker {
    pub config: DubheConfig,
    pub tables: Vec<TableMetadata>,
    pub with_graphql: bool,
    pub database: Database,
    pub subscribers: TableSubscribers,
}

impl DubheIndexerWorker {
    pub async fn new(config: DubheConfig, tables: Vec<TableMetadata>, with_graphql: bool, subscribers: TableSubscribers) -> Result<Self> {
        let database = Database::new(&config.database.url).await?;
        
        Ok(Self {
            config,
            tables,
            with_graphql,
            database,
            subscribers,
        })
    }
    // pub async fn clear_all_data(&self) -> Result<()> {
    //     let mut conn = self.pg_pool.get().await?;

    //     println!("🔄 Clearing all indexer data...");

    //     // Get all store tables
    //     #[derive(QueryableByName)]
    //     struct TableName {
    //         #[diesel(sql_type = Text)]
    //         table_name: String,
    //     }

    //     let tables: Vec<String> = diesel::sql_query(
    //         "SELECT table_name FROM information_schema.tables 
    //          WHERE table_schema = 'public' AND table_name LIKE 'store_%'",
    //     )
    //     .load::<TableName>(&mut conn)
    //     .await?
    //     .into_iter()
    //     .map(|t| t.table_name)
    //     .collect();

    //     // Drop triggers for all store tables first
    //     for table_name in &tables {
    //         let trigger_name = format!("_unified_realtime_{}", table_name);
    //         let sql = format!(
    //             "DROP TRIGGER IF EXISTS {} ON {} CASCADE",
    //             trigger_name, table_name
    //         );
    //         println!("  ├─ Dropping trigger: {}", trigger_name);
    //         diesel::sql_query(&sql).execute(&mut conn).await?;
    //     }

    //     // Drop all store tables
    //     for table_name in tables {
    //         let sql = format!("DROP TABLE IF EXISTS {} CASCADE", table_name);
    //         println!("  ├─ Dropping table: {}", table_name);
    //         diesel::sql_query(&sql).execute(&mut conn).await?;
    //     }

    //     // Drop functions
    //     let functions = vec!["simple_change_log", "unified_realtime_notify"];

    //     for function_name in functions {
    //         let sql = format!("DROP FUNCTION IF EXISTS {}() CASCADE", function_name);
    //         println!("  ├─ Dropping function: {}", function_name);
    //         diesel::sql_query(&sql).execute(&mut conn).await?;
    //     }

    //     // Clear metadata tables (excluding simple_logs as it doesn't exist)
    //     let metadata_tables = vec!["table_metadata", "table_fields", "reader_progress"];

    //     for table_name in metadata_tables {
    //         let sql = format!("DROP TABLE IF EXISTS {} CASCADE", table_name);
    //         println!("  ├─ Dropping table: {}", table_name);
    //         diesel::sql_query(&sql).execute(&mut conn).await?;
    //     }

    //     println!("  └─ All indexer data cleared successfully");
    //     Ok(())
    // }

    // pub async fn create_db_tables_from_config(&mut self) -> Result<()> {
    //     println!("Tables: {:?}", self.tables);
    //     let mut conn = self.pg_pool.get().await?;

    //     // Create table_metadata table first
    //     diesel::sql_query(
    //         "CREATE TABLE IF NOT EXISTS table_metadata (
    //             table_name VARCHAR(255),
    //             table_type VARCHAR(255),
    //             offchain BOOLEAN,
    //             PRIMARY KEY (table_name)
    //         )",
    //     )
    //     .execute(&mut conn)
    //     .await?;

    //     // Create table_fields table first
    //     diesel::sql_query(
    //         "CREATE TABLE IF NOT EXISTS table_fields (
    //             table_name VARCHAR(255),
    //             field_name VARCHAR(255),
    //             field_type VARCHAR(50),
    //             field_index INTEGER,
    //             is_key BOOLEAN,
    //             PRIMARY KEY (table_name, field_name)
    //         )",
    //     )
    //     .execute(&mut conn)
    //     .await?;

    //     // Delete all data from all tables
    //     diesel::sql_query("DELETE FROM table_metadata")
    //         .execute(&mut conn)
    //         .await?;
    //     diesel::sql_query("DELETE FROM table_fields")
    //         .execute(&mut conn)
    //         .await?;

    //     for table in &self.tables {
    //         println!("Creating table: {:?}", table);

    //         // Create store table
    //         diesel::sql_query(&table.generate_create_table_sql())
    //             .execute(&mut conn)
    //             .await?;

    //         // Insert table metadata
    //         diesel::sql_query(&table.generate_insert_table_metadata_sql())
    //             .execute(&mut conn)
    //             .await?;

    //         // Insert table fields metadata
    //         for field_sql in table.generate_insert_table_fields_sql() {
    //             diesel::sql_query(&field_sql).execute(&mut conn).await?;
    //         }
    //     }

    //     Ok(())
    // }

    // pub async fn create_reader_progress_db_table(
    //     &self,
    //     start_checkpoint: u64,
    //     latest_checkpoint: u64,
    //     worker_pool_number: u32,
    // ) -> Result<()> {
    //     let mut conn = self.pg_pool.get().await?;

    //     diesel::sql_query(
    //         "CREATE TABLE IF NOT EXISTS reader_progress (
    //             progress_name VARCHAR(255),
    //             start_checkpoint BIGINT,
    //             end_checkpoint BIGINT,
    //             last_indexed_checkpoint BIGINT,
    //             PRIMARY KEY (progress_name)
    //         )",
    //     )
    //     .execute(&mut conn)
    //     .await?;

    //     // Check if reader_progress table has data
    //     #[derive(QueryableByName)]
    //     struct DataExists {
    //         #[diesel(sql_type = Bool)]
    //         exists: bool,
    //     }

    //     let data_exists: DataExists =
    //         diesel::sql_query("SELECT EXISTS (SELECT 1 FROM reader_progress) as exists")
    //             .get_result(&mut conn)
    //             .await?;

    //     println!("data_exists: {:?}", data_exists.exists);
    //     if !data_exists.exists {
    //         println!("reader_progress table has no data, insert it");
    //         diesel::sql_query(
    //             "INSERT INTO reader_progress (progress_name, start_checkpoint, end_checkpoint, last_indexed_checkpoint) 
    //              VALUES ($1, $2, $3, $4)
    //              ON CONFLICT (progress_name) 
    //              DO UPDATE SET start_checkpoint = $2, end_checkpoint = $3, last_indexed_checkpoint = $4"
    //         )
    //         .bind::<diesel::sql_types::Text, _>("latest_reader_progress")
    //         .bind::<diesel::sql_types::Bigint, _>(0 as i64)
    //         .bind::<diesel::sql_types::Bigint, _>(0 as i64)
    //         .bind::<diesel::sql_types::Bigint, _>(start_checkpoint as i64)
    //         .execute(&mut conn)
    //         .await?;
    //     }

    //     // TODO: Split checkpoints into worker_pool_number parts
    //     // let total_checkpoints = latest_checkpoint - start_checkpoint + 1;
    //     // let checkpoints_per_worker = total_checkpoints / worker_pool_number as u64;
    //     // let remainder = total_checkpoints % worker_pool_number as u64;

    //     // for i in 0..worker_pool_number {
    //     //     let worker_start = start_checkpoint + (i as u64 * checkpoints_per_worker);
    //     //     let worker_end = if i == worker_pool_number - 1 {
    //     //         // Last worker handles remaining checkpoints
    //     //         end_checkpoint
    //     //     } else {
    //     //         worker_start + checkpoints_per_worker - 1
    //     //     };

    //     //     let progress_name = format!("task_{}", i);
    //     //     diesel::sql_query(
    //     //         "INSERT INTO reader_progress (progress_name, start_checkpoint, end_checkpoint, last_indexed_checkpoint)
    //     //          VALUES ($1, $2, $3, $4)
    //     //          ON CONFLICT (progress_name)
    //     //          DO UPDATE SET start_checkpoint = $2, end_checkpoint = $3, last_indexed_checkpoint = $4"
    //     //     )
    //     //     .bind::<diesel::sql_types::Text, _>(progress_name)
    //     //     .bind::<diesel::sql_types::Bigint, _>(worker_start as i64)
    //     //     .bind::<diesel::sql_types::Bigint, _>(worker_end as i64)
    //     //     .bind::<diesel::sql_types::Bigint, _>(worker_start as i64)
    //     //     .execute(&mut conn)
    //     //     .await?;
    //     // }

    //     Ok(())
    // }

    // pub async fn handle_store_set_record(
    //     &self,
    //     current_checkpoint: u64,
    //     set_record: &StoreSetRecord,
    // ) -> Result<()> {
    //     let mut conn = self.pg_pool.get().await?;
    //     let table_name = set_record.table_id.clone();
    //     println!("Table name: {}", table_name);

    //     // Get table field information from database
    //     let table_metadata = self
    //         .tables
    //         .iter()
    //         .find(|t| t.name == table_name)
    //         .expect("Table not found");

    //     // Separate key and value fields
    //     let mut key_fields = Vec::new();
    //     let mut value_fields = Vec::new();

    //     for field in &table_metadata.fields {
    //         if field.is_key {
    //             key_fields.push((field.field_name.clone(), field.field_type.clone()));
    //         } else {
    //             value_fields.push((field.field_name.clone(), field.field_type.clone()));
    //         }
    //     }
    //     // Parse key and value
    //     let mut key_values = table_metadata.parse_table_keys(set_record.key_tuple.clone());
    //     let mut value_values = table_metadata.parse_table_values(set_record.value_tuple.clone());

    //     println!("table_metadata enums: {:?}", table_metadata.enums);
    //     table_metadata.fields.iter().for_each(|field| {
    //         if field.is_enum && field.is_key {
    //             let value = key_values.get(&field.field_name).unwrap();
    //             let value_u64 = value.as_u64().unwrap();
    //             println!("field: {:?}", field);
    //             println!("value_u64: {:?}", value_u64);
    //             let enum_value = table_metadata.get_enum_value(&field.field_type, value_u64);
    //             key_values[&field.field_name] = json!(&enum_value);
    //         }
    //         if field.is_enum && !field.is_key {
    //             let value = value_values.get(&field.field_name).unwrap();
    //             let value_u64 = value.as_u64().unwrap();
    //             println!("value_u64: {:?}", value_u64);
    //             let enum_value = table_metadata.get_enum_value(&field.field_type, value_u64);
    //             value_values[&field.field_name] = json!(&enum_value);
    //         }
    //     });

    //     println!("Key values: {:?}", key_values);
    //     println!("Value values: {:?}", value_values);

    //     // Generate and execute SQL
    //     let sql = generate_set_record_sql(
    //         current_checkpoint,
    //         &table_name,
    //         &key_fields,
    //         &value_fields,
    //         &key_values,
    //         &value_values,
    //     );

    //     println!("Final SQL: {}", sql);

    //     // Execute SQL with proper error handling
    //     match diesel::sql_query(&sql).execute(&mut conn).await {
    //         Ok(rows_affected) => {
    //             println!(
    //                 "Successfully executed SQL, rows affected: {}",
    //                 rows_affected
    //             );
    //         }
    //         Err(e) => {
    //             eprintln!("Error executing SQL: {:?}", e);
    //             eprintln!("Failed SQL: {}", sql);
    //             // Return the error instead of continuing
    //             return Err(e.into());
    //         }
    //     }

    //     Ok(())
    // }

    // pub async fn handle_store_set_field(
    //     &self,
    //     current_checkpoint: u64,
    //     set_field: &StoreSetField,
    // ) -> Result<()> {
    //     let mut conn = self.pg_pool.get().await?;
    //     let table_name = set_field.table_id.clone();
    //     println!("Table name: {}", table_name);

    //     // Get table field information from database
    //     let table_metadata = self
    //         .tables
    //         .iter()
    //         .find(|t| t.name == table_name)
    //         .expect("Table not found");

    //     // Separate key and value fields
    //     let mut key_fields = Vec::new();
    //     let mut field_name = String::new();
    //     let mut field_type = String::new();

    //     for field in &table_metadata.fields {
    //         if field.is_key {
    //             key_fields.push((field.field_name.clone(), field.field_type.clone()));
    //         }
    //         if field.field_index == set_field.field_index {
    //             field_name = field.field_name.clone();
    //             field_type = field.field_type.clone();
    //         }
    //         println!("field: {:?}", field);
    //     }

    //     println!("field_name: {:?}", field_name);
    //     println!("field_type: {:?}", field_type);

    //     // Parse key
    //     let key_values = table_metadata.parse_table_keys(set_field.key_tuple.clone());

    //     // Parse value to be updated
    //     let value_json = table_metadata.parse_table_field(
    //         &field_name.as_bytes().to_vec(),
    //         &field_type.as_bytes().to_vec(),
    //         &set_field.value,
    //     );
    //     let mut value = value_json.get(&field_name).unwrap().clone();
    //     println!("value: {:?}", value);

    //     println!("table_metadata enums: {:?}", table_metadata.enums);
    //     table_metadata.fields.iter().for_each(|field| {
    //         if field.is_enum && !field.is_key {
    //             let value_u64 = value.as_u64().unwrap();
    //             println!("value_u64: {:?}", value_u64);
    //             let enum_value = table_metadata.get_enum_value(&field.field_type, value_u64);
    //             value = json!(&enum_value);
    //         }
    //     });

    //     // Generate and execute SQL
    //     let sql = generate_set_field_sql(
    //         current_checkpoint,
    //         &table_name,
    //         &field_name,
    //         &field_type,
    //         &value,
    //         &key_fields,
    //         &key_values,
    //     );

    //     println!("Update SQL: {}", sql);

    //     // Execute SQL with proper error handling
    //     match diesel::sql_query(&sql).execute(&mut conn).await {
    //         Ok(rows_affected) => {
    //             println!(
    //                 "Successfully executed update SQL, rows affected: {}",
    //                 rows_affected
    //             );
    //         }
    //         Err(e) => {
    //             eprintln!("Error executing update SQL: {:?}", e);
    //             eprintln!("Failed SQL: {}", sql);
    //             // Return the error instead of continuing
    //             return Err(e.into());
    //         }
    //     }
    //     Ok(())
    // }

    // pub async fn handle_store_delete_record(
    //     &self,
    //     current_checkpoint: u64,
    //     delete_record: &StoreDeleteRecord,
    // ) -> Result<()> {
    //     let mut conn = self.pg_pool.get().await?;
    //     let table_name = delete_record.table_id.clone();
    //     println!("Table name: {}", table_name);

    //     let mut key_fields = Vec::new();

    //     // Get table field information from database
    //     let table_metadata = self
    //         .tables
    //         .iter()
    //         .find(|t| t.name == table_name)
    //         .expect("Table not found");

    //     for field in &table_metadata.fields {
    //         if field.is_key {
    //             key_fields.push((field.field_name.clone(), field.field_type.clone()));
    //         }
    //     }

    //     let key_values = table_metadata.parse_table_keys(delete_record.key_tuple.clone());

    //     // Generate and execute SQL
    //     let sql = generate_delete_record_sql(
    //         &table_name,
    //         current_checkpoint,
    //         &key_fields,
    //         &key_values,
    //     );

    //     println!("Delete SQL: {}", sql);

    //     // Execute SQL with proper error handling
    //     match diesel::sql_query(&sql).execute(&mut conn).await {
    //         Ok(rows_affected) => {
    //             println!(
    //                 "Successfully executed delete SQL, rows affected: {}",
    //                 rows_affected
    //             );
    //         }
    //         Err(e) => {
    //             eprintln!("Error executing delete SQL: {:?}", e);
    //             eprintln!("Failed SQL: {}", sql);
    //             // Return the error instead of continuing
    //             return Err(e.into());
    //         }
    //     }
    //     Ok(())
    // }
}

#[async_trait]
impl Worker for DubheIndexerWorker {
    type Result = ();
    async fn process_checkpoint(&self, checkpoint: &CheckpointData) -> Result<()> {
        let current_checkpoint = checkpoint.checkpoint_summary.sequence_number;
        println!("Processing current_checkpoint: {:?}", current_checkpoint);
        let mut set_record_count = 0;
        let mut set_field_count = 0;

        for transaction in &checkpoint.transactions {
            let maybe_events = &transaction.events;
            if let Some(events) = maybe_events {
                for event in &events.data {
                    if event.package_id == ObjectID::from_str(&self.config.sui.origin_package_id).unwrap() {
                        if event.type_.name.to_string() == "Dubhe_Store_SetRecord" {
                            let set_record: StoreSetRecord =
                                bcs::from_bytes(event.contents.as_slice())
                                    .expect("Failed to parse set record");

                            let expect_dapp_key = format!("{}::dapp_key::DappKey", self.config.sui.origin_package_id);
                            let event_dapp_key = format!("0x{}", set_record.dapp_key);
                            if  expect_dapp_key == event_dapp_key {
                                println!("Set record: {:?}", set_record);

                                // Process StoreSetRecord event
                                let (table_name, values) = set_record.parse(&self.tables)?;
                                
                                // Send update to subscribers first (non-blocking)
                                let mut fields = std::collections::HashMap::new();
                                for value in &values {
                                    fields.insert(value.column_name.clone(), value.column_value.to_string());
                                }
                                
                                let table_row = dubhe_indexer_api::types::TableRow {
                                    fields,
                                    created_at: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs() as i64,
                                    updated_at: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs() as i64,
                                    last_updated_checkpoint: current_checkpoint as i64,
                                };
                                
                                let update = TableUpdate {
                                    table_id: table_name.clone(),
                                    operation: "INSERT".to_string(),
                                    data: Some(table_row),
                                    checkpoint: current_checkpoint as i64,
                                    timestamp: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs() as i64,
                                };
                                
                                // Spawn async task to send update without blocking
                                let subscribers = self.subscribers.clone();
                                let table_name_clone = table_name.clone();
                                tokio::spawn(async move {
                                    let subscribers = subscribers.read().await;
                                    if let Some(senders) = subscribers.get(&table_name_clone) {
                                        for sender in senders {
                                            let _ = sender.send(update.clone());
                                        }
                                    }
                                });
                                
                                // Insert data into database after sending to subscribers
                                self.database.insert(&table_name, values, current_checkpoint).await?;
                                
                                set_record_count += 1;
                            }    
                        }

                        if event.type_.name.to_string() == "Dubhe_Store_SetField" {
                            let set_field: StoreSetField =
                                bcs::from_bytes(event.contents.as_slice())
                                    .expect("Failed to parse set field");
                            let expect_dapp_key = format!("{}::dapp_key::DappKey", self.config.sui.origin_package_id);
                            let event_dapp_key = format!("0x{}", set_field.dapp_key);
                            if  expect_dapp_key == event_dapp_key {
                                println!("Set field: {:?}", set_field);
                                // Process StoreSetField event
                                // self.handle_store_set_field(current_checkpoint, &set_field)
                                 //     .await?;
                                set_field_count += 1;
                            }
                        }

                        if event.type_.name.to_string() == "Dubhe_Store_DeleteRecord" {
                            let delete_record: StoreDeleteRecord =
                                bcs::from_bytes(event.contents.as_slice())
                                    .expect("Failed to parse delete record");
                            let expect_dapp_key = format!("{}::dapp_key::DappKey", self.config.sui.origin_package_id);
                            let event_dapp_key = format!("0x{}", delete_record.dapp_key);
                            if  expect_dapp_key == event_dapp_key {
                                println!("Delete record: {:?}", delete_record);
                                // Process StoreDeleteRecord event
                                // self.handle_store_delete_record(current_checkpoint, &delete_record)
                                //     .await?;
                            }
                        }
                    }
                }
            }
        }
        println!("Set record count: {:?}", set_record_count);
        println!("Set field count: {:?}", set_field_count);

        Ok(())
    }
}
