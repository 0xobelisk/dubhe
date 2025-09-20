use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Query operator types for filtering data
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum QueryOperator {
    /// Equal to
    Eq,
    /// Not equal to
    Ne,
    /// Greater than
    Gt,
    /// Greater than or equal to
    Gte,
    /// Less than
    Lt,
    /// Less than or equal to
    Lte,
    /// LIKE pattern matching
    Like,
    /// IN clause for multiple values
    In,
    /// NOT IN clause
    NotIn,
    /// IS NULL
    IsNull,
    /// IS NOT NULL
    IsNotNull,
}

/// Sort direction for ordering results
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SortDirection {
    /// Ascending order
    Asc,
    /// Descending order
    Desc,
}

/// Filter condition for querying data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    /// Field name to filter on
    pub field: String,
    /// Operator for the condition
    pub operator: QueryOperator,
    /// Value(s) for the condition
    pub value: QueryValue,
}

/// Sort order specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortOrder {
    /// Field name to sort by
    pub field: String,
    /// Sort direction
    pub direction: SortDirection,
}

/// Query value that can be various types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum QueryValue {
    /// String value
    String(String),
    /// Integer value
    Integer(i64),
    /// Float value
    Float(f64),
    /// Boolean value
    Boolean(bool),
    /// Array of string values (for IN/NOT IN)
    StringArray(Vec<String>),
    /// Array of integer values
    IntegerArray(Vec<i64>),
    /// Null value
    Null,
}

/// Comprehensive query builder for database operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryBuilder {
    /// Table name to query
    pub table: String,
    /// Fields to select (empty means SELECT *)
    pub select_fields: Vec<String>,
    /// Filter conditions (WHERE clause)
    pub filters: Vec<FilterCondition>,
    /// Sort orders (ORDER BY clause)
    pub sorts: Vec<SortOrder>,
    /// Limit number of results
    pub limit: Option<u32>,
    /// Offset for pagination
    pub offset: Option<u32>,
    /// Group by fields
    pub group_by: Vec<String>,
    /// Having conditions (for GROUP BY)
    pub having: Vec<FilterCondition>,
}

/// Query result with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    /// The actual data rows
    pub data: Vec<HashMap<String, serde_json::Value>>,
    /// Total count (for pagination)
    pub total_count: Option<u64>,
    /// Query execution time in milliseconds
    pub execution_time_ms: Option<u64>,
    /// Whether the query was successful
    pub success: bool,
    /// Error message if query failed
    pub error_message: Option<String>,
}

/// Paginated query result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResult {
    /// Current page data
    pub data: Vec<HashMap<String, serde_json::Value>>,
    /// Current page number (1-based)
    pub page: u32,
    /// Items per page
    pub page_size: u32,
    /// Total number of items
    pub total_items: u64,
    /// Total number of pages
    pub total_pages: u32,
    /// Whether there's a next page
    pub has_next: bool,
    /// Whether there's a previous page
    pub has_prev: bool,
}

impl QueryBuilder {
    /// Create a new query builder for a table
    pub fn new(table: &str) -> Self {
        Self {
            table: table.to_string(),
            select_fields: Vec::new(),
            filters: Vec::new(),
            sorts: Vec::new(),
            limit: None,
            offset: None,
            group_by: Vec::new(),
            having: Vec::new(),
        }
    }

    /// Select specific fields
    pub fn select(mut self, fields: Vec<&str>) -> Self {
        self.select_fields = fields.into_iter().map(|f| f.to_string()).collect();
        self
    }

    /// Add a filter condition
    pub fn filter(mut self, field: &str, operator: QueryOperator, value: QueryValue) -> Self {
        self.filters.push(FilterCondition {
            field: field.to_string(),
            operator,
            value,
        });
        self
    }

    /// Add multiple filter conditions
    pub fn filters(mut self, filters: Vec<FilterCondition>) -> Self {
        self.filters.extend(filters);
        self
    }

    /// Add sorting
    pub fn sort(mut self, field: &str, direction: SortDirection) -> Self {
        self.sorts.push(SortOrder {
            field: field.to_string(),
            direction,
        });
        self
    }

    /// Set limit
    pub fn limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    /// Set offset
    pub fn offset(mut self, offset: u32) -> Self {
        self.offset = Some(offset);
        self
    }

    /// Set pagination (page is 1-based)
    pub fn paginate(mut self, page: u32, page_size: u32) -> Self {
        self.limit = Some(page_size);
        self.offset = Some((page - 1) * page_size);
        self
    }

    /// Add group by fields
    pub fn group_by(mut self, fields: Vec<&str>) -> Self {
        self.group_by = fields.into_iter().map(|f| f.to_string()).collect();
        self
    }

    /// Add having condition
    pub fn having(mut self, field: &str, operator: QueryOperator, value: QueryValue) -> Self {
        self.having.push(FilterCondition {
            field: field.to_string(),
            operator,
            value,
        });
        self
    }

    /// Convert to SQL WHERE clause
    pub fn to_where_clause(&self) -> String {
        if self.filters.is_empty() {
            return String::new();
        }

        let conditions: Vec<String> = self
            .filters
            .iter()
            .map(|f| match &f.operator {
                QueryOperator::Eq => format!("{} = {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::Ne => format!("{} != {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::Gt => format!("{} > {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::Gte => format!("{} >= {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::Lt => format!("{} < {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::Lte => format!("{} <= {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::Like => format!("{} LIKE {}", f.field, self.value_to_sql(&f.value)),
                QueryOperator::In => match &f.value {
                    QueryValue::StringArray(arr) => {
                        let values: Vec<String> = arr.iter().map(|v| format!("'{}'", v)).collect();
                        format!("{} IN ({})", f.field, values.join(", "))
                    }
                    QueryValue::IntegerArray(arr) => {
                        let values: Vec<String> = arr.iter().map(|v| v.to_string()).collect();
                        format!("{} IN ({})", f.field, values.join(", "))
                    }
                    _ => format!("{} IN ({})", f.field, self.value_to_sql(&f.value)),
                },
                QueryOperator::NotIn => match &f.value {
                    QueryValue::StringArray(arr) => {
                        let values: Vec<String> = arr.iter().map(|v| format!("'{}'", v)).collect();
                        format!("{} NOT IN ({})", f.field, values.join(", "))
                    }
                    QueryValue::IntegerArray(arr) => {
                        let values: Vec<String> = arr.iter().map(|v| v.to_string()).collect();
                        format!("{} NOT IN ({})", f.field, values.join(", "))
                    }
                    _ => format!("{} NOT IN ({})", f.field, self.value_to_sql(&f.value)),
                },
                QueryOperator::IsNull => format!("{} IS NULL", f.field),
                QueryOperator::IsNotNull => format!("{} IS NOT NULL", f.field),
            })
            .collect();

        format!(" WHERE {}", conditions.join(" AND "))
    }

    /// Convert to SQL ORDER BY clause
    pub fn to_order_clause(&self) -> String {
        if self.sorts.is_empty() {
            return String::new();
        }

        let sorts: Vec<String> = self
            .sorts
            .iter()
            .map(|s| {
                let direction = match s.direction {
                    SortDirection::Asc => "ASC",
                    SortDirection::Desc => "DESC",
                };
                format!("{} {}", s.field, direction)
            })
            .collect();

        format!(" ORDER BY {}", sorts.join(", "))
    }

    /// Convert QueryValue to SQL string
    fn value_to_sql(&self, value: &QueryValue) -> String {
        match value {
            QueryValue::String(s) => format!("'{}'", s.replace("'", "''")),
            QueryValue::Integer(i) => i.to_string(),
            QueryValue::Float(f) => f.to_string(),
            QueryValue::Boolean(b) => b.to_string(),
            QueryValue::Null => "NULL".to_string(),
            _ => "NULL".to_string(),
        }
    }

    /// Build complete SQL query
    pub fn to_sql(&self) -> String {
        let select_clause = if self.select_fields.is_empty() {
            "SELECT *".to_string()
        } else {
            format!("SELECT {}", self.select_fields.join(", "))
        };

        let mut sql = format!("{} FROM {}", select_clause, self.table);

        sql.push_str(&self.to_where_clause());

        if !self.group_by.is_empty() {
            sql.push_str(&format!(" GROUP BY {}", self.group_by.join(", ")));
        }

        sql.push_str(&self.to_order_clause());

        if let Some(limit) = self.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        if let Some(offset) = self.offset {
            sql.push_str(&format!(" OFFSET {}", offset));
        }

        sql
    }
}

impl QueryResult {
    /// Create a successful query result
    pub fn success(data: Vec<HashMap<String, serde_json::Value>>) -> Self {
        Self {
            data,
            total_count: None,
            execution_time_ms: None,
            success: true,
            error_message: None,
        }
    }

    /// Create a successful query result with metadata
    pub fn success_with_metadata(
        data: Vec<HashMap<String, serde_json::Value>>,
        total_count: Option<u64>,
        execution_time_ms: Option<u64>,
    ) -> Self {
        Self {
            data,
            total_count,
            execution_time_ms,
            success: true,
            error_message: None,
        }
    }

    /// Create a failed query result
    pub fn error(error_message: String) -> Self {
        Self {
            data: Vec::new(),
            total_count: None,
            execution_time_ms: None,
            success: false,
            error_message: Some(error_message),
        }
    }

    /// Convert to paginated result
    pub fn to_paginated(&self, page: u32, page_size: u32) -> PaginatedResult {
        let total_items = self.total_count.unwrap_or(self.data.len() as u64);
        let total_pages = ((total_items as f64) / (page_size as f64)).ceil() as u32;

        PaginatedResult {
            data: self.data.clone(),
            page,
            page_size,
            total_items,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_builder() {
        let query = QueryBuilder::new("users")
            .select(vec!["id", "name", "email"])
            .filter("age", QueryOperator::Gte, QueryValue::Integer(18))
            .filter(
                "status",
                QueryOperator::In,
                QueryValue::StringArray(vec!["active".to_string(), "verified".to_string()]),
            )
            .sort("created_at", SortDirection::Desc)
            .limit(10)
            .offset(20);

        let sql = query.to_sql();
        println!("Generated SQL: {}", sql);

        assert!(sql.contains("SELECT id, name, email"));
        assert!(sql.contains("FROM users"));
        assert!(sql.contains("WHERE"));
        assert!(sql.contains("age >= 18"));
        assert!(sql.contains("ORDER BY created_at DESC"));
        assert!(sql.contains("LIMIT 10"));
        assert!(sql.contains("OFFSET 20"));
    }
}
