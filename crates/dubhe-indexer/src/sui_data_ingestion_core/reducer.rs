// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::sui_data_ingestion_core::{Reducer, Worker, MAX_CHECKPOINTS_IN_PROGRESS};
use anyhow::Result;
use async_trait::async_trait;
use futures::StreamExt;
use std::collections::HashMap;
use sui_types::messages_checkpoint::CheckpointSequenceNumber;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

pub(crate) async fn reduce<W: Worker>(
    task_name: String,
    mut current_checkpoint_number: CheckpointSequenceNumber,
    progress_receiver: mpsc::Receiver<(CheckpointSequenceNumber, W::Result)>,
    executor_progress_sender: mpsc::Sender<(String, CheckpointSequenceNumber)>,
    reducer: Option<Box<dyn Reducer<W::Result>>>,
) -> Result<()> {
    // convert to a stream of MAX size. This way, each iteration of the loop will process all ready messages
    let mut stream =
        ReceiverStream::new(progress_receiver).ready_chunks(MAX_CHECKPOINTS_IN_PROGRESS);
    let mut unprocessed = HashMap::new();
    let mut batch = vec![];
    let mut progress_update = None;

    while let Some(update_batch) = stream.next().await {
        for (checkpoint_number, message) in update_batch {
            unprocessed.insert(checkpoint_number, message);
        }
        while let Some(message) = unprocessed.remove(&current_checkpoint_number) {
            if let Some(ref reducer) = reducer {
                if reducer.should_close_batch(&batch, Some(&message)) {
                    commit_with_retry(reducer, std::mem::take(&mut batch)).await?;
                    batch = vec![message];
                    progress_update = Some(current_checkpoint_number);
                } else {
                    batch.push(message);
                }
            }
            current_checkpoint_number += 1;
        }
        match reducer {
            Some(ref reducer) => {
                if reducer.should_close_batch(&batch, None) {
                    commit_with_retry(reducer, std::mem::take(&mut batch)).await?;
                    progress_update = Some(current_checkpoint_number);
                }
            }
            None => progress_update = Some(current_checkpoint_number),
        }
        if let Some(watermark) = progress_update {
            executor_progress_sender
                .send((task_name.clone(), watermark))
                .await?;
            progress_update = None;
        }
    }
    Ok(())
}

async fn commit_with_retry<R: Send + Sync + Clone>(
    reducer: &dyn Reducer<R>,
    batch: Vec<R>,
) -> Result<()> {
    let backoff = backoff::ExponentialBackoff::default();
    backoff::future::retry(backoff, || async {
        reducer.commit(batch.clone()).await.map_err(|err| {
            eprintln!("transient reducer error {:?}", err);
            backoff::Error::transient(err)
        })
    })
    .await
}

#[async_trait]
impl<R> Reducer<R> for Box<dyn Reducer<R>>
where
    R: Send + Sync + Clone,
{
    async fn commit(&self, batch: Vec<R>) -> Result<()> {
        self.as_ref().commit(batch).await
    }

    fn should_close_batch(&self, batch: &[R], next_item: Option<&R>) -> bool {
        self.as_ref().should_close_batch(batch, next_item)
    }
}
