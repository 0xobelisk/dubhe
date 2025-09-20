use crate::config::GraphQLConfig;
use handlebars::Handlebars;
use serde_json::json;

/// GraphQL Playground service
#[derive(Clone)]
pub struct PlaygroundService {
    config: GraphQLConfig,
}

impl PlaygroundService {
    pub fn new(config: GraphQLConfig) -> Self {
        Self { config }
    }

    /// Get Playground HTML
    pub fn get_playground_html(&self) -> String {
        let mut handlebars = Handlebars::new();

        // Register template
        let template = include_str!("templates/playground.hbs");
        handlebars
            .register_template_string("playground", template)
            .unwrap();

        // Prepare data
        let data = json!({
            "title": "Dubhe GraphQL Playground",
            "version": "6.0.0-canary-d779fd3f.0",
            "endpoint": "/graphql",
            "subscription_endpoint": "/graphql",
            "credentials": "same-origin",
            "headers": {},
            "ws_connection_params": {},
        });

        // Render template
        handlebars.render("playground", &data).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_playground_service() {
        let config = GraphQLConfig {
            port: 4000,
            database_url: "sqlite://test.db".to_string(),
            schema: "public".to_string(),
            endpoint: "/graphql".to_string(),
            cors: true,
            subscriptions: true,
            env: "development".to_string(),
            debug: false,
            query_timeout: 30000,
            max_connections: 1000,
            heartbeat_interval: 30000,
            enable_metrics: true,
            enable_live_queries: true,
            enable_pg_subscriptions: true,
            enable_native_websocket: true,
            realtime_port: None,
        };

        let service = PlaygroundService::new(config);
        let html = service.get_playground_html();

        // Check HTML contains necessary elements
        assert!(html.contains("GraphiQL"));
        assert!(html.contains("/graphql"));
        assert!(!html.contains("plugin-explorer")); // Should not contain plugins
    }
}
