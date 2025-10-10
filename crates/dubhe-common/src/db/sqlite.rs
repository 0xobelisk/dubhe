use crate::db::Storage;
use crate::sql::DBData;
use crate::table::DubheConfig;
use crate::table::TableMetadata;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::{Column, Pool, Row, Sqlite, SqlitePool, TypeInfo};
use std::collections::HashMap;

pub struct SqliteStorage {
    pool: Pool<Sqlite>,
}

impl SqliteStorage {
    pub async fn new(db_url: &str) -> Result<Self> {
        // Connect to the SQLite database
        // If the database file does not exist, it will be created automatically
        // Note: For SQLite, the db_url can be a file path or "sqlite::memory:" for in-memory database

        log::info!("Connecting to SQLite database at {}", db_url);
        if db_url.is_empty() || !db_url.starts_with("sqlite:") {
            return Err(anyhow::anyhow!(
                "Database URL cannot be empty or must start with 'sqlite:'"
            ));
        }
        if db_url == "sqlite::memory:" {
            log::info!("Using in-memory SQLite database");
        } else {
            let db_file_path = db_url.strip_prefix("sqlite:").unwrap_or(db_url);
            log::info!("Using SQLite database file at {}", db_file_path);
            // Check if the file exists, if not it will be created
            if !std::path::Path::new(db_file_path).exists() {
                log::warn!(
                    "Database file does not exist, it will be created at {}",
                    db_file_path
                );
                // Create the file if it doesn't exist, for example /tmp/indexer.db
                std::fs::File::create(db_file_path)?;
                log::info!("Created directory for SQLite database at {}", db_file_path);
            }
        }
        let pool = SqlitePool::connect(db_url).await?;
        Ok(Self { pool })
    }

    fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        let mut sql = String::new();
        sql.push_str(&format!("CREATE TABLE IF NOT EXISTS {} (\n", table.name));

        let mut field_definitions = Vec::new();

        // Add all fields
        for field in &table.fields {
            let sql_type = self.get_sql_type(&field.field_type);
            field_definitions.push(format!("    {} {}", field.field_name, sql_type));
        }

        // Add system fields for tracking
        field_definitions.push("    created_at DATETIME DEFAULT CURRENT_TIMESTAMP".to_string());
        field_definitions.push("    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP".to_string());
        field_definitions.push("    last_updated_checkpoint INTEGER".to_string());
        field_definitions.push("    is_deleted BOOLEAN DEFAULT 0".to_string());

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
            let key_fields: Vec<_> = table
                .fields
                .iter()
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
            let value_fields: Vec<_> = table
                .fields
                .iter()
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
        let sql_type = match type_ {
            "u8" => "INTEGER",
            "u16" => "INTEGER",
            "u32" => "INTEGER",
            "u64" => "TEXT",
            "u128" => "TEXT",
            "u256" => "TEXT",
            "address" => "TEXT",
            "String" => "TEXT",
            "bool" => "BOOLEAN",
            "vector<u8>" => "TEXT",
            "vector<u16>" => "TEXT",
            "vector<u32>" => "TEXT",
            "vector<u64>" => "TEXT",
            "vector<u128>" => "TEXT",
            "vector<u256>" => "TEXT",
            "vector<bool>" => "TEXT",
            "vector<address>" => "TEXT",
            _ => "TEXT",
        };
        sql_type.to_string()
    }

    fn column_to_json_value(
        &self,
        row: &sqlx::sqlite::SqliteRow,
        column_index: usize,
    ) -> serde_json::Value {
        if let Ok(value) = row.try_get::<serde_json::Value, _>(column_index) {
            return value;
        }

        let column = row.columns().get(column_index);
        if let Some(col) = column {
            let type_name = col.type_info().name();

            match type_name {
                "BOOLEAN" | "BOOL" => {
                    if let Ok(value) = row.try_get::<bool, _>(column_index) {
                        return serde_json::Value::Bool(value);
                    }
                    if let Ok(value) = row.try_get::<i64, _>(column_index) {
                        return serde_json::Value::Bool(value != 0);
                    }
                }
                "INTEGER" | "INT" => {
                    if let Ok(value) = row.try_get::<i64, _>(column_index) {
                        return serde_json::Value::Number(serde_json::Number::from(value));
                    }
                }
                "REAL" | "FLOAT" | "DOUBLE" => {
                    if let Ok(value) = row.try_get::<f64, _>(column_index) {
                        return serde_json::Value::Number(
                            serde_json::Number::from_f64(value)
                                .unwrap_or(serde_json::Number::from(0)),
                        );
                    }
                }
                "TEXT" | "VARCHAR" | "STRING" => {
                    if let Ok(value) = row.try_get::<String, _>(column_index) {
                        return serde_json::Value::String(value);
                    }
                }
                _ => {
                    if let Ok(value) = row.try_get::<i64, _>(column_index) {
                        return serde_json::Value::Number(serde_json::Number::from(value));
                    }
                    if let Ok(value) = row.try_get::<f64, _>(column_index) {
                        return serde_json::Value::Number(
                            serde_json::Number::from_f64(value)
                                .unwrap_or(serde_json::Number::from(0)),
                        );
                    }
                    if let Ok(value) = row.try_get::<String, _>(column_index) {
                        return serde_json::Value::String(value);
                    }
                    if let Ok(value) = row.try_get::<bool, _>(column_index) {
                        return serde_json::Value::Bool(value);
                    }
                }
            }
        }

        serde_json::Value::Null
    }
}

#[async_trait]
impl Storage for SqliteStorage {
    type Database = Sqlite;

    fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    async fn execute(&self, sql: &str) -> Result<()> {
        sqlx::query(sql).execute(&self.pool).await?;
        Ok(())
    }

    async fn create_tables(&self, tables: &DubheConfig) -> Result<()> {
        todo!()
    }

    fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        SqliteStorage::generate_create_table_sql(self, table)
    }

    async fn insert(
        &self,
        table_name: &str,
        values: Vec<DBData>,
        last_updated_checkpoint: u64,
    ) -> Result<()> {
        // Build column names and values
        let column_names: Vec<String> = values.iter().map(|d| d.column_name.clone()).collect();
        let column_values: Vec<String> =
            values.iter().map(|d| d.column_value.to_string()).collect();

        // Build SET clause (for UPDATE)
        let set_clause: Vec<String> = values
            .iter()
            .map(|d| format!("{} = {}", d.column_name, d.column_value.to_string()))
            .collect();

        // Build WHERE clause (based on primary key)
        let key_columns: Vec<String> = values
            .iter()
            .filter(|d| d.is_primary_key)
            .map(|d| d.column_name.clone())
            .collect();

        let _where_clause: Vec<String> = values
            .iter()
            .filter(|d| d.is_primary_key)
            .map(|d| format!("{} = {}", d.column_name, &d.column_value.to_string()))
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
        final_set_clause.push(format!(
            "last_updated_checkpoint = {}",
            last_updated_checkpoint
        ));

        // Build UPSERT SQL statement
        let sql = if !key_columns.is_empty() {
            // Case with primary key: use INSERT OR REPLACE
            format!(
                "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                table_name,
                final_column_names.join(", "),
                final_column_values.join(", ")
            )
        } else {
            // Case without primary key: use INSERT
            format!(
                "INSERT INTO {} ({}) VALUES ({})",
                table_name,
                final_column_names.join(", "),
                final_column_values.join(", ")
            )
        };

        // Execute SQL
        self.execute(&sql).await?;

        Ok(())
    }

    async fn query(&self, sql: &str) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query(sql).fetch_all(&self.pool).await?;

        let mut results = Vec::new();
        for row in rows {
            let mut row_data = serde_json::Map::new();

            // Get column names and values
            for (i, column) in row.columns().iter().enumerate() {
                let column_name = column.name();

                // Use the new column_to_json_value method
                let json_value = self.column_to_json_value(&row, i);
                row_data.insert(column_name.to_string(), json_value);
            }

            results.push(serde_json::Value::Object(row_data));
        }

        Ok(results)
    }

    fn get_sql_type(&self, type_: &str) -> String {
        let sql_type = match type_ {
            "u8" => "INTEGER",
            "u16" => "INTEGER",
            "u32" => "INTEGER",
            "u64" => "TEXT",
            "u128" => "TEXT",
            "u256" => "TEXT",
            "address" => "TEXT",
            "String" => "TEXT",
            "bool" => "BOOLEAN",
            "vector<u8>" => "TEXT",
            "vector<u16>" => "TEXT",
            "vector<u32>" => "TEXT",
            "vector<u64>" => "TEXT",
            "vector<u128>" => "TEXT",
            "vector<u256>" => "TEXT",
            "vector<bool>" => "TEXT",
            "vector<address>" => "TEXT",
            _ => "TEXT",
        };
        sql_type.to_string()
    }

    async fn clear(&self) -> Result<()> {
        log::info!("🧹 Starting SQLite database cleanup...");

        // Get all tables that start with 'store_' (user tables)
        let get_tables_sql = r#"
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE 'store_%'
        "#;

        let tables = self.query(get_tables_sql).await?;

        // Drop all store_ tables
        for table_row in tables {
            if let Some(table_name) = table_row.get("name").and_then(|v| v.as_str()) {
                let drop_table_sql = format!("DROP TABLE IF EXISTS {}", table_name);
                self.execute(&drop_table_sql).await?;
                log::debug!("✅ Dropped table: {}", table_name);
            }
        }

        // Drop the table_fields metadata table (if it exists)
        let drop_table_fields_sql = "DROP TABLE IF EXISTS table_fields";
        self.execute(drop_table_fields_sql).await?;
        log::debug!("✅ Dropped table_fields metadata table");

        log::info!("🧹 SQLite database cleanup completed successfully");
        Ok(())
    }
}
