mod traits;
mod sqlite;
mod postgres;

pub use traits::Storage;
pub use sqlite::SqliteStorage;
pub use postgres::PostgresStorage;

use anyhow::Result;
use crate::table::TableMetadata;
use crate::sql::DBData;
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
    pub async fn create_tables(&self, tables: &[TableMetadata]) -> Result<()> {
        match self {
            Database::Sqlite(storage) => storage.create_tables(tables).await,
            Database::Postgres(storage) => storage.create_tables(tables).await,
        }
    }

    /// Insert data into a table
    pub async fn insert(&self, table_name: &str, values: Vec<DBData>, last_updated_checkpoint: u64) -> Result<()> {
        match self {
            Database::Sqlite(storage) => storage.insert(table_name, values, last_updated_checkpoint).await,
            Database::Postgres(storage) => storage.insert(table_name, values, last_updated_checkpoint).await,
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
            format!("SELECT COUNT(*) as count FROM {}{}", table_name, where_clause)
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::table::TableMetadata;
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_sqlite_storage() {
        // Use memory database for testing
        let storage = SqliteStorage::new("sqlite::memory:").await.unwrap();
        
        // Test basic connection
        storage.execute("SELECT 1").await.unwrap();
        
        // Test table creation
        let table = TableMetadata {
            name: "test_table".to_string(),
            table_type: "component".to_string(),
            fields: vec![
                crate::table::TableField {
                    field_name: "id".to_string(),
                    field_type: "u64".to_string(),
                    field_index: 0,
                    is_key: true,
                    is_enum: false,
                },
                crate::table::TableField {
                    field_name: "name".to_string(),
                    field_type: "String".to_string(),
                    field_index: 1,
                    is_key: false,
                    is_enum: false,
                },
            ],
            enums: HashMap::new(),
            offchain: false,
        };
        
        storage.create_tables(&[table]).await.unwrap();
    }

    #[tokio::test]
    async fn test_database_enum() {
        // Test SQLite database
        let db = Database::new("sqlite::memory:").await.unwrap();
        assert_eq!(db.db_type(), "sqlite");
        
        // Test basic operations
        db.execute("SELECT 1").await.unwrap();
        
        // Test table creation
        let table = TableMetadata {
            name: "test_table".to_string(),
            table_type: "component".to_string(),
            fields: vec![
                crate::table::TableField {
                    field_name: "id".to_string(),
                    field_type: "u64".to_string(),
                    field_index: 0,
                    is_key: true,
                    is_enum: false,
                },
                crate::table::TableField {
                    field_name: "name".to_string(),
                    field_type: "String".to_string(),
                    field_index: 1,
                    is_key: false,
                    is_enum: false,
                },
            ],
            enums: HashMap::new(),
            offchain: false,
        };
        
        db.create_tables(&[table]).await.unwrap();
    }

    #[tokio::test]
    async fn test_sqlite_file_storage() {
        // Test with file database in current directory
        let db_path = "test_sqlite_file.db";
        
        // Clean up any existing file
        let _ = std::fs::remove_file(db_path);
        
        let storage = SqliteStorage::new(&format!("sqlite:{}", db_path)).await.unwrap();
        
        // Test basic connection
        storage.execute("SELECT 1").await.unwrap();
        
        // Test table creation
        let table = TableMetadata {
            name: "test_table".to_string(),
            table_type: "component".to_string(),
            fields: vec![
                crate::table::TableField {
                    field_name: "id".to_string(),
                    field_type: "u64".to_string(),
                    field_index: 0,
                    is_key: true,
                    is_enum: false,
                },
                crate::table::TableField {
                    field_name: "name".to_string(),
                    field_type: "String".to_string(),
                    field_index: 1,
                    is_key: false,
                    is_enum: false,
                },
            ],
            enums: HashMap::new(),
            offchain: false,
        };
        
        storage.create_tables(&[table]).await.unwrap();
        
        // Clean up
        let _ = std::fs::remove_file(db_path);
    }

    #[tokio::test]
    async fn test_postgres_storage() {
        // Skip if no PostgreSQL connection available
        if std::env::var("DATABASE_URL").is_err() {
            return;
        }
        
        let db_url = std::env::var("DATABASE_URL").unwrap();
        let storage = PostgresStorage::new(&db_url).await.unwrap();
        
        // Test basic connection
        storage.execute("SELECT 1").await.unwrap();
        
        // Test table creation
        let table = TableMetadata {
            name: "test_table".to_string(),
            table_type: "component".to_string(),
            fields: vec![
                crate::table::TableField {
                    field_name: "id".to_string(),
                    field_type: "u64".to_string(),
                    field_index: 0,
                    is_key: true,
                    is_enum: false,
                },
                crate::table::TableField {
                    field_name: "name".to_string(),
                    field_type: "String".to_string(),
                    field_index: 1,
                    is_key: false,
                    is_enum: false,
                },
            ],
            enums: HashMap::new(),
            offchain: false,
        };
        
        storage.create_tables(&[table]).await.unwrap();
    }

    #[tokio::test]
    async fn test_database_insert() {
        // Test SQLite database
        let db = Database::new("sqlite::memory:").await.unwrap();
        
        // Create a test table
        let table = TableMetadata {
            name: "test_insert".to_string(),
            table_type: "component".to_string(),
            fields: vec![
                crate::table::TableField {
                    field_name: "id".to_string(),
                    field_type: "u64".to_string(),
                    field_index: 0,
                    is_key: true,
                    is_enum: false,
                },
                crate::table::TableField {
                    field_name: "name".to_string(),
                    field_type: "String".to_string(),
                    field_index: 1,
                    is_key: false,
                    is_enum: false,
                },
                crate::table::TableField {
                    field_name: "age".to_string(),
                    field_type: "u32".to_string(),
                    field_index: 2,
                    is_key: false,
                    is_enum: false,
                },
            ],
            enums: HashMap::new(),
            offchain: false,
        };
        
        db.create_tables(&[table]).await.unwrap();
        
        // Test insert
        let values = vec![
            crate::sql::DBData::new(
                "id".to_string(),
                "u64".to_string(),
                crate::primitives::ParsedMoveValue::U64(123),
                true,
            ),
            crate::sql::DBData::new(
                "name".to_string(),
                "String".to_string(),
                crate::primitives::ParsedMoveValue::String("Alice".to_string()),
                false,
            ),
            crate::sql::DBData::new(
                "age".to_string(),
                "u32".to_string(),
                crate::primitives::ParsedMoveValue::U32(25),
                false,
            ),
        ];
        
        db.insert("test_insert", values, 1).await.unwrap();
        
        // Test UPSERT - insert same key with different values
        let values2 = vec![
            crate::sql::DBData::new(
                "id".to_string(),
                "u64".to_string(),
                crate::primitives::ParsedMoveValue::U64(123), // Same key
                true,
            ),
            crate::sql::DBData::new(
                "name".to_string(),
                "String".to_string(),
                crate::primitives::ParsedMoveValue::String("Alice Updated".to_string()),
                false,
            ),
            crate::sql::DBData::new(
                "age".to_string(),
                "u32".to_string(),
                crate::primitives::ParsedMoveValue::U32(26),
                false,
            ),
        ];
        
        db.insert("test_insert", values2, 2).await.unwrap();
        
        // Test insert new record
        let values3 = vec![
            crate::sql::DBData::new(
                "id".to_string(),
                "u64".to_string(),
                crate::primitives::ParsedMoveValue::U64(456),
                true,
            ),
            crate::sql::DBData::new(
                "name".to_string(),
                "String".to_string(),
                crate::primitives::ParsedMoveValue::String("Bob".to_string()),
                false,
            ),
            crate::sql::DBData::new(
                "age".to_string(),
                "u32".to_string(),
                crate::primitives::ParsedMoveValue::U32(30),
                false,
            ),
        ];
        
        db.insert("test_insert", values3, 3).await.unwrap();
        
        println!("UPSERT test completed successfully");
    }
} 