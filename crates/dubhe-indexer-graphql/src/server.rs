use crate::config::GraphQLConfig;
use crate::database::DatabasePool;
use crate::health::HealthService;
use crate::playground::PlaygroundService;
use crate::schema::QueryRoot;
use crate::subscriptions::SubscriptionRoot;
use crate::GrpcSubscribers;
use crate::TableChange;
use anyhow::Result;
use async_graphql::Request;
use async_graphql::{http::GraphiQLSource, Schema};
use async_graphql_warp::{GraphQLBadRequest, GraphQLResponse};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::collections::HashMap;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use warp::ws::{Message, Ws};
use warp::{Filter, Rejection, Reply};

/// GraphQL server
pub struct GraphQLServer {
    config: GraphQLConfig,
    subscribers: GrpcSubscribers,
    db_pool: Option<Arc<DatabasePool>>,
    schema: Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,
    health_service: HealthService,
    playground_service: PlaygroundService,
    graphql_subscribers:
        Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<crate::subscriptions::TableChange>>>>>,
}

impl GraphQLServer {
    /// Create a new GraphQL server
    pub async fn new(
        config: GraphQLConfig,
        subscribers: GrpcSubscribers,
        graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
    ) -> Result<Self> {
        // Try to create database connection pool
        let db_pool = DatabasePool::new(&config.database_url)
            .await
            .ok()
            .map(Arc::new);

        let query_root = QueryRoot::new(db_pool.clone());
        let schema = Schema::build(
            query_root,
            async_graphql::EmptyMutation,
            SubscriptionRoot::new(subscribers.clone(), graphql_subscribers.clone()),
        )
        .finish();

        let health_service = HealthService::new(config.clone());
        let playground_service = PlaygroundService::new(config.clone());

        Ok(Self {
            config,
            subscribers,
            db_pool,
            schema,
            health_service,
            playground_service,
            graphql_subscribers,
        })
    }

    /// Handle WebSocket connection
    async fn handle_websocket(
        ws: warp::ws::Ws,
        schema: Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,
    ) -> Result<impl Reply, Rejection> {
        Ok(ws.on_upgrade(|socket| Self::handle_socket(socket, schema)))
    }

    /// Handle WebSocket messages
    async fn handle_socket(
        socket: warp::ws::WebSocket,
        schema: Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,
    ) {
        let (mut sender, mut receiver) = socket.split();

        while let Some(result) = receiver.next().await {
            let msg = match result {
                Ok(msg) => msg,
                Err(e) => {
                    // Handle connection errors more gracefully, don't log as error
                    if e.to_string().contains("Connection reset")
                        || e.to_string().contains("Broken pipe")
                    {
                        log::debug!("WebSocket connection closed by client: {}", e);
                    } else {
                        log::error!("WebSocket error: {}", e);
                    }
                    break;
                }
            };

            // Handle close message
            if msg.is_close() {
                log::debug!("Received WebSocket close message");
                break;
            }

            if let Ok(text) = msg.to_str() {
                log::info!("🔍 Received WebSocket message: {}", text);
                log::info!("📝 Message length: {} bytes", text.len());

                match serde_json::from_str::<serde_json::Value>(text) {
                    Ok(json) => {
                        log::info!("✅ JSON parsing successful");
                        log::info!(
                            "📋 Complete JSON: {}",
                            serde_json::to_string_pretty(&json).unwrap()
                        );

                        if let Some(msg_type) = json.get("type").and_then(|v| v.as_str()) {
                            log::info!("🎯 Message type: {}", msg_type);
                            match msg_type {
                                "connection_init" => {
                                    log::info!("🔄 Handling connection initialization");
                                    // Handle connection initialization
                                    let response_json = json!({
                                        "type": "connection_ack"
                                    });

                                    log::info!(
                                        "📤 Sending connection acknowledgment: {}",
                                        response_json.to_string()
                                    );
                                    if let Err(e) =
                                        sender.send(Message::text(response_json.to_string())).await
                                    {
                                        log::error!("❌ Failed to send connection_ack: {}", e);
                                        break;
                                    }
                                    log::info!("✅ Connection acknowledgment sent successfully");
                                }
                                "start" => {
                                    log::info!("🚀 Handling subscription start");
                                    if let Some(payload) = json.get("payload") {
                                        log::info!(
                                            "📦 Subscription payload: {}",
                                            serde_json::to_string_pretty(payload).unwrap()
                                        );

                                        if let Some(query) =
                                            payload.get("query").and_then(|v| v.as_str())
                                        {
                                            log::info!("🔍 Subscription query: {}", query);
                                            let request = Request::new(query.to_string());
                                            let mut response_stream =
                                                schema.execute_stream(request);

                                            log::info!("📡 Starting subscription stream execution");
                                            // Handle subscription stream
                                            while let Some(response) = response_stream.next().await
                                            {
                                                let response_json = json!({
                                                    "type": "data",
                                                    "id": json.get("id").unwrap_or(&json!("1")),
                                                    "payload": {
                                                        "data": response.data,
                                                        "errors": response.errors
                                                    }
                                                });

                                                log::info!(
                                                    "📤 Sending data response: {}",
                                                    response_json.to_string()
                                                );
                                                if let Err(e) = sender
                                                    .send(Message::text(response_json.to_string()))
                                                    .await
                                                {
                                                    log::error!(
                                                        "❌ Failed to send response: {}",
                                                        e
                                                    );
                                                    break;
                                                }
                                            }

                                            // Send completion message
                                            let complete_json = json!({
                                                "type": "complete",
                                                "id": json.get("id").unwrap_or(&json!("1"))
                                            });

                                            log::info!(
                                                "📤 Sending completion message: {}",
                                                complete_json.to_string()
                                            );
                                            if let Err(e) = sender
                                                .send(Message::text(complete_json.to_string()))
                                                .await
                                            {
                                                log::error!(
                                                    "❌ Failed to send completion message: {}",
                                                    e
                                                );
                                            }
                                        } else {
                                            log::warn!("⚠️ No query found in subscription payload");
                                        }
                                    } else {
                                        log::warn!("⚠️ No payload in subscription message");
                                    }
                                }
                                "stop" => {
                                    log::info!("🛑 Handling subscription stop");
                                    // Handle subscription stop
                                    let response_json = json!({
                                        "type": "complete",
                                        "id": json.get("id").unwrap_or(&json!("1"))
                                    });

                                    log::info!(
                                        "📤 Sending stop response: {}",
                                        response_json.to_string()
                                    );
                                    if let Err(e) =
                                        sender.send(Message::text(response_json.to_string())).await
                                    {
                                        log::error!("❌ Failed to send stop response: {}", e);
                                    }
                                }
                                "ping" => {
                                    log::info!("🏓 Handling ping");
                                    // Handle ping
                                    let response_json = json!({
                                        "type": "pong"
                                    });

                                    log::info!("📤 Sending pong: {}", response_json.to_string());
                                    if let Err(e) =
                                        sender.send(Message::text(response_json.to_string())).await
                                    {
                                        log::error!("❌ Failed to send pong: {}", e);
                                    }
                                }
                                _ => {
                                    log::warn!("⚠️ Unknown message type: {}", msg_type);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("❌ Failed to parse WebSocket message: {}", e);
                        log::error!("📝 Original message: {}", text);
                    }
                }
            } else {
                log::info!("📝 Received non-text message, type: {:?}", msg);
            }
        }

        log::info!("🔚 WebSocket connection closed");
    }

    /// Start the server
    pub async fn start(self) -> Result<()> {
        let config = self.config.clone();
        let schema = self.schema.clone();
        let health_service = self.health_service.clone();
        let playground_service = self.playground_service.clone();
        let graphql_subscribers = self.graphql_subscribers.clone();

        // GraphQL route - supports POST and GET
        let graphql_post_route = warp::path("graphql")
            .and(warp::post())
            .and(async_graphql_warp::graphql(schema.clone()))
            .and_then(
                |(schema, request): (
                    Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,
                    async_graphql::Request,
                )| async move {
                    Ok::<_, Infallible>(GraphQLResponse::from(schema.execute(request).await))
                },
            );

        let graphql_get_route = warp::path("graphql")
            .and(warp::get())
            .and(async_graphql_warp::graphql(schema.clone()))
            .and_then(
                |(schema, request): (
                    Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,
                    async_graphql::Request,
                )| async move {
                    Ok::<_, Infallible>(GraphQLResponse::from(schema.execute(request).await))
                },
            );

        // WebSocket route - uses the same path as HTTP route
        let websocket_route = warp::path("graphql")
            .and(warp::ws())
            .and(with_schema(schema.clone()))
            .and_then(|ws: Ws, schema| async move { Self::handle_websocket(ws, schema).await });

        // GraphiQL route
        let graphiql_route = warp::path("playground")
            .and(warp::get())
            .and(with_service(playground_service))
            .and_then(handle_playground);

        // Health check route
        let health_route = warp::path("health")
            .and(warp::get())
            .and(with_service(health_service))
            .and_then(handle_health);

        // Root path - welcome page
        let welcome_route = warp::path("welcome")
            .and(warp::get())
            .and(with_service(self.db_pool.clone())) // Pass db_pool to handler
            .and_then(handle_welcome_page); // Use new async handler

        // Combine all routes - ensure WebSocket route comes before HTTP route
        let routes = websocket_route
            .or(graphql_post_route)
            .or(graphql_get_route)
            .or(graphiql_route)
            .or(health_route)
            .or(welcome_route)
            .with(
                warp::cors()
                    .allow_any_origin()
                    .allow_methods(vec!["GET", "POST", "OPTIONS"])
                    .allow_headers(vec!["content-type", "authorization"])
                    .allow_credentials(true),
            );

        log::info!("🚀 GraphQL server starting on port {}", config.port);
        log::info!(
            "📊 GraphQL endpoint: http://localhost:{}/graphql",
            config.port
        );
        log::info!(
            "🔌 WebSocket endpoint: ws://localhost:{}/graphql",
            config.port
        );
        log::info!("🎮 Playground: http://localhost:{}/playground", config.port);
        log::info!("💚 Health check: http://localhost:{}/health", config.port);

        warp::serve(routes).run(([0, 0, 0, 0], config.port)).await;

        Ok(())
    }

    /// Shutdown the server
    pub async fn shutdown(&self) -> Result<()> {
        log::info!("🛑 Shutting down GraphQL server...");
        Ok(())
    }
}

// Helper functions
fn with_service<T: Clone + Send>(
    service: T,
) -> impl Filter<Extract = (T,), Error = Infallible> + Clone {
    warp::any().map(move || service.clone())
}

fn with_schema(
    schema: Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,
) -> impl Filter<
    Extract = (Schema<QueryRoot, async_graphql::EmptyMutation, SubscriptionRoot>,),
    Error = Infallible,
> + Clone {
    warp::any().map(move || schema.clone())
}

async fn handle_health(service: HealthService) -> Result<impl Reply, Rejection> {
    let response = service.get_health_status().await;
    Ok(warp::reply::json(&response))
}

async fn handle_playground(service: PlaygroundService) -> Result<impl Reply, Rejection> {
    let html = service.get_playground_html();
    Ok(warp::reply::html(html))
}

async fn handle_welcome_page(db_pool: Option<Arc<DatabasePool>>) -> Result<impl Reply, Rejection> {
    // Get table information
    let tables = if let Some(pool) = db_pool {
        match pool.get_tables().await {
            Ok(tables) => tables,
            Err(e) => {
                log::error!("Failed to get tables: {}", e);
                vec![]
            }
        }
    } else {
        vec![]
    };

    // Generate table list HTML
    let table_list = tables
        .iter()
        .map(|table| {
            let key_fields = table
                .columns
                .iter()
                .filter(|col| col.name.contains("id") || col.name.contains("key"))
                .map(|col| col.name.clone())
                .collect::<Vec<_>>();
            let value_fields = table
                .columns
                .iter()
                .filter(|col| !col.name.contains("id") && !col.name.contains("key"))
                .map(|col| col.name.clone())
                .collect::<Vec<_>>();

            format!(
                r#"
            <div class="table-info">
                <h3>📊 {}</h3>
                <div class="fields">
                    <div><strong>Key Fields:</strong> {}</div>
                    <div><strong>Value Fields:</strong> {}</div>
                </div>
            </div>
        "#,
                table.name,
                if key_fields.is_empty() {
                    "None".to_string()
                } else {
                    key_fields.join(", ")
                },
                value_fields.join(", ")
            )
        })
        .collect::<Vec<_>>()
        .join("");

    let html = format!(
        r#"
        <!DOCTYPE html>
        <html>
            <head>
                <title>🚀 Sui Indexer GraphQL API</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {{ 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: #333;
                        min-height: 100vh;
                    }}
                    .container {{ 
                        max-width: 1200px; 
                        margin: 0 auto; 
                        background: white; 
                        padding: 40px; 
                        border-radius: 16px; 
                        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    }}
                    h1 {{ 
                        color: #2c3e50; 
                        text-align: center; 
                        margin-bottom: 10px; 
                        font-size: 2.5em;
                    }}
                    .subtitle {{
                        text-align: center;
                        color: #7f8c8d;
                        margin-bottom: 40px;
                        font-size: 1.2em;
                    }}
                    .link {{ 
                        display: inline-block; 
                        margin: 10px; 
                        padding: 15px 25px; 
                        background: linear-gradient(135deg, #74b9ff, #0984e3); 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        text-align: center; 
                        font-weight: 500;
                        transition: transform 0.2s ease;
                    }}
                    .link:hover {{ 
                        transform: translateY(-2px);
                        box-shadow: 0 8px 15px rgba(116, 185, 255, 0.4);
                    }}
                    .status {{ 
                        color: #00b894; 
                        font-weight: bold; 
                        text-align: center;
                        font-size: 1.1em;
                        margin: 20px 0;
                    }}
                    .info-grid {{
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin: 30px 0;
                    }}
                    .info-card {{
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        border: 1px solid #e9ecef;
                    }}
                    .info-card h3 {{
                        color: #495057;
                        margin-top: 0;
                    }}
                    .center {{
                        text-align: center;
                    }}
                    .highlight {{
                        background: linear-gradient(135deg, #fdcb6e, #e17055);
                        color: white;
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-weight: 500;
                    }}
                    .table-info {{
                        background: #f8f9fa;
                        padding: 20px;
                        margin: 15px 0;
                        border-radius: 8px;
                        border-left: 4px solid #74b9ff;
                    }}
                    .table-info h3 {{
                        margin: 0 0 10px 0;
                        color: #2c3e50;
                    }}
                    .fields div {{
                        margin: 5px 0;
                        color: #555;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 Sui Indexer GraphQL API</h1>
                    <p class="subtitle">Dynamically scan database, automatically generate GraphQL API</p>
                    <p class="status">● Server Status: Running Normally | Scanned <span class="highlight">{}</span> tables</p>
                    
                    <div class="center">
                        <a href="/graphql" class="link">📊 GraphQL API</a>
                        <a href="/playground" class="link">🎮 Enhanced GraphQL Playground</a>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <h3>🎯 Core Features</h3>
                            <ul>
                                <li>✨ Auto-scan sui-rust-indexer database</li>
                                <li>🔄 Dynamically generate GraphQL schema</li>
                                <li>📡 Support real-time subscription features ✅</li>
                                <li>🚀 Complete CRUD operations</li>
                                <li>🛡️ PostGraphile powerful features</li>
                            </ul>
                        </div>
                        
                        <div class="info-card">
                            <h3>📊 Server Information</h3>
                            <ul>
                                <li>Environment: development</li>
                                <li>Port: 4000</li>
                                <li>Database Schema: public</li>
                                <li>CORS: Enabled</li>
                                <li>Subscriptions: Enabled</li>
                            </ul>
                        </div>
                    </div>

                    <h2>📋 Detected Data Tables</h2>
                    {}
                    
                    <div style="margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                        <h3>💡 Usage Tips</h3>
                        <p>1. Visit <strong>Enhanced GraphQL Playground</strong> for better query experience</p>
                        <p>   • 📊 Visual Schema Explorer - Click-to-build queries</p>
                        <p>   • 🎨 Modern UI interface and enhanced code highlighting</p>
                        <p>   • 📝 Code export feature - Generate client code in multiple languages</p>
                        <p>   • ⌨️ Keyboard shortcuts support - Ctrl/Cmd+Enter to execute queries</p>
                        <p>2. All tables support standard GraphQL query, mutation and subscription operations</p>
                        <p>3. Dynamic tables (store_*) automatically generate fields based on table_fields metadata</p>
                        <p>4. System tables provide core data access for dubhe-indexer</p>
                        <p>5. Use WebSocket for real-time data subscriptions</p>
                    </div>
                </div>
            </body>
        </html>
    "#,
        tables.len(),
        table_list
    );

    Ok(warp::reply::html(html))
}

async fn handle_rejection(err: Rejection) -> Result<impl Reply, Infallible> {
    let (code, message) = if err.is_not_found() {
        (404, "Not Found")
    } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
        (405, "Method Not Allowed")
    } else {
        log::error!("Unhandled error: {:?}", err);
        (500, "Internal Server Error")
    };

    Ok(warp::reply::with_status(
        warp::reply::json(&json!({
            "error": message,
            "code": code
        })),
        warp::http::StatusCode::from_u16(code)
            .unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR),
    ))
}
