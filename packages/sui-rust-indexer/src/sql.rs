use serde_json::Value;

fn format_sql_value(value: &Value, field_type: &str) -> String {
    match field_type {
        "bool" => {
            if value.is_boolean() {
                value.as_bool().unwrap().to_string()
            } else {
                "false".to_string()
            }
        }
        "u8" | "u16" | "u32" | "u64" | "u128" | "u256" => {
            if value.is_number() {
                value.to_string()
            } else {
                "0".to_string()
            }
        }
        "vector<u8>" | "vector<u16>" | "vector<u32>" | "vector<u64>" | "vector<u128>"
        | "vector<u256>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                let values: Vec<String> = array.iter().map(|v| v.to_string()).collect();
                format!("ARRAY[{}]", values.join(", "))
            } else {
                "ARRAY[]".to_string()
            }
        }
        "vector<address>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                let values: Vec<String> = array
                    .iter()
                    .map(|v| format!("'{}'", v.as_str().unwrap_or("")))
                    .collect();
                format!("ARRAY[{}]", values.join(", "))
            } else {
                "ARRAY[]".to_string()
            }
        }
        _ => {
            if value.is_string() {
                format!("'{}'", value.as_str().unwrap_or(""))
            } else {
                value.to_string()
            }
        }
    }
}

pub fn generate_set_record_sql(
    current_checkpoint: u64,
    table_name: &str,
    key_fields: &[(String, String)],
    value_fields: &[(String, String)],
    key_values: &Value,
    value_values: &Value,
) -> String {
    let mut fields = Vec::new();
    let mut values = Vec::new();

    // Add key fields if present
    for (field_name, field_type) in key_fields {
        fields.push(field_name.clone());
        values.push(format_sql_value(&key_values[field_name], field_type));
    }

    // Add value fields
    for (field_name, field_type) in value_fields {
        fields.push(field_name.clone());
        values.push(format_sql_value(&value_values[field_name], field_type));
    }

    fields.push("last_updated_checkpoint".to_string());
    values.push(current_checkpoint.to_string());

    // Generate update clauses for value fields
    let mut update_clauses = Vec::new();
    for (field_name, field_type) in value_fields {
        update_clauses.push(format!(
            "{} = {}",
            field_name,
            format_sql_value(&value_values[field_name], field_type)
        ));
    }
    update_clauses.push("updated_at = CURRENT_TIMESTAMP".to_string());
    update_clauses.push(format!("last_updated_checkpoint = {}", current_checkpoint));

    let base_sql = format!(
        "INSERT INTO store_{} ({}) VALUES ({})",
        table_name,
        fields.join(", "),
        values.join(", ")
    );

    if !key_fields.is_empty() {
        // If key_fields exist, use them for conflict resolution
        let conflict_columns: Vec<String> = key_fields
            .iter()
            .map(|(field_name, _)| field_name.clone())
            .collect();

        format!(
            "{} ON CONFLICT ({}) DO UPDATE SET {}",
            base_sql,
            conflict_columns.join(", "),
            update_clauses.join(", ")
        )
    } else {
        // If no key_fields, use a simple WHERE EXISTS condition for update
        format!(
            "WITH upsert AS (
                UPDATE store_{} SET {} 
                WHERE EXISTS (SELECT 1 FROM store_{})
                RETURNING *
            )
            INSERT INTO store_{} ({})
            SELECT {}
            WHERE NOT EXISTS (SELECT 1 FROM upsert)",
            table_name,
            update_clauses.join(", "),
            table_name,
            table_name,
            fields.join(", "),
            values.join(", ")
        )
    }
}

pub fn generate_set_field_sql(
    current_checkpoint: u64,
    table_name: &str,
    field_name: &str,
    field_type: &str,
    value: &Value,
    key_fields: &[(String, String)],
    key_values: &Value,
) -> String {
    let mut where_clause = Vec::new();

    // Add key fields to where clause
    for (key_field_name, key_field_type) in key_fields {
        where_clause.push(format!(
            "{} = {}",
            key_field_name,
            format_sql_value(&key_values[key_field_name], key_field_type)
        ));
    }

    format!(
        "UPDATE store_{} SET {} = {}, updated_at = CURRENT_TIMESTAMP, last_updated_checkpoint = {} WHERE {}",
        table_name,
        field_name,
        format_sql_value(&value[field_name], field_type),
        current_checkpoint,
        where_clause.join(" AND ")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_set_record_sql() {
        // Test case 1: with key_fields
        let table_name = "test_table";
        let key_fields = vec![
            ("id".to_string(), "u64".to_string()),
            ("name".to_string(), "address".to_string()),
        ];
        let value_fields = vec![("value".to_string(), "u64".to_string())];
        let key_values =
            serde_json::json!({ "id": 1, "name": "0x1234567890123456789012345678901234567890" });
        let value_values = serde_json::json!({ "value": 100 });

        let sql = generate_set_record_sql(
            1024,
            table_name,
            &key_fields,
            &value_fields,
            &key_values,
            &value_values,
        );
        assert_eq!(sql, "INSERT INTO store_test_table (id, name, value, last_updated_checkpoint) VALUES (1, '0x1234567890123456789012345678901234567890', 100, 1024) ON CONFLICT (id, name) DO UPDATE SET value = 100, updated_at = CURRENT_TIMESTAMP, last_updated_checkpoint = 1024");

        // Test case 2: empty key_fields (single row table)
        let empty_key_fields: Vec<(String, String)> = vec![];
        let value_fields = vec![
            ("field1".to_string(), "u64".to_string()),
            ("field2".to_string(), "address".to_string()),
            ("field3".to_string(), "bool".to_string()),
        ];
        let key_values = serde_json::json!({});
        let value_values = serde_json::json!({
            "field1": 100,
            "field2": "0x1234567890123456789012345678901234567890",
            "field3": true
        });

        let sql = generate_set_record_sql(
            2048,
            table_name,
            &empty_key_fields,
            &value_fields,
            &key_values,
            &value_values,
        );
        assert_eq!(sql, "WITH upsert AS (\n                UPDATE store_test_table SET field1 = 100, field2 = '0x1234567890123456789012345678901234567890', field3 = true, updated_at = CURRENT_TIMESTAMP, last_updated_checkpoint = 2048 \n                WHERE EXISTS (SELECT 1 FROM store_test_table)\n                RETURNING *\n            )\n            INSERT INTO store_test_table (field1, field2, field3, last_updated_checkpoint)\n            SELECT 100, '0x1234567890123456789012345678901234567890', true, 2048\n            WHERE NOT EXISTS (SELECT 1 FROM upsert)");
    }

    #[test]
    fn test_generate_set_field_sql() {
        let table_name = "test_table";
        let field_name = "value";
        let field_type = "u64";
        let value = serde_json::json!({ "value": 100u64 });
        let key_fields = vec![
            ("id".to_string(), "u64".to_string()),
            ("name".to_string(), "address".to_string()),
        ];
        let key_values =
            serde_json::json!({ "id": 1, "name": "0x1234567890123456789012345678901234567890" });
        let sql = generate_set_field_sql(
            1024,
            table_name,
            field_name,
            field_type,
            &value,
            &key_fields,
            &key_values,
        );
        assert_eq!(sql, "UPDATE store_test_table SET value = 100, updated_at = CURRENT_TIMESTAMP, last_updated_checkpoint = 1024 WHERE id = 1 AND name = '0x1234567890123456789012345678901234567890'");
    }
}
