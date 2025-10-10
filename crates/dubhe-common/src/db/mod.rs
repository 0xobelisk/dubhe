mod postgres;
mod sqlite;
mod traits;

pub use postgres::PostgresStorage;
pub use sqlite::SqliteStorage;
pub use traits::Storage;

use crate::sql::DBData;
use crate::table::DubheConfig;
use crate::table::TableMetadata;
use anyhow::Result;
use std::collections::HashMap;

/// Database storage enum that supports both SQLite and PostgreSQL
pub enum Database {
    Sqlite(SqliteStorage),
    Postgres(PostgresStorage),
}

impl Database {
    /// Create a new database instance based on the URL
    pub async fn new(db_url: &str) -> Result<Self> {
        if db_url.starts_with("postgres://") || db_url.starts_with("postgresql://") {
            let storage = PostgresStorage::new(db_url).await?;
            Ok(Database::Postgres(storage))
        } else {
            let storage = SqliteStorage::new(db_url).await?;
            Ok(Database::Sqlite(storage))
        }
    }

    /// Execute SQL statement
    pub async fn execute(&self, sql: &str) -> Result<()> {
        match self {
            Database::Sqlite(storage) => storage.execute(sql).await,
            Database::Postgres(storage) => storage.execute(sql).await,
        }
    }

    /// Create tables from configuration
    pub async fn create_tables(&self, tables: &DubheConfig) -> Result<()> {
        match self {
            Database::Sqlite(storage) => storage.create_tables(tables).await,
            Database::Postgres(storage) => storage.create_tables(tables).await,
        }
    }

    /// Insert data into a table
    pub async fn insert(
        &self,
        table_name: &str,
        values: Vec<DBData>,
        last_updated_checkpoint: u64,
    ) -> Result<()> {
        match self {
            Database::Sqlite(storage) => {
                storage
                    .insert(table_name, values, last_updated_checkpoint)
                    .await
            }
            Database::Postgres(storage) => {
                storage
                    .insert(table_name, values, last_updated_checkpoint)
                    .await
            }
        }
    }

    /// Generate CREATE TABLE SQL for a table
    pub fn generate_create_table_sql(&self, table: &TableMetadata) -> String {
        match self {
            Database::Sqlite(storage) => storage.generate_create_table_sql(table),
            Database::Postgres(storage) => storage.generate_create_table_sql(table),
        }
    }

    /// Execute SQL query
    pub async fn query(&self, sql: &str) -> Result<Vec<serde_json::Value>> {
        match self {
            Database::Sqlite(storage) => storage.query(sql).await,
            Database::Postgres(storage) => storage.query(sql).await,
        }
    }

    /// Count rows in a table with optional WHERE clause
    pub async fn count_rows(&self, table_name: &str, where_clause: &str) -> Result<u64> {
        let sql = if where_clause.is_empty() {
            format!("SELECT COUNT(*) as count FROM {}", table_name)
        } else {
            format!(
                "SELECT COUNT(*) as count FROM {}{}",
                table_name, where_clause
            )
        };

        match self.query(&sql).await {
            Ok(results) => {
                if let Some(first_row) = results.first() {
                    if let Some(count_value) = first_row.get("count") {
                        if let Some(count) = count_value.as_u64() {
                            return Ok(count);
                        }
                        if let Some(count) = count_value.as_i64() {
                            return Ok(count as u64);
                        }
                    }
                }
                Ok(0)
            }
            Err(e) => Err(e),
        }
    }

    /// Get database type name
    pub fn db_type(&self) -> &'static str {
        match self {
            Database::Sqlite(_) => "sqlite",
            Database::Postgres(_) => "postgres",
        }
    }

    /// Clear all tables and triggers from the database
    pub async fn clear(&self) -> Result<()> {
        match self {
            Database::Sqlite(storage) => storage.clear().await,
            Database::Postgres(storage) => storage.clear().await,
        }
    }

    pub async fn is_empty(&self) -> Result<bool> {
        let exists_query = "
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'table_fields'
            )
        ";
        match self {
            Database::Sqlite(storage) => Ok(sqlx::query_scalar(exists_query)
                .fetch_one(storage.pool())
                .await?),
            Database::Postgres(storage) => Ok(sqlx::query_scalar(exists_query)
                .fetch_one(storage.pool())
                .await?),
        }
    }
}
