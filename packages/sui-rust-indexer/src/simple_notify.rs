use crate::db::PgPoolConnection;
use anyhow::Result;

// Simplified data change logging
pub async fn log_data_change(
    _conn: &mut PgPoolConnection<'_>,
    table_name: &str,
    operation: &str,
    record_count: usize,
) -> Result<()> {
    println!(
        "📊 Data change: table={}, operation={}, record_count={}",
        table_name, operation, record_count
    );

    // PostGraphile's Live Queries automatically detect database changes
    // No need to manually send notifications

    Ok(())
}

// Simplified trigger setup - optional, for debugging
pub async fn setup_simple_logging(conn: &mut PgPoolConnection<'_>) -> Result<()> {
    // Create simple log function only when debugging is needed
    let create_log_function = r#"
    CREATE OR REPLACE FUNCTION simple_change_log() RETURNS trigger AS $$
    BEGIN
        -- Simple change log, available for debugging
        RAISE NOTICE 'Table % operation % completed', TG_TABLE_NAME, TG_OP;
        
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
    "#;

    use diesel_async::RunQueryDsl;
    diesel::sql_query(create_log_function).execute(conn).await?;

    println!("✅ Simplified log function created");

    Ok(())
}

// Create data change notification trigger for unified realtime engine
pub async fn create_realtime_trigger(
    conn: &mut PgPoolConnection<'_>,
    table_name: &str,
) -> Result<()> {
    // Create generic trigger function - dynamically handle primary keys based on table_fields configuration
    let create_notify_function = r#"
    CREATE OR REPLACE FUNCTION unified_realtime_notify() RETURNS trigger AS $$
    DECLARE
        channel_name text;
        payload_data jsonb;
        primary_key_value text;
        key_fields text[];
        key_values text[];
        table_name_without_prefix text;
        current_field_name text;
        current_field_value text;
    BEGIN
        -- Build channel name: use PostGraphile compatible format
        channel_name := 'postgraphile:' || TG_TABLE_NAME;
        
        -- Extract table name, remove store_ prefix
        IF TG_TABLE_NAME LIKE 'store_%' THEN
            table_name_without_prefix := substring(TG_TABLE_NAME from 7);
        ELSE
            table_name_without_prefix := TG_TABLE_NAME;
        END IF;
        
        -- Dynamically get primary key field list
        SELECT array_agg(table_fields.field_name ORDER BY table_fields.field_name) 
        INTO key_fields
        FROM table_fields 
        WHERE table_fields.table_name = table_name_without_prefix AND table_fields.is_key = true;
        
        -- Build primary key value
        key_values := ARRAY[]::text[];
        
        IF key_fields IS NOT NULL THEN
            FOREACH current_field_name IN ARRAY key_fields
            LOOP
                BEGIN
                    IF TG_OP = 'DELETE' THEN
                        -- Dynamically get field value from OLD record
                        EXECUTE format('SELECT ($1).%I::text', current_field_name) INTO current_field_value USING OLD;
                    ELSE
                        -- Dynamically get field value from NEW record
                        EXECUTE format('SELECT ($1).%I::text', current_field_name) INTO current_field_value USING NEW;
                    END IF;
                    
                    key_values := key_values || current_field_value;
                EXCEPTION 
                    WHEN undefined_column THEN
                        key_values := key_values || 'NULL';
                    WHEN OTHERS THEN
                        key_values := key_values || 'ERROR';
                END;
            END LOOP;
            
            -- Combine primary key values (connect multiple fields with underscore)
            primary_key_value := array_to_string(key_values, '_');
        ELSE
            -- If no primary key fields, use table name as identifier
            primary_key_value := 'no_key_' || table_name_without_prefix;
        END IF;
        
        -- Build PostGraphile Live Queries specific payload format
        -- PostGraphile needs to know changes occurred to re-execute live queries
        
        -- 1. Send to standard postgraphile channel (simple format)
        PERFORM pg_notify('postgraphile:' || TG_TABLE_NAME, '{}');
        
        -- 2. Send to DDL channel to notify schema may have changed
        PERFORM pg_notify('postgraphile:ddl', '{"table":"' || TG_TABLE_NAME || '","op":"' || TG_OP || '"}');
        
        -- 3. Send to query invalidation channel (PostGraphile specific)
        PERFORM pg_notify('postgraphile:query_invalidation', '{"table":"' || TG_TABLE_NAME || '"}');
        
        -- 4. Send to table-specific channel
        PERFORM pg_notify('postgraphile:table:' || TG_TABLE_NAME, '{"op":"' || TG_OP || '"}');
        
        -- Return appropriate record
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql VOLATILE;
    "#;

    use diesel_async::RunQueryDsl;
    diesel::sql_query(create_notify_function)
        .execute(conn)
        .await?;

    let trigger_name = format!("_unified_realtime_{}", table_name);

    // Delete old trigger
    let drop_trigger = format!("DROP TRIGGER IF EXISTS {} ON {}", trigger_name, table_name);

    diesel::sql_query(&drop_trigger).execute(conn).await?;

    // Create unified realtime engine trigger
    let create_trigger = format!(
        r#"CREATE TRIGGER {}
        AFTER INSERT OR UPDATE OR DELETE
        ON {}
        FOR EACH ROW
        EXECUTE FUNCTION unified_realtime_notify()"#,
        trigger_name, table_name
    );

    diesel::sql_query(&create_trigger).execute(conn).await?;

    println!("✅ Unified realtime engine trigger created: {}", table_name);

    Ok(())
}
