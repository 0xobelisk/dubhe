use serde::{Deserialize, Serialize};
use std::time::Instant;
use crate::config::GraphQLConfig;

/// 健康检查服务
#[derive(Clone)]
pub struct HealthService {
    config: GraphQLConfig,
    start_time: Instant,
}

impl HealthService {
    pub fn new(config: GraphQLConfig) -> Self {
        Self {
            config,
            start_time: Instant::now(),
        }
    }

    /// 获取健康状态
    pub async fn get_health_status(&self) -> HealthStatus {
        HealthStatus {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            uptime: self.start_time.elapsed().as_secs(),
            version: "1.2.0-pre.56".to_string(),
            endpoints: self.get_endpoints(),
            subscriptions: self.get_subscription_status(),
        }
    }

    /// 获取端点信息
    fn get_endpoints(&self) -> Endpoints {
        Endpoints {
            graphql: self.config.graphql_endpoint(),
            playground: self.config.playground_endpoint(),
            health: self.config.health_endpoint(),
            websocket: self.config.websocket_endpoint(),
        }
    }

    /// 获取订阅状态
    fn get_subscription_status(&self) -> SubscriptionHealth {
        SubscriptionHealth {
            enabled: self.config.subscriptions,
            method: "pg-subscriptions".to_string(),
            graphql_endpoint: self.config.graphql_endpoint(),
            subscription_endpoint: self.config.websocket_endpoint(),
        }
    }
}

/// 健康状态
#[derive(Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: String,
    pub uptime: u64,
    pub version: String,
    pub endpoints: Endpoints,
    pub subscriptions: SubscriptionHealth,
}

/// 端点信息
#[derive(Serialize, Deserialize)]
pub struct Endpoints {
    pub graphql: String,
    pub playground: String,
    pub health: String,
    pub websocket: String,
}

/// 订阅健康状态
#[derive(Serialize, Deserialize)]
pub struct SubscriptionHealth {
    pub enabled: bool,
    pub method: String,
    pub graphql_endpoint: String,
    pub subscription_endpoint: String,
} 