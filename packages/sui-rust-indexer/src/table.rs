use anyhow::Result;
use bcs;
use move_core_types::u256::U256;
use serde::Deserialize;
use serde_json;
use serde_json::Value;
use std::collections::HashMap;
use sui_types::base_types::SuiAddress;

pub const ONCHAIN_TABLE: &str = "ont";
pub const OFFCHAIN_TABLE: &str = "oft";

#[derive(Debug, Deserialize)]
pub struct TableJsonInfo {
    pub fields: Vec<HashMap<String, String>>,
    pub keys: Vec<String>,
    pub offchain: bool,
}

#[derive(Debug, Deserialize)]
pub struct DubheConfigJson {
    pub components: Vec<HashMap<String, TableJsonInfo>>,
    pub resources: Vec<HashMap<String, TableJsonInfo>>,
    pub enums: Vec<HashMap<String, Vec<HashMap<String, String>>>>,
    pub package_id: Option<String>,
}

#[derive(Debug)]
pub struct TableField {
    pub field_name: String,
    pub field_type: String,
    pub field_index: u8,
    pub is_key: bool,
}

#[derive(Debug)]
pub struct TableMetadata {
    pub name: String,
    pub table_type: String,
    pub fields: Vec<TableField>,
    pub offchain: bool,
}

impl TableMetadata {
    pub fn from_json(json: Value) -> Result<(String, Vec<TableMetadata>)> {
        let dubhe_config_json: DubheConfigJson = serde_json::from_value(json)?;
        let mut final_tables = Vec::new();

        // handle components
        for tables in dubhe_config_json.components {
            for (table_name, table_info) in tables {
                let mut fields = Vec::new();
                let offchain = table_info.offchain;

                for field in table_info.fields {
                    let mut key_field_index = 0;
                    let mut value_field_index = 0;
                    field.into_iter().for_each(|(field_name, field_type)| {
                        if table_info.keys.contains(&field_name) {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: key_field_index,
                                is_key: true,
                            });
                            key_field_index += 1;
                        } else {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: value_field_index,
                                is_key: false,
                            });
                            value_field_index += 1;
                        }
                    });
                }

                final_tables.push(TableMetadata {
                    name: table_name,
                    table_type: "component".to_string(),
                    fields,
                    offchain,
                });
            }
        }

        // handle resources
        for tables in dubhe_config_json.resources {
            for (table_name, table_info) in tables {
                let mut fields = Vec::new();
                let offchain = table_info.offchain;
                for (field) in table_info.fields {
                    let mut key_field_index = 0;
                    let mut value_field_index = 0;
                    field.into_iter().for_each(|(field_name, field_type)| {
                        if table_info.keys.contains(&field_name) {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: key_field_index,
                                is_key: true,
                            });
                            key_field_index += 1;
                        } else {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: value_field_index,
                                is_key: false,
                            });
                            value_field_index += 1;
                        }
                    });
                }
                final_tables.push(TableMetadata {
                    name: table_name,
                    table_type: "resource".to_string(),
                    fields,
                    offchain,
                });
            }
        }

        if dubhe_config_json.package_id.is_none() {
            return Err(anyhow::anyhow!("No package id found in config file"));
        }

        let package_id = dubhe_config_json.package_id.unwrap();

        Ok((package_id, final_tables))
    }

    pub fn generate_create_table_sql(&self) -> String {
        let mut fields = Vec::new();

        // Add key fields
        for field in &self.fields {
            fields.push(format!(
                "{} {}",
                field.field_name,
                self.get_sql_type(&field.field_type)
            ));
        }

        // Always add created_at and updated_at fields
        fields.push("created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP".to_string());
        fields.push("updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP".to_string());
        fields.push("last_updated_checkpoint BIGINT DEFAULT 0".to_string());
        fields.push("is_deleted BOOLEAN DEFAULT FALSE".to_string());

        // Add primary key constraint only if there are key fields
        if self.fields.iter().any(|field| field.is_key) {
            let key_names: Vec<String> = self
                .fields
                .iter()
                .filter(|field| field.is_key)
                .map(|field| field.field_name.clone())
                .collect();

            fields.push(format!("PRIMARY KEY ({})", key_names.join(", ")));
        } else {
            // All fields as primary key
            let value_names: Vec<String> = self
                .fields
                .iter()
                .filter(|field| !field.is_key)
                .map(|field| field.field_name.clone())
                .collect();
            fields.push(format!("PRIMARY KEY ({})", value_names.join(", ")));
        }

        format!(
            "CREATE TABLE IF NOT EXISTS store_{} ({})",
            self.name,
            fields.join(", ")
        )
    }

    pub fn generate_insert_table_fields_sql(&self) -> Vec<String> {
        let mut sql_statements = Vec::new();

        // Add key fields
        for field in &self.fields {
            sql_statements.push(format!(
                "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) \
                VALUES ('{}', '{}', '{}', '{}', {})",
                self.name, field.field_name, field.field_type, field.field_index, field.is_key
            ));
        }

        sql_statements
    }

    pub fn generate_insert_table_metadata_sql(&self) -> String {
        format!(
            "INSERT INTO table_metadata (table_name, table_type, offchain) VALUES ('{}', '{}', {})",
            self.name, self.table_type, self.offchain
        )
    }

    fn get_sql_type(&self, type_: &str) -> String {
        match type_ {
            "u8" => "SMALLINT",
            "u16" => "INTEGER",
            "u32" => "BIGINT",
            "u64" => "BIGINT",
            "u128" => "NUMERIC",
            "u256" => "NUMERIC",
            "vector<u8>" => "SMALLINT[]",
            "vector<u16>" => "INTEGER[]",
            "vector<u32>" => "BIGINT[]",
            "vector<u64>" => "BIGINT[]",
            "vector<u128>" => "NUMERIC[]",
            "vector<u256>" => "NUMERIC[]",
            "vector<address>" => "TEXT[]",
            "bool" => "BOOLEAN",
            _ => "TEXT",
        }
        .to_string()
    }

    pub fn parse_table_field(
        &self,
        field_name: &Vec<u8>,
        field_type: &Vec<u8>,
        field_value: &[u8],
    ) -> Value {
        let field_name_str = String::from_utf8_lossy(field_name);
        let field_type_str = String::from_utf8_lossy(field_type);

        let value = match field_type_str.as_ref() {
            "u8" => {
                let v: u8 = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "u16" => {
                let v: u16 = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "u32" => {
                let v: u32 = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "u64" => {
                let v: u64 = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "u128" => {
                let v: u128 = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "u256" => {
                let v: U256 = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v.to_string() })
            }
            "bool" => {
                let v: bool = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "address" => {
                let v: SuiAddress = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<u8>" => {
                let v: Vec<u8> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<u16>" => {
                let v: Vec<u16> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<u32>" => {
                let v: Vec<u32> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<u64>" => {
                let v: Vec<u64> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<u128>" => {
                let v: Vec<u128> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<u256>" => {
                let v: Vec<U256> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<address>" => {
                let v: Vec<SuiAddress> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<bool>" => {
                let v: Vec<bool> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<vector<u8>>" => {
                let v: Vec<Vec<u8>> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<vector<u16>>" => {
                let v: Vec<Vec<u16>> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<vector<u32>>" => {
                let v: Vec<Vec<u32>> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<vector<u64>>" => {
                let v: Vec<Vec<u64>> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            "vector<vector<u128>>" => {
                let v: Vec<Vec<u128>> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
            _ => {
                let v: Vec<u8> = bcs::from_bytes(field_value).unwrap();
                serde_json::json!({ field_name_str: v })
            }
        };

        value
    }

    pub fn parse_table_keys(&self, keys: Vec<Vec<u8>>) -> Value {
        let mut result = serde_json::json!({});
        let mut key_index = 0;
        self.fields.iter().for_each(|field| {
            if field.is_key {
                let field_json = self.parse_table_field(
                    &field.field_name.as_bytes().to_vec(),
                    &field.field_type.as_bytes().to_vec(),
                    &keys[key_index],
                );
                result[field.field_name.clone()] = field_json;
                key_index += 1;
            }
        });
        result
    }

    pub fn parse_table_values(&self, values: Vec<Vec<u8>>) -> Value {
        let mut result = serde_json::json!({});
        let mut value_index = 0;
        self.fields.iter().for_each(|field| {
            if !field.is_key {
                let field_json = self.parse_table_field(
                    &field.field_name.as_bytes().to_vec(),
                    &field.field_type.as_bytes().to_vec(),
                    &values[value_index],
                );
                result[field.field_name.clone()] = field_json;
                value_index += 1;
            }
        });
        result
    }
}

pub fn get_name(table_id: &Vec<u8>) -> String {
    // Remove prefix (ont or oft) and return the remaining part as table name
    if let Some(stripped) = String::from_utf8_lossy(&table_id[3..]).strip_prefix("ont") {
        stripped.to_string()
    } else if let Some(stripped) = String::from_utf8_lossy(&table_id[3..]).strip_prefix("oft") {
        stripped.to_string()
    } else {
        String::from_utf8_lossy(&table_id[3..]).to_string()
    }
}

pub fn parse_table_id(table_id: &Vec<u8>) -> (String, String) {
    let ty = if table_id.starts_with(ONCHAIN_TABLE.as_bytes()) {
        ONCHAIN_TABLE.to_string()
    } else {
        OFFCHAIN_TABLE.to_string()
    };
    let name = String::from_utf8_lossy(&table_id[3..]).to_string();
    (ty, name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn get_test_json() -> Value {
        json!({
          "components": [
            {
              "counter0": {
                "fields": [
                  {"entity_id": "address"}
                ],
                "keys": [
                  "entity_id"
                ],
                "offchain": false
              }
            },
            {
              "counter1": {
                "fields": [
                  { "entity_id": "address" },
                  { "value": "u32" }
                ],
                "keys": [
                  "entity_id"
                ],
                "offchain": false
              }
            }
          ],
          "resources": [
            {
              "counter2": {
                "fields": [
                  { "value": "u32" }
                ],
                "keys": [],
                "offchain": false
              }
            }
          ],
          "enums": [
            {
              "direction": [
                { "0": "left" },
                { "1": "right"}
              ]
            }
          ],
          "package_id": "0x1234567890123456789012345678901234567890"
        })
    }

    #[test]
    fn test_table_schema_from_json() {
        let test_json = get_test_json();

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, tables) = result.unwrap();

        assert_eq!(tables.len(), 3);

        let table = &tables[0];
        assert_eq!(table.name, "counter0");
        assert_eq!(table.table_type, "component");
        assert_eq!(table.fields.len(), 1);
        assert_eq!(table.fields[0].is_key, true);
        assert_eq!(table.offchain, false);
    }

    #[test]
    fn test_get_sql_type() {
        let schema = TableMetadata {
            name: "test".to_string(),
            table_type: "component".to_string(),
            fields: vec![],
            offchain: false,
        };

        assert_eq!(schema.get_sql_type("u8"), "SMALLINT");
        assert_eq!(schema.get_sql_type("u64"), "BIGINT");
        assert_eq!(schema.get_sql_type("bool"), "BOOLEAN");
        assert_eq!(schema.get_sql_type("vector<u8>"), "SMALLINT[]");
        assert_eq!(schema.get_sql_type("unknown"), "TEXT");
    }

    #[test]
    fn test_generate_create_table_sql() {
        let test_json = get_test_json();
        let (package_id, tables) = TableMetadata::from_json(test_json).unwrap();
        assert_eq!(tables.len(), 3);
        let table = &tables[0];
        assert_eq!(
                table.generate_create_table_sql(), "CREATE TABLE IF NOT EXISTS store_counter0 (entity_id TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
            );
        assert_eq!(
                table.generate_insert_table_fields_sql(), vec![
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter0', 'entity_id', 'address', '0', true)"
                ]
            );
        let table = &tables[1];
        assert_eq!(
                table.generate_create_table_sql(), "CREATE TABLE IF NOT EXISTS store_counter1 (entity_id TEXT, value BIGINT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
            );
        assert_eq!(
                table.generate_insert_table_fields_sql(), vec![
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter1', 'entity_id', 'address', '0', true)",
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter1', 'value', 'u32', '0', false)"
                ]
            );
        let table = &tables[2];
        assert_eq!(
                table.generate_create_table_sql(),  "CREATE TABLE IF NOT EXISTS store_counter2 (value BIGINT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (value))"
            );
        assert_eq!(
                table.generate_insert_table_fields_sql(), vec![
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter2', 'value', 'u32', '0', false)",
                ]
            );
    }
}
