use sqlx::{Pool, Postgres, PgPool};
use crate::db::Storage;
use async_trait::async_trait;
use anyhow::Result;
use crate::table::TableMetadata;
use crate::sql::DBData;
use serde_json::Value;

pub struct PostgresStorage {
    pool: Pool<Postgres>,
}

impl PostgresStorage {
    pub async fn new(db_url: &str) -> Result<Self> {
        let pool = PgPool::connect(db_url).await?;
        Ok(Self { pool })
    }

    pub fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        let mut sql = String::new();
        sql.push_str(&format!("CREATE TABLE IF NOT EXISTS {} (\n", table.name));
        
        let mut field_definitions = Vec::new();
        
        // Add all fields
        for field in &table.fields {
            let sql_type = self.get_sql_type(&field.field_type);
            field_definitions.push(format!("    {} {}", field.field_name, sql_type));
        }
        
        // Add system fields for tracking
        field_definitions.push("    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP".to_string());
        field_definitions.push("    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP".to_string());
        field_definitions.push("    last_updated_checkpoint BIGINT".to_string());
        field_definitions.push("    is_deleted BOOLEAN DEFAULT FALSE".to_string());
        
        // Join all field definitions
        sql.push_str(&field_definitions.join(",\n"));
        
        // Add primary key if we have key fields
        let key_fields: Vec<_> = table.fields.iter()
            .filter(|f| f.is_key)
            .map(|f| f.field_name.clone())
            .collect();
            
        if !key_fields.is_empty() {
            sql.push_str(",\n    PRIMARY KEY (");
            sql.push_str(&key_fields.join(", "));
            sql.push(')');
        }
        
        sql.push_str("\n)");
        sql
    }

    fn get_sql_type(&self, type_: &str) -> String {
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
        }
        Ok(())
    }

    fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        self.generate_create_table_sql(table)
    }

    async fn insert(&self, table_name: &str, values: Vec<DBData>, last_updated_checkpoint: u64) -> Result<()> {
        Ok(())
    }

    fn get_sql_type(&self, type_: &str) -> String {
        // self.get_sql_type(type_)
        "TEXT".to_string()
    }
}
