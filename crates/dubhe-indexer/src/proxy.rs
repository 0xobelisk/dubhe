use crate::handlers::GrpcSubscribers;
use anyhow::Result;
use dubhe_common::Database;
use dubhe_indexer_graphql::TableChange;
use http::header::CONTENT_TYPE;
use hyper::server::conn::AddrStream;
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Request, Response, Server, StatusCode};
use serde_json::json;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};

/// Main Proxy Server following Torii architecture pattern
/// Routes requests to independent GraphQL and gRPC services based on content type and path
#[derive(Debug)]
pub struct ProxyServer {
    addr: SocketAddr,
    grpc_addr: Option<SocketAddr>,
    graphql_addr: Option<SocketAddr>,
    grpc_subscribers: GrpcSubscribers,
    graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
    shutdown_tx: broadcast::Sender<()>,
    version: String,
    config_json: Arc<serde_json::Value>,
}

impl ProxyServer {
    /// Create a new proxy server with separate backend service addresses
    pub fn new(
        addr: SocketAddr,
        grpc_addr: Option<SocketAddr>,
        graphql_addr: Option<SocketAddr>,
        grpc_subscribers: GrpcSubscribers,
        graphql_subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
        config_json: Arc<serde_json::Value>,
    ) -> Self {
        let (shutdown_tx, _) = broadcast::channel(1);

        Self {
            addr,
            grpc_addr,
            graphql_addr,
            grpc_subscribers,
            graphql_subscribers,
            shutdown_tx,
            version: "1.2.0".to_string(),
            config_json,
        }
    }

    /// Start independent backend services and the proxy server
    pub async fn start(&self, database: Arc<Database>) -> Result<()> {
        log::info!("🚀 Starting Dubhe Proxy Server on {}", self.addr);

        // Start independent gRPC service if address is provided
        if let Some(grpc_addr) = self.grpc_addr {
            let grpc_subscribers = self.grpc_subscribers.clone();
            let shutdown_rx = self.shutdown_tx.subscribe();
            let config_json = self.config_json.clone();

            tokio::spawn(async move {
                if let Err(e) =
                    start_grpc_service(grpc_addr, grpc_subscribers, database, config_json, shutdown_rx).await
                {
                    log::error!("❌ gRPC service failed: {}", e);
                }
            });

            log::info!("🔌 gRPC service starting on {}", grpc_addr);
        }

        // Start independent GraphQL service if address is provided
        if let Some(graphql_addr) = self.graphql_addr {
            let graphql_subscribers = self.graphql_subscribers.clone();
            let shutdown_rx = self.shutdown_tx.subscribe();

            tokio::spawn(async move {
                if let Err(e) =
                    start_graphql_service(graphql_addr, graphql_subscribers, shutdown_rx).await
                {
                    log::error!("❌ GraphQL service failed: {}", e);
                }
            });

            log::info!("📊 GraphQL service starting on {}", graphql_addr);
        }

        // Start the main proxy server
        let grpc_addr = self.grpc_addr;
        let graphql_addr = self.graphql_addr;
        let version = self.version.clone();
        let config_json = self.config_json.clone();

        let make_svc = make_service_fn(move |conn: &AddrStream| {
            let remote_addr = conn.remote_addr().ip();
            let grpc_addr = grpc_addr;
            let graphql_addr = graphql_addr;
            let version = version.clone();
            let config_json = config_json.clone();

            async move {
                Ok::<_, Infallible>(service_fn(move |req| {
                    let grpc_addr = grpc_addr;
                    let graphql_addr = graphql_addr;
                    let version = version.clone();
                    let config_json = config_json.clone();
                    async move {
                        handle_request(remote_addr, req, grpc_addr, graphql_addr, version, config_json).await
                    }
                }))
            }
        });

        let server = Server::bind(&self.addr).serve(make_svc);
        log::info!("✅ Dubhe Proxy Server ready!");

        server.await.map_err(anyhow::Error::from)
    }

    /// Graceful shutdown
    pub async fn shutdown(&self) -> Result<()> {
        log::info!("🛑 Shutting down Dubhe Proxy Server...");
        let _ = self.shutdown_tx.send(());
        Ok(())
    }
}

/// Core request handling and routing logic
async fn handle_request(
    client_addr: IpAddr,
    req: Request<Body>,
    grpc_addr: Option<SocketAddr>,
    graphql_addr: Option<SocketAddr>,
    _version: String,
    config_json: Arc<serde_json::Value>,
) -> Result<Response<Body>, Infallible> {
    let path = req.uri().path();
    let method = req.method();
    let headers = req.headers();

    println!("📨 Request from {}: {} {}", client_addr, method, path);
    println!("🔍 Request path: {}", path);
    println!("🔍 Request headers: {:?}", headers);

    // Check if it's a gRPC request
    // gRPC requests typically have paths like "/dubhe_grpc.DubheGrpc/MethodName"
    let is_grpc = path.starts_with("/dubhe_grpc") 
        || headers.get(CONTENT_TYPE).and_then(|v| v.to_str().ok())
            .map(|ct| ct.starts_with("application/grpc"))
            .unwrap_or(false);
    
    if is_grpc {
        log::info!("🔌 Routing gRPC request: {}", path);
        return handle_grpc_request(req, grpc_addr).await;
    }

    // Handle GraphQL requests
    if path.starts_with("/graphql") {
        log::info!("📊 Routing GraphQL request: {}", path);
        return handle_graphql_request(req, graphql_addr).await;
    }

    // Handle GraphQL Playground
    if path.starts_with("/playground") {
        return Ok(serve_graphql_playground());
    }

    // Handle health check
    if path.starts_with("/health") {
        return Ok(serve_health_check(grpc_addr, graphql_addr));
    }

    // Handle welcome page
    if path.starts_with("/welcome") {
        return Ok(serve_welcome_page());
    }

    // Handle metadata endpoint
    if path.starts_with("/metadata") {
        return Ok(serve_metadata(config_json));
    }

    // Default 404 response
    log::warn!("❌ No handler found for: {} {}", method, path);
    Ok(Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "error": "Not Found",
                "message": format!("No handler for {} {}", method, path),
                "available_endpoints": ["/", "/health", "/graphql", "/playground", "/metadata"]
            })
            .to_string(),
        ))
        .unwrap())
}

/// Forward request to gRPC backend service
async fn handle_grpc_request(
    req: Request<Body>,
    grpc_addr: Option<SocketAddr>,
) -> Result<Response<Body>, Infallible> {
    let Some(grpc_addr) = grpc_addr else {
        log::error!("❌ gRPC service not available");
        return Ok(Response::builder()
            .status(StatusCode::SERVICE_UNAVAILABLE)
            .header(CONTENT_TYPE, "application/grpc")
            .header("grpc-status", "14") // UNAVAILABLE
            .header("grpc-message", "gRPC service not configured")
            .body(Body::empty())
            .unwrap());
    };

    // Create HTTP/2 client for gRPC forwarding
    let client = hyper::Client::builder().http2_only(true).build_http();

    let grpc_url = format!("http://{}", grpc_addr);
    let target_uri = format!(
        "{}{}",
        grpc_url,
        req.uri().path_and_query().map(|x| x.as_str()).unwrap_or("")
    );

    match target_uri.parse::<hyper::Uri>() {
        Ok(parsed_uri) => {
            let (mut parts, body) = req.into_parts();
            parts.uri = parsed_uri;
            let forwarded_req = Request::from_parts(parts, body);

            match client.request(forwarded_req).await {
                Ok(response) => {
                    log::debug!("✅ gRPC request forwarded successfully");
                    Ok(response)
                }
                Err(e) => {
                    log::error!("❌ gRPC forward error: {}", e);
                    Ok(Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .header(CONTENT_TYPE, "application/grpc")
                        .header("grpc-status", "14") // UNAVAILABLE
                        .header("grpc-message", "Backend gRPC service unavailable")
                        .body(Body::empty())
                        .unwrap())
                }
            }
        }
        Err(e) => {
            log::error!("❌ Invalid gRPC target URI: {}", e);
            Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header(CONTENT_TYPE, "application/grpc")
                .header("grpc-status", "3") // INVALID_ARGUMENT
                .header("grpc-message", "Invalid request URI")
                .body(Body::empty())
                .unwrap())
        }
    }
}

/// Forward request to GraphQL backend service
async fn handle_graphql_request(
    req: Request<Body>,
    graphql_addr: Option<SocketAddr>,
) -> Result<Response<Body>, Infallible> {
    let Some(graphql_addr) = graphql_addr else {
        log::error!("❌ GraphQL service not available");
        return Ok(Response::builder()
            .status(StatusCode::SERVICE_UNAVAILABLE)
            .header(CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({
                    "error": "GraphQL service not configured"
                })
                .to_string(),
            ))
            .unwrap());
    };

    let client = hyper::Client::new();
    let graphql_url = format!("http://{}", graphql_addr);
    let target_uri = format!(
        "{}{}",
        graphql_url,
        req.uri().path_and_query().map(|x| x.as_str()).unwrap_or("")
    );

    match target_uri.parse::<hyper::Uri>() {
        Ok(parsed_uri) => {
            let (mut parts, body) = req.into_parts();
            parts.uri = parsed_uri;
            let forwarded_req = Request::from_parts(parts, body);

            match client.request(forwarded_req).await {
                Ok(response) => {
                    log::debug!("✅ GraphQL request forwarded successfully");
                    Ok(response)
                }
                Err(e) => {
                    log::error!("❌ GraphQL forward error: {}", e);
                    Ok(Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .header(CONTENT_TYPE, "application/json")
                        .body(Body::from(
                            json!({
                                "error": "Backend GraphQL service unavailable",
                                "details": e.to_string()
                            })
                            .to_string(),
                        ))
                        .unwrap())
                }
            }
        }
        Err(e) => {
            log::error!("❌ Invalid GraphQL target URI: {}", e);
            Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header(CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "error": "Invalid request URI",
                        "details": e.to_string()
                    })
                    .to_string(),
                ))
                .unwrap())
        }
    }
}

/// Serve GraphQL Playground HTML
fn serve_graphql_playground() -> Response<Body> {
    let playground_html = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Dubhe GraphQL Playground</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://unpkg.com/graphql-playground-react@1.7.23/build/static/css/index.css" rel="stylesheet" />
</head>
<body>
    <div id="root">
        <style>
            body { margin: 0; font-family: 'Open Sans', sans-serif; }
            #loading { display: flex; height: 100vh; align-items: center; justify-content: center; }
        </style>
        <div id="loading">Loading GraphQL Playground...</div>
    </div>
    <script src="https://unpkg.com/graphql-playground-react@1.7.23/build/static/js/middleware.js"></script>
    <script>
        GraphQLPlayground.init(document.getElementById('root'), {
            endpoint: '/graphql',
            subscriptionEndpoint: `ws://${window.location.host}/graphql`,
            settings: {
                'editor.theme': 'dark',
                'request.credentials': 'include'
            }
        })
    </script>
</body>
</html>
    "#;

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "text/html; charset=utf-8")
        .body(Body::from(playground_html))
        .unwrap()
}

/// Serve health check endpoint
fn serve_health_check(
    grpc_addr: Option<SocketAddr>,
    graphql_addr: Option<SocketAddr>,
) -> Response<Body> {
    let health_status = json!({
        "status": "healthy",
        "service": "dubhe-indexer",
        "version": "1.2.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "grpc": {
                "configured": grpc_addr.is_some(),
                "address": grpc_addr.map(|a| a.to_string())
            },
            "graphql": {
                "configured": graphql_addr.is_some(),
                "address": graphql_addr.map(|a| a.to_string())
            }
        }
    });

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(health_status.to_string()))
        .unwrap()
}

/// Serve metadata endpoint
fn serve_metadata(config_json: Arc<serde_json::Value>) -> Response<Body> {
    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(config_json.to_string()))
        .unwrap()
}

/// Serve welcome page
fn serve_welcome_page() -> Response<Body> {
    // Generate a simplified welcome page without database connection
    // In a real implementation, this would fetch table info from GraphQL service
    let table_list = r#"
        <div class="table-info">
            <h3>📊 events</h3>
            <div class="fields">
                <div><strong>Key Fields:</strong> id, checkpoint</div>
                <div><strong>Value Fields:</strong> transaction_digest, event_sequence, event_type, event_data</div>
            </div>
        </div>
        <div class="table-info">
            <h3>📊 checkpoints</h3>
            <div class="fields">
                <div><strong>Key Fields:</strong> sequence_number</div>
                <div><strong>Value Fields:</strong> digest, timestamp_ms, network_total_transactions, previous_digest</div>
            </div>
        </div>
        <div class="table-info">
            <h3>📊 transactions</h3>
            <div class="fields">
                <div><strong>Key Fields:</strong> digest</div>
                <div><strong>Value Fields:</strong> checkpoint_sequence_number, timestamp_ms, sender, gas_used, gas_budget</div>
            </div>
        </div>
    "#;

    let welcome_html = format!(
        r#"
        <!DOCTYPE html>
        <html>
            <head>
                <title>🚀 Dubhe Indexer API Gateway</title>
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
                    <h1>🚀 Dubhe Indexer API Gateway</h1>
                    <p class="subtitle">Unified GraphQL and gRPC API Gateway for Sui Indexer</p>
                    <p class="status">● Server Status: Running Normally | Available <span class="highlight">3</span> core tables</p>
                    
                    <div class="center">
                        <a href="/graphql" class="link">📊 GraphQL API</a>
                        <a href="/playground" class="link">🎮 GraphQL Playground</a>
                        <a href="/health" class="link">💚 Health Check</a>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <h3>🎯 Core Features</h3>
                            <ul>
                                <li>✨ Unified API Gateway for GraphQL and gRPC</li>
                                <li>🔄 Automatic request routing based on content type</li>
                                <li>📡 Support real-time subscription features ✅</li>
                                <li>🚀 Complete CRUD operations</li>
                                <li>🛡️ Independent service architecture</li>
                            </ul>
                        </div>
                        
                        <div class="info-card">
                            <h3>📊 Service Information</h3>
                            <ul>
                                <li>Environment: development</li>
                                <li>Proxy Port: 4000</li>
                                <li>GraphQL Service: Enabled</li>
                                <li>gRPC Service: Enabled</li>
                                <li>CORS: Enabled</li>
                            </ul>
                        </div>
                    </div>

                    <h2>📋 Available Data Tables</h2>
                    {}
                    
                    <div style="margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                        <h3>💡 Usage Tips</h3>
                        <p>1. <strong>GraphQL API</strong> - Use for querying indexed data with rich schema</p>
                        <p>   • 📊 Visual Schema Explorer in Playground</p>
                        <p>   • 🎨 Modern UI interface and enhanced code highlighting</p>
                        <p>   • 📝 Code export feature - Generate client code in multiple languages</p>
                        <p>2. <strong>gRPC API</strong> - Use for high-performance real-time subscriptions</p>
                        <p>   • 🔌 Direct gRPC calls with Content-Type: application/grpc</p>
                        <p>   • 📡 Real-time data streaming</p>
                        <p>3. <strong>Health Check</strong> - Monitor service status and configuration</p>
                        <p>4. All tables support standard GraphQL query, mutation and subscription operations</p>
                        <p>5. Use WebSocket for real-time data subscriptions via GraphQL</p>
                    </div>
                </div>
            </body>
        </html>
    "#,
        table_list
    );

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "text/html; charset=utf-8")
        .body(Body::from(welcome_html))
        .unwrap()
}

/// Start independent gRPC service
async fn start_grpc_service(
    addr: SocketAddr,
    subscribers: GrpcSubscribers,
    database: Arc<Database>,
    config_json: Arc<serde_json::Value>,
    mut shutdown_rx: broadcast::Receiver<()>,
) -> Result<()> {
    use dubhe_indexer_grpc::grpc::DubheGrpcService;
    use dubhe_indexer_grpc::types::dubhe_grpc_server::DubheGrpcServer;
    use tonic::transport::Server;
    use dubhe_common::DubheConfig;

    // Parse DubheConfig from JSON
    let dubhe_config = Arc::new(DubheConfig::from_json(config_json.as_ref().clone())?);

    let grpc_service = DubheGrpcService::new(subscribers, database, dubhe_config);
    let grpc_server = DubheGrpcServer::new(grpc_service);

    log::info!(
        "🔌 gRPC service listening on {} (with gRPC-Web support)",
        addr
    );

    Server::builder()
        .accept_http1(true) // Enable HTTP/1.1 for gRPC-Web
        .add_service(tonic_web::enable(grpc_server)) // Enable gRPC-Web
        .serve_with_shutdown(addr, async {
            shutdown_rx.recv().await.ok();
            log::info!("🛑 gRPC service shutting down");
        })
        .await
        .map_err(anyhow::Error::from)
}

/// Start independent GraphQL service  
async fn start_graphql_service(
    addr: SocketAddr,
    subscribers: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<TableChange>>>>>,
    mut shutdown_rx: broadcast::Receiver<()>,
) -> Result<()> {
    use dubhe_indexer_graphql::{GraphQLConfig, GraphQLServerManager};

    log::info!("📊 Starting independent GraphQL service on {}", addr);

    // Create GraphQL configuration
    let config = GraphQLConfig {
        port: addr.port(),
        database_url: "sqlite://data.db".to_string(), // This should come from actual config
        schema: "public".to_string(),
        endpoint: "/graphql".to_string(),
        cors: true,
        subscriptions: true,
        env: "development".to_string(),
        debug: true,
        query_timeout: 30,
        max_connections: 100,
        heartbeat_interval: 10,
        enable_metrics: false,
        enable_live_queries: true,
        enable_pg_subscriptions: false,
        enable_native_websocket: true,
        realtime_port: None,
    };

    // Create and start GraphQL server manager
    let mut graphql_manager = GraphQLServerManager::new(config, subscribers);

    // Start GraphQL server in a separate task
    let graphql_handle = tokio::spawn(async move {
        if let Err(e) = graphql_manager.start().await {
            log::error!("❌ GraphQL service failed to start: {}", e);
        }
    });

    // Wait for shutdown signal
    tokio::select! {
        _ = shutdown_rx.recv() => {
            log::info!("🛑 GraphQL service shutting down");
        }
        result = graphql_handle => {
            match result {
                Ok(_) => log::info!("✅ GraphQL service completed"),
                Err(e) => log::error!("❌ GraphQL service task failed: {}", e),
            }
        }
    }

    Ok(())
}
