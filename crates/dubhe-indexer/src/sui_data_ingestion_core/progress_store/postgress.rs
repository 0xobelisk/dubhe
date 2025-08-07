// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::db::PgConnectionPool;
use crate::sui_data_ingestion_core::progress_store::ProgressStore;
use anyhow::Result;
use async_trait::async_trait;
use diesel::QueryableByName;
use diesel_async::RunQueryDsl;
use serde_json::{Number, Value};
use std::path::PathBuf;
use sui_types::messages_checkpoint::CheckpointSequenceNumber;

#[derive(QueryableByName)]
struct CheckpointResult {
    #[diesel(sql_type = diesel::sql_types::Bigint)]
    last_indexed_checkpoint: i64,
    #[diesel(sql_type = diesel::sql_types::Bigint)]
    end_checkpoint: i64,
}

pub struct PostgressProgressStore {
    pg_pool: PgConnectionPool,
}

impl PostgressProgressStore {
    pub fn new(pg_pool: PgConnectionPool) -> Self {
        Self { pg_pool }
    }
}

#[async_trait]
impl ProgressStore for PostgressProgressStore {
    async fn load(&mut self, task_name: String) -> Result<CheckpointSequenceNumber> {
        let mut conn = self.pg_pool.get().await?;

        let result: CheckpointResult = diesel::sql_query(
            "SELECT last_indexed_checkpoint, end_checkpoint FROM reader_progress WHERE progress_name = $1"
            )
            .bind::<diesel::sql_types::Text, _>(&task_name)
            .get_result(&mut conn)
            .await?;

        if task_name != "latest_reader_progress" {
            if result.last_indexed_checkpoint as u64 > result.end_checkpoint as u64 {
                return Err(anyhow::anyhow!(
                    "Task {} has reached its end checkpoint",
                    task_name
                ));
            }
            println!(
                "========================== result.last_indexed_checkpoint: {}",
                result.last_indexed_checkpoint
            );
        }

        Ok(result.last_indexed_checkpoint as u64)
    }

    async fn save(
        &mut self,
        task_name: String,
        checkpoint_number: CheckpointSequenceNumber,
    ) -> Result<()> {
        let mut conn = self.pg_pool.get().await?;

        let result: CheckpointResult = diesel::sql_query(
            "SELECT last_indexed_checkpoint, end_checkpoint FROM reader_progress WHERE progress_name = $1"
        )
        .bind::<diesel::sql_types::Text, _>(&task_name)
        .get_result(&mut conn)
        .await?;

        if task_name != "latest_reader_progress"
            && checkpoint_number >= result.end_checkpoint as u64
        {
            return Err(anyhow::anyhow!(
                "Task {} has reached its end checkpoint",
                task_name
            ));
        }

        diesel::sql_query(
            "UPDATE reader_progress SET last_indexed_checkpoint = $2 WHERE progress_name = $1",
        )
        .bind::<diesel::sql_types::Text, _>(task_name)
        .bind::<diesel::sql_types::Bigint, _>(checkpoint_number as i64)
        .execute(&mut conn)
        .await?;

        Ok(())
    }
}
