use sqlx::{Pool, Postgres, PgPool, Row, Column};
use crate::db::Storage;
use async_trait::async_trait;
use anyhow::Result;
use crate::table::TableMetadata;
use crate::sql::DBData;
use serde_json::Value;
use std::collections::HashMap;

pub struct PostgresStorage {
    pool: Pool<Postgres>,
}

impl PostgresStorage {
    pub async fn new(db_url: &str) -> Result<Self> {
        let pool = PgPool::connect(db_url).await?;
        Ok(Self { pool })
    }

    pub fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        Self::generate_create_table_sql_static(table)
    }

    pub fn generate_create_table_sql_static(table: &TableMetadata) -> String {
        let mut sql = String::new();
        sql.push_str(&format!("CREATE TABLE IF NOT EXISTS store_{} (\n", table.name));
        
        let mut field_definitions = Vec::new();
        
        // Add all fields
        for field in &table.fields {
            let sql_type = Self::get_sql_type_static(&field.field_type);
            field_definitions.push(format!("    {} {}", field.field_name, sql_type));
        }
        
        // Add system fields for tracking
        field_definitions.push("    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP".to_string());
        field_definitions.push("    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP".to_string());
        field_definitions.push("    last_updated_checkpoint BIGINT".to_string());
        field_definitions.push("    is_deleted BOOLEAN DEFAULT FALSE".to_string());
        
        // Join all field definitions
        sql.push_str(&field_definitions.join(",\n"));
        
        // Add primary key constraint
        if table.table_type == "resource" && !table.fields.iter().any(|field| field.is_key) {
            // Special case for resource type without key fields: set all fields as PRIMARY KEY
            let all_field_names: Vec<String> = table
                .fields
                .iter()
                .map(|field| field.field_name.clone())
                .collect();
            
            if !all_field_names.is_empty() {
                sql.push_str(",\n    PRIMARY KEY (");
                sql.push_str(&all_field_names.join(", "));
                sql.push(')');
            }
        } else if table.fields.iter().any(|field| field.is_key) {
            // Case with key fields: use key fields as PRIMARY KEY
            let key_fields: Vec<_> = table.fields.iter()
                .filter(|f| f.is_key)
                .map(|f| f.field_name.clone())
                .collect();
                
            if !key_fields.is_empty() {
                sql.push_str(",\n    PRIMARY KEY (");
                sql.push_str(&key_fields.join(", "));
                sql.push(')');
            }
        } else {
            // Case without key fields: use non-key fields as PRIMARY KEY
            let value_fields: Vec<_> = table.fields.iter()
                .filter(|f| !f.is_key)
                .map(|f| f.field_name.clone())
                .collect();
                
            if !value_fields.is_empty() {
                sql.push_str(",\n    PRIMARY KEY (");
                sql.push_str(&value_fields.join(", "));
                sql.push(')');
            }
        }
        
        sql.push_str("\n)");
        sql
    }

    fn get_sql_type(&self, type_: &str) -> String {
        Self::get_sql_type_static(type_)
    }

    fn get_sql_type_static(type_: &str) -> String {
        match type_ {
            "u8" => "SMALLINT",
            "u16" => "INTEGER", 
            "u32" => "BIGINT",
            "u64" => "BIGINT",
            "u128" => "TEXT",
            "u256" => "TEXT",
            "vector<u8>" => "SMALLINT[]",
            "vector<u16>" => "INTEGER[]",
            "vector<u32>" => "BIGINT[]",
            "vector<u64>" => "BIGINT[]",
            "vector<u128>" => "TEXT[]",
            "vector<u256>" => "TEXT[]",
            "vector<bool>" => "BOOLEAN[]",
            "vector<address>" => "TEXT[]",
            "bool" => "BOOLEAN",
            "address" => "TEXT",
            _ => "TEXT", // Default for enums and other types
        }
        .to_string()
    }

    // Setup simple logging function for debugging
    async fn setup_simple_logging(&self) -> Result<()> {
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

        self.execute(create_log_function).await?;
        log::debug!("✅ Simplified log function created");
        Ok(())
    }

    // Create data change notification trigger for unified realtime engine
    async fn create_realtime_trigger(&self, table_name: &str) -> Result<()> {
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

        self.execute(create_notify_function).await?;

        let trigger_name = format!("_unified_realtime_{}", table_name);

        // Delete old trigger
        let drop_trigger = format!("DROP TRIGGER IF EXISTS {} ON {}", trigger_name, table_name);
        self.execute(&drop_trigger).await?;

        // Create unified realtime engine trigger
        let create_trigger = format!(
            r#"CREATE TRIGGER {}
            AFTER INSERT OR UPDATE OR DELETE
            ON {}
            FOR EACH ROW
            EXECUTE FUNCTION unified_realtime_notify()"#,
            trigger_name, table_name
        );

        self.execute(&create_trigger).await?;
        log::debug!("✅ Unified realtime engine trigger created: {}", table_name);

        Ok(())
    }

    pub fn generate_insert_sql_static(table_name: &str, values: &[DBData], last_updated_checkpoint: u64) -> String {
        // Add store_ prefix to table name for PostgreSQL
        let prefixed_table_name = format!("store_{}", table_name);
        
        // Build column names and values
        let column_names: Vec<String> = values.iter().map(|d| d.column_name.clone()).collect();
        let column_values: Vec<String> = values.iter().map(|d| d.column_value.to_string()).collect();
        
        // Build SET clause (for UPDATE)
        let set_clause: Vec<String> = values.iter()
            .map(|d| format!("{} = {}", d.column_name, d.column_value.to_string()))
            .collect();
        
        // Add system fields
        let mut final_column_names = column_names.clone();
        final_column_names.push("updated_at".to_string());
        final_column_names.push("last_updated_checkpoint".to_string());
        
        let mut final_column_values = column_values.clone();
        final_column_values.push("CURRENT_TIMESTAMP".to_string());
        final_column_values.push(last_updated_checkpoint.to_string());
        
        let mut final_set_clause = set_clause.clone();
        final_set_clause.push("updated_at = CURRENT_TIMESTAMP".to_string());
        final_set_clause.push(format!("last_updated_checkpoint = {}", last_updated_checkpoint));
        
        // Build primary key columns
        let key_columns: Vec<String> = if values.iter().any(|d| d.is_primary_key) {
            // If there are explicit primary key fields, use them
            values.iter()
                .filter(|d| d.is_primary_key)
                .map(|d| d.column_name.clone())
                .collect()
        } else {
            // For resource tables without explicit keys, use all fields as primary key
            values.iter()
                .map(|d| d.column_name.clone())
                .collect()
        };
        
        // For resource tables without explicit keys, use DELETE + INSERT to ensure single record
        if !values.iter().any(|d| d.is_primary_key) {
            // For resource tables without explicit keys, we need to execute DELETE and INSERT separately
            // Return a special marker that will be handled in the insert method
            format!(
                "RESOURCE_DELETE_INSERT:{}:{}:{}",
                prefixed_table_name,
                final_column_names.join(","),
                final_column_values.join(",")
            )
        } else {
            // Use normal UPSERT for tables with explicit primary keys
            format!(
                "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({}) DO UPDATE SET {}",
                prefixed_table_name,
                final_column_names.join(", "),
                final_column_values.join(", "),
                key_columns.join(", "),
                final_set_clause.join(", ")
            )
        }
    }


    pub fn generate_insert_table_fields_sql(table: &TableMetadata) -> Vec<String> {
        let mut sql_statements = Vec::new();

        // Add key fields
        for field in &table.fields {
            sql_statements.push(format!(
                "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) \
                VALUES ('{}', '{}', '{}', '{}', {})",
                table.name, field.field_name, field.field_type, field.field_index, field.is_key
            ));
        }

        sql_statements
    }

    fn column_to_json_value(row: &sqlx::postgres::PgRow, column_index: usize) -> serde_json::Value {
        
        if let Ok(value) = row.try_get::<serde_json::Value, _>(column_index) {
            return value;
        }

        // 尝试常见的类型转换，不依赖类型信息
        if let Ok(value) = row.try_get::<bool, _>(column_index) {
            return serde_json::Value::Bool(value);
        }
        if let Ok(value) = row.try_get::<i16, _>(column_index) {
            return serde_json::Value::Number(serde_json::Number::from(value));
        }
        if let Ok(value) = row.try_get::<i32, _>(column_index) {
            return serde_json::Value::Number(serde_json::Number::from(value));
        }
        if let Ok(value) = row.try_get::<i64, _>(column_index) {
            return serde_json::Value::Number(serde_json::Number::from(value));
        }
        if let Ok(value) = row.try_get::<f32, _>(column_index) {
            return serde_json::Value::Number(serde_json::Number::from_f64(value as f64).unwrap_or(serde_json::Number::from(0)));
        }
        if let Ok(value) = row.try_get::<f64, _>(column_index) {
            return serde_json::Value::Number(serde_json::Number::from_f64(value).unwrap_or(serde_json::Number::from(0)));
        }
        if let Ok(value) = row.try_get::<String, _>(column_index) {
            return serde_json::Value::String(value);
        }

        serde_json::Value::Null
    }
}

#[async_trait]
impl Storage for PostgresStorage {
    type Database = Postgres;

    fn pool(&self) -> &Pool<Postgres> {
        &self.pool
    }

    async fn execute(&self, sql: &str) -> Result<()> {
        sqlx::query(sql).execute(&self.pool).await?;
        Ok(())
    }

    async fn create_tables(&self, tables: &[TableMetadata]) -> Result<()> {
        for table in tables {
            let sql = self.generate_create_table_sql(table);
            log::debug!("Creating table with SQL: {}", sql);
            self.execute(&sql).await?;

            let sql =  r#"CREATE TABLE IF NOT EXISTS table_fields (
                table_name VARCHAR(255),
                field_name VARCHAR(255),
                field_type VARCHAR(50),
                field_index INTEGER,
                is_key BOOLEAN,
                PRIMARY KEY (table_name, field_name)
            )"#;
            self.execute(&sql).await?;

            let sql = Self::generate_insert_table_fields_sql(table);
            for sql in sql {
                self.execute(&sql).await?;
            }
            
            // Setup logging and realtime triggers for the created table
            let table_name = format!("store_{}", table.name);
            self.setup_simple_logging().await?;
            self.create_realtime_trigger(&table_name).await?;
        }
        Ok(())
    }

    fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        PostgresStorage::generate_create_table_sql(self, table)
    }

    async fn insert(&self, table_name: &str, values: Vec<DBData>, last_updated_checkpoint: u64) -> Result<()> {
        let sql = PostgresStorage::generate_insert_sql_static(table_name, &values, last_updated_checkpoint);
        log::info!("Generated UPSERT SQL: {}", sql);
        
        // Check if this is a special resource DELETE + INSERT operation
        if sql.starts_with("RESOURCE_DELETE_INSERT:") {
            // Parse the special format: RESOURCE_DELETE_INSERT:table_name:column_names:column_values
            let parts: Vec<&str> = sql.split(':').collect();
            if parts.len() >= 4 {
                let actual_table_name = parts[1];
                let column_names = parts[2];
                let column_values = parts[3];
                
                // Execute DELETE first
                let delete_sql = format!("DELETE FROM {}", actual_table_name);
                log::debug!("Executing DELETE: {}", delete_sql);
                self.execute(&delete_sql).await?;
                
                // Then execute INSERT
                let insert_sql = format!(
                    "INSERT INTO {} ({}) VALUES ({})",
                    actual_table_name, column_names, column_values
                );
                log::debug!("Executing INSERT: {}", insert_sql);
                self.execute(&insert_sql).await?;
            }
        } else {
            // Normal UPSERT operation
            self.execute(&sql).await?;
        }
        
        Ok(())
    }

    async fn query(&self, sql: &str) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query(sql)
            .fetch_all(&self.pool)
            .await?;
            
        let mut results = Vec::new();
        for row in rows {
            let mut row_data = serde_json::Map::new();
            
            // Get column names and values
            for (i, column) in row.columns().iter().enumerate() {
                let column_name = column.name();
                
                // 使用新的 column_to_json_value 方法
                let json_value = Self::column_to_json_value(&row, i);
                row_data.insert(column_name.to_string(), json_value);
            }
            
            results.push(serde_json::Value::Object(row_data));
        }
        
        Ok(results)
    }

    fn get_sql_type(&self, type_: &str) -> String {
       match type_ {
        "u8" => "SMALLINT",
        "u16" => "INTEGER", 
        "u32" => "BIGINT",
        "u64" => "BIGINT",
        "u128" => "TEXT",
        "u256" => "TEXT",
        "bool" => "BOOLEAN",
        "address" => "TEXT",
        "vector<u8>" => "SMALLINT[]",
        "vector<u16>" => "INTEGER[]",
        "vector<u32>" => "BIGINT[]",
        "vector<u64>" => "BIGINT[]",
        "vector<u128>" => "TEXT[]",
        "vector<u256>" => "TEXT[]",
        "vector<bool>" => "BOOLEAN[]",
        "vector<address>" => "TEXT[]",
        _ => "TEXT",
       }
       .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::table::{TableField, TableMetadata};
    use std::collections::HashMap;

    #[test]
    fn test_generate_create_table_sql_for_resource_without_keys() {
        // Test SQL generation logic directly
        let table = TableMetadata {
            name: "counter".to_string(),
            table_type: "resource".to_string(),
            fields: vec![
                TableField {
                    field_name: "value".to_string(),
                    field_type: "u32".to_string(),
                    field_index: 0,
                    is_key: false,
                    is_enum: false,
                }
            ],
            enums: HashMap::new(),
            offchain: false,
        };
        
        // Create a dummy storage instance for testing
        // We'll use a mock approach since we can't easily create a real pool in tests
        let sql = PostgresStorage::generate_create_table_sql_static(&table);
        
        println!("Generated SQL: {}", sql);
        
        // Verify SQL contains store_ prefix and all fields as PRIMARY KEY
        assert!(sql.contains("CREATE TABLE IF NOT EXISTS store_counter"));
        assert!(sql.contains("PRIMARY KEY (value)"));
        assert!(sql.contains("value BIGINT"));
        assert!(sql.contains("created_at TIMESTAMP"));
        assert!(sql.contains("updated_at TIMESTAMP"));
    }

    #[test]
    fn test_insert_sql_generation() {
        use crate::sql::DBData;
        use crate::primitives::ParsedMoveValue;
        
        // Test data with primary key
        let values = vec![
            DBData::new(
                "id".to_string(),
                "u64".to_string(),
                ParsedMoveValue::U64(123),
                true, // is_primary_key
            ),
            DBData::new(
                "name".to_string(),
                "String".to_string(),
                ParsedMoveValue::String("test".to_string()),
                false, // is_primary_key
            ),
        ];
        
        // Test with primary key (all tables have primary keys)
        let sql = PostgresStorage::generate_insert_sql_static("test_table", &values, 1000);
        println!("Generated SQL: {}", sql);
        
        // Should always contain ON CONFLICT clause since all tables have primary keys
        assert!(sql.contains("ON CONFLICT (id)"));
        assert!(sql.contains("DO UPDATE SET"));
        assert!(sql.contains("name = 'test'"));
        assert!(sql.contains("last_updated_checkpoint = 1000"));
        assert!(sql.contains("updated_at = CURRENT_TIMESTAMP"));
    }

    #[test]
    fn test_insert_sql_generation_resource_without_keys() {
        use crate::sql::DBData;
        use crate::primitives::ParsedMoveValue;
        
        // Test data for resource table without key fields (all fields become primary key)
        let values = vec![
            DBData::new(
                "value".to_string(),
                "u32".to_string(),
                ParsedMoveValue::U32(1),
                false, // is_primary_key = false, but should be treated as primary key for resource tables
            ),
        ];
        
        // Test resource table without explicit keys
        let sql = PostgresStorage::generate_insert_sql_static("resource0", &values, 4255);
        println!("Generated SQL for resource without keys: {}", sql);
        
        // Should use RESOURCE_DELETE_INSERT marker for resource tables without explicit keys
        assert!(sql.starts_with("RESOURCE_DELETE_INSERT:"));
        assert!(sql.contains("store_resource0"));
        assert!(sql.contains("1,"));
        assert!(sql.contains("4255"));
        assert!(sql.contains("CURRENT_TIMESTAMP"));
        
        // Should NOT contain ON CONFLICT for resource tables without explicit keys
        assert!(!sql.contains("ON CONFLICT"));
    }

    #[test]
    fn test_resource_table_single_record_behavior() {
        use crate::sql::DBData;
        use crate::primitives::ParsedMoveValue;
        
        // Simulate multiple inserts to the same resource table
        let values1 = vec![
            DBData::new(
                "value".to_string(),
                "u32".to_string(),
                ParsedMoveValue::U32(1),
                false, // No explicit primary key
            ),
        ];
        
        let values2 = vec![
            DBData::new(
                "value".to_string(),
                "u32".to_string(),
                ParsedMoveValue::U32(2),
                false, // No explicit primary key
            ),
        ];
        
        let sql1 = PostgresStorage::generate_insert_sql_static("resource0", &values1, 1000);
        let sql2 = PostgresStorage::generate_insert_sql_static("resource0", &values2, 2000);
        
        println!("First insert: {}", sql1);
        println!("Second insert: {}", sql2);
        
        // Both should use RESOURCE_DELETE_INSERT marker for resource tables without explicit keys
        assert!(sql1.starts_with("RESOURCE_DELETE_INSERT:"));
        assert!(sql2.starts_with("RESOURCE_DELETE_INSERT:"));
        assert!(sql1.contains("store_resource0"));
        assert!(sql2.contains("store_resource0"));
        
        // Should NOT contain ON CONFLICT for resource tables without explicit keys
        assert!(!sql1.contains("ON CONFLICT"));
        assert!(!sql2.contains("ON CONFLICT"));
        
        // Values should be different (in the marker format)
        assert!(sql1.contains("1,"));
        assert!(sql2.contains("2,"));
        
        // Checkpoints should be different (in the marker format)
        assert!(sql1.contains("1000"));
        assert!(sql2.contains("2000"));
        
        // This demonstrates that:
        // 1. First insert: DELETE FROM resource0; INSERT INTO resource0 (value, ...) VALUES (1, ...)
        // 2. Second insert: DELETE FROM resource0; INSERT INTO resource0 (value, ...) VALUES (2, ...)
        // 3. Each operation ensures only one record exists in the table
        // 4. The table will always have exactly one record, regardless of field values
    }
}
