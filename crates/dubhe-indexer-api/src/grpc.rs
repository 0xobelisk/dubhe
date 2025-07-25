use tonic::{transport::Server, Request, Response, Status};
use tokio::sync::mpsc;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::types::dubhe_grpc_server::{DubheGrpc, DubheGrpcServer};
use crate::types::{
    QueryRequest, QueryResponse, SubscribeRequest,
    TableMetadataRequest, TableMetadataResponse, ListTablesRequest, ListTablesResponse,
    TableUpdate
};


pub type TableSubscribers = Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableUpdate>>>>>;

pub struct DubheGrpcService {
    subscribers: TableSubscribers,
}

impl DubheGrpcService {
    pub fn new(subscribers: TableSubscribers) -> Self {
        Self {
            subscribers,
        }
    }

    pub async fn broadcast_update(&self, table_id: &str, update: TableUpdate) {
        let subscribers = self.subscribers.read().await;
        if let Some(senders) = subscribers.get(table_id) {
            for sender in senders {
                let _ = sender.send(update.clone());
            }
        }
    }
}

#[tonic::async_trait]
impl DubheGrpc for DubheGrpcService {
    async fn query_data(
        &self,
        _request: Request<QueryRequest>,
    ) -> Result<Response<QueryResponse>, Status> {
        // TODO: Implement database query functionality
        // For now, return empty response
        let response = QueryResponse {
            rows: vec![],
            total_count: 0,
            success: false,
            error_message: "Query functionality not implemented yet".to_string(),
        };
        Ok(Response::new(response))
    }

    type SubscribeToTableStream = tokio_stream::wrappers::ReceiverStream<Result<TableUpdate, Status>>;

    async fn subscribe_to_table(
        &self,
        request: Request<SubscribeRequest>,
    ) -> Result<Response<Self::SubscribeToTableStream>, Status> {
        let req = request.into_inner();
        let (tx, mut rx) = mpsc::unbounded_channel();

        // Add subscriber for each table
        for table_id in req.table_ids {
            let mut subscribers = self.subscribers.write().await;
            let senders = subscribers.entry(table_id.clone()).or_insert_with(Vec::new);
            senders.push(tx.clone());
        }

        // Convert UnboundedReceiver<TableUpdate> to Receiver<Result<TableUpdate, Status>>
        let (result_tx, result_rx) = mpsc::channel::<Result<TableUpdate, Status>>(100);
        
        tokio::spawn(async move {
            while let Some(update) = rx.recv().await {
                let _ = result_tx.send(Ok(update)).await;
            }
        });

        Ok(Response::new(tokio_stream::wrappers::ReceiverStream::new(result_rx)))
    }

    async fn get_table_metadata(
        &self,
        _request: Request<TableMetadataRequest>,
    ) -> Result<Response<TableMetadataResponse>, Status> {
        // TODO: Implement table metadata functionality
        Err(Status::unimplemented("Table metadata not implemented yet"))
    }

    async fn list_tables(
        &self,
        _request: Request<ListTablesRequest>,
    ) -> Result<Response<ListTablesResponse>, Status> {
        // TODO: Implement list tables functionality
        let response = ListTablesResponse { table_ids: vec![] };
        Ok(Response::new(response))
    }
}

pub async fn start_grpc_server(
    addr: String,
    subscribers: TableSubscribers,
) -> Result<(), Box<dyn std::error::Error>> {
    let addr = addr.parse()?;
    let service = DubheGrpcService::new(subscribers);

    println!("GRPC server listening on {}", addr);

    Server::builder()
        .add_service(DubheGrpcServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
} 