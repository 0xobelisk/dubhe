use async_trait::async_trait;
use serde_json::Value;
use crate::table::TableMetadata;
use crate::sql::DBData;
use anyhow::Result;
use sqlx::Pool;

#[async_trait]
pub trait Storage: Send + Sync {
    /// Get the database connection pool
    fn pool(&self) -> &Pool<Self::Database>;
    
    /// Get the database type
    type Database: sqlx::Database;
    
    /// Execute SQL statement
    async fn execute(&self, sql: &str) -> Result<()>;

    /// Create tables from configuration
    async fn create_tables(&self, tables: &[TableMetadata]) -> Result<()>;
    
    /// Insert data into a table
    async fn insert(&self, table_name: &str, values: Vec<DBData>, last_updated_checkpoint: u64) -> Result<()>;


    /// Get sql type
    fn get_sql_type(&self, type_: &str) -> String;
    
    /// Generate CREATE TABLE SQL for a table
    fn generate_create_table_sql(&self, table: &TableMetadata) -> String;
} 