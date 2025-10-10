use crate::sql::DBData;
use crate::table::{DubheConfig, TableMetadata};
use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;
use sqlx::Pool;
use std::collections::HashMap;

#[async_trait]
pub trait Storage: Send + Sync {
    /// Get the database connection pool
    fn pool(&self) -> &Pool<Self::Database>;

    /// Get the database type
    type Database: sqlx::Database;

    /// Execute SQL statement
    async fn execute(&self, sql: &str) -> Result<()>;

    /// Create tables from configuration
    async fn create_tables(&self, tables: &DubheConfig) -> Result<()>;

    /// Insert data into a table
    async fn insert(
        &self,
        table_name: &str,
        values: Vec<DBData>,
        last_updated_checkpoint: u64,
    ) -> Result<()>;

    /// Execute raw SQL query and return results
    async fn query(&self, sql: &str) -> Result<Vec<serde_json::Value>>;

    /// Get sql type
    fn get_sql_type(&self, type_: &str) -> String;

    /// Generate CREATE TABLE SQL for a table
    fn generate_create_table_sql(&self, table: &TableMetadata) -> String;

    /// Clear all tables and triggers from the database
    async fn clear(&self) -> Result<()>;
}
