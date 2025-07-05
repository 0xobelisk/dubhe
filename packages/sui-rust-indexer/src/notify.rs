use crate::db::PgPoolConnection;
use anyhow::Result;
use chrono;
use diesel_async::RunQueryDsl;
use serde_json::json;

#[derive(Clone)]
pub struct NotificationPayload {
    pub event: String,
    pub table: String,
    pub id: Option<serde_json::Value>,
    pub data: Option<serde_json::Value>,
    pub timestamp: String,
}

impl NotificationPayload {
    pub fn new(event: &str, table: &str) -> Self {
        Self {
            event: event.to_string(),
            table: table.to_string(),
            id: None,
            data: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn with_id(mut self, id: serde_json::Value) -> Self {
        self.id = Some(id);
        self
    }

    pub fn with_data(mut self, data: serde_json::Value) -> Self {
        self.data = Some(data);
        self
    }

    pub fn to_json(&self) -> String {
        json!({
            "event": self.event,
            "table": self.table,
            "id": self.id,
            "data": self.data,
            "timestamp": self.timestamp,
        })
        .to_string()
    }
}

pub async fn send_notification(
    conn: &mut PgPoolConnection<'_>,
    channel: &str,
    payload: NotificationPayload,
) -> Result<()> {
    let sql = format!("SELECT pg_notify($1, $2)");

    diesel::sql_query(sql)
        .bind::<diesel::sql_types::Text, _>(channel)
        .bind::<diesel::sql_types::Text, _>(payload.to_json())
        .execute(conn)
        .await?;

    Ok(())
}

// Create notifications for store tables
pub async fn notify_store_change(
    conn: &mut PgPoolConnection<'_>,
    table_name: &str,
    event: &str,
    key_values: &[(String, serde_json::Value)],
    value_values: &[(String, serde_json::Value)],
) -> Result<()> {
    // Fix channel name format to match the format listened by GraphQL server
    let table_name_with_prefix = format!("store_{}", table_name);
    let channel = format!("table:{}:change", table_name_with_prefix);

    let mut data = json!({});

    // Add key values
    for (key, value) in key_values {
        data[key] = value.clone();
    }

    // Add regular values
    for (key, value) in value_values {
        data[key] = value.clone();
    }

    let payload = NotificationPayload::new(event, &table_name_with_prefix).with_data(data);

    send_notification(conn, &channel, payload.clone()).await?;

    // Also send to general channel
    send_notification(conn, "store:all", payload).await?;

    Ok(())
}

// Create trigger functions and triggers
pub async fn setup_notification_triggers(conn: &mut PgPoolConnection<'_>) -> Result<()> {
    // Create a simpler trigger function with fixed timestamp format
    let create_function = r#"
    CREATE OR REPLACE FUNCTION tg__graphql_subscription() RETURNS trigger AS $$
    DECLARE
        v_event text;
        v_topic text;
        v_payload jsonb;
        v_record jsonb;
    BEGIN
        -- Determine event type
        IF TG_OP = 'INSERT' THEN
            v_event = 'create';
            v_record = to_jsonb(NEW);
        ELSIF TG_OP = 'UPDATE' THEN
            v_event = 'update';
            v_record = to_jsonb(NEW);
        ELSIF TG_OP = 'DELETE' THEN
            v_event = 'delete';
            v_record = to_jsonb(OLD);
        ELSE
            RETURN NULL;
        END IF;
        
        -- Build topic
        v_topic = format('table:%s:change', TG_TABLE_NAME);
        
        -- Build simplified payload with ISO format timestamp
        v_payload = jsonb_build_object(
            'event', v_event,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'data', v_record,
            'timestamp', current_timestamp::text
        );
        
        -- Send notification
        PERFORM pg_notify(v_topic, v_payload::text);
        
        -- Also send to general channel
        PERFORM pg_notify('store:all', v_payload::text);
        
        -- Return appropriate record
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql VOLATILE;
    "#;

    diesel::sql_query(create_function).execute(conn).await?;

    println!("Notification trigger function created successfully");

    Ok(())
}

// Create trigger for specific table
pub async fn create_table_trigger(
    conn: &mut PgPoolConnection<'_>,
    table_name: &str,
    operations: &[&str], // ["INSERT", "UPDATE", "DELETE"]
) -> Result<()> {
    let trigger_name = format!("_notify_{}", table_name);
    let ops = operations.join(" OR ");

    // Delete old trigger first (if exists)
    let drop_trigger = format!("DROP TRIGGER IF EXISTS {} ON {}", trigger_name, table_name);
    diesel::sql_query(&drop_trigger).execute(conn).await?;

    // Create new trigger - fix trigger function call, don't pass extra parameters
    let create_trigger = format!(
        r#"CREATE TRIGGER {}
        AFTER {}
        ON {}
        FOR EACH ROW
        EXECUTE FUNCTION tg__graphql_subscription()"#,
        trigger_name, ops, table_name
    );

    diesel::sql_query(&create_trigger).execute(conn).await?;

    println!("Trigger created for table: {}", table_name);

    Ok(())
}
