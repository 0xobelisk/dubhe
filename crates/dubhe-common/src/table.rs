use anyhow::Result;
use bcs;
use move_core_types::u256::U256;
use serde::Deserialize;
use serde_json;
use serde_json::Value;
use std::collections::HashMap;
use sui_types::base_types::SuiAddress;
use crate::primitives::{MoveTypeParser, ParsedMoveValue};
use crate::sql::DBData;

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
    pub enums: Vec<HashMap<String, Vec<String>>>,
    pub package_id: Option<String>,
    pub start_checkpoint: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TableField {
    pub field_name: String,
    pub field_type: String,
    pub field_index: u8,
    pub is_key: bool,
    pub is_enum: bool,
}

#[derive(Debug, Clone)]
pub struct TableMetadata {
    pub name: String,
    pub table_type: String,
    pub fields: Vec<TableField>,
    pub enums: HashMap<String, Vec<String>>,
    pub offchain: bool,
}

impl TableMetadata {
    pub fn from_json(json: Value) -> Result<(String, u64, Vec<TableMetadata>)> {
        let dubhe_config_json: DubheConfigJson = serde_json::from_value(json)?;
        let mut final_tables = Vec::new();

        // handle components
        for tables in dubhe_config_json.components {
            for (table_name, table_info) in tables {
                let mut fields = Vec::new();
                let offchain = table_info.offchain;
                let mut enums = HashMap::new();
                let mut key_field_index = 0;
                let mut value_field_index = 0;
                for field in table_info.fields {
                    field.into_iter().for_each(|(field_name, field_type)| {
                        let is_enum = Self::is_enum(&field_type);
                        if is_enum {
                            let enum_ = dubhe_config_json.enums.iter().find(|map| map.contains_key(&field_type));
                            if let Some(enum_) = enum_ {
                                let enum_value = enum_.get(&field_type).unwrap();
                                enums.insert(field_type.clone(), enum_value.clone());
                            }
                        }
                        if table_info.keys.contains(&field_name) {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: key_field_index,
                                is_key: true,
                                is_enum,
                            });
                            key_field_index += 1;
                        } else {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: value_field_index,
                                is_key: false,
                                is_enum,
                            });
                            value_field_index += 1;
                        }
                    });
                }

                final_tables.push(TableMetadata {
                    name: table_name,
                    table_type: "component".to_string(),
                    fields,
                    enums,
                    offchain,
                });
            }
        }

        // handle resources
        for tables in dubhe_config_json.resources {
            for (table_name, table_info) in tables {
                let mut fields = Vec::new();
                let mut enums = HashMap::new();
                let offchain = table_info.offchain;
                let mut key_field_index = 0;
                let mut value_field_index = 0;
                for field in table_info.fields {
                    field.into_iter().for_each(|(field_name, field_type)| {
                        let is_enum = Self::is_enum(&field_type);
                        if is_enum {
                            let enum_ = dubhe_config_json.enums.iter().find(|map| map.contains_key(&field_type));
                            if let Some(enum_) = enum_ {
                                let enum_value = enum_.get(&field_type).unwrap();
                                enums.insert(field_type.clone(), enum_value.clone());
                            }
                        }
                        if table_info.keys.contains(&field_name) {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: key_field_index,
                                is_key: true,
                                is_enum,
                            });
                            key_field_index += 1;
                        } else {
                            fields.push(TableField {
                                field_name,
                                field_type,
                                field_index: value_field_index,
                                is_key: false,
                                is_enum,
                            });
                            value_field_index += 1;
                        }
                    });
                }
                final_tables.push(TableMetadata {
                    name: table_name,
                    table_type: "resource".to_string(),
                    fields,
                    enums,
                    offchain,
                });
            }
        }

        if dubhe_config_json.package_id.is_none() {
            return Err(anyhow::anyhow!("No package id found in config file"));
        }

        if dubhe_config_json.start_checkpoint.is_none() {
            return Err(anyhow::anyhow!("No start checkpoint found in config file"));
        }

        let package_id = dubhe_config_json.package_id.unwrap();
        let start_checkpoint = dubhe_config_json
            .start_checkpoint
            .unwrap()
            .parse::<u64>()
            .unwrap_or(0);

        Ok((package_id, start_checkpoint, final_tables))
    }

    pub fn is_enum(field_type: &str) -> bool {
        match field_type {
            "u8" | "u16" | "u32" | "u64" | "u128" | "u256" | "bool" | "address" | "String" | "vector<u8>" | 
            "vector<u16>" | "vector<u32>" | "vector<u64>" | "vector<u128>" | "vector<u256>" | 
            "vector<address>" | "vector<String>" | "vector<bool>" | "vector<vector<u8>>" | "vector<vector<u16>>" 
            | "vector<vector<u32>>" | "vector<vector<u64>>" | "vector<vector<u128>>" | 
            "vector<vector<u256>>" | "vector<vector<address>>" | "vector<vector<bool>>" => false,
            _ => true,
        }
    }

    pub fn get_enum_value(&self, field_type: &str, index: u64) -> String {
        let enum_ = self.enums.get(field_type).unwrap();
        enum_[index as usize].clone()
    }

    pub fn generate_create_table_sql(&self) -> String {
        let mut fields = Vec::new();

        // Add debug information
        println!("DEBUG: table_type = '{}'", self.table_type);
        println!("DEBUG: fields count = {}", self.fields.len());
        for (i, field) in self.fields.iter().enumerate() {
            println!("DEBUG: field[{}] = {{ name: '{}', is_key: {} }}", i, field.field_name, field.is_key);
        }
        println!("DEBUG: has_key_fields = {}", self.fields.iter().any(|field| field.is_key));

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

        // Add primary key constraint
        if self.table_type == "resource" && !self.fields.iter().any(|field| field.is_key) {
            println!("DEBUG: Entering special case for resource without key fields");
            // Special case for resource type without key fields: set all fields as PRIMARY KEY
            let all_field_names: Vec<String> = self
                .fields
                .iter()
                .map(|field| field.field_name.clone())
                .collect();

            println!("all_field_names: {:?}", all_field_names);
            
            if !all_field_names.is_empty() {
                fields.push(format!("PRIMARY KEY ({})", all_field_names.join(", ")));
            }
        } else if self.fields.iter().any(|field| field.is_key) {
            println!("DEBUG: Entering case with key fields");
            // Case with key fields: use key fields as PRIMARY KEY
            let key_names: Vec<String> = self
                .fields
                .iter()
                .filter(|field| field.is_key)
                .map(|field| field.field_name.clone())
                .collect();

            fields.push(format!("PRIMARY KEY ({})", key_names.join(", ")));
        } else {
            println!("DEBUG: Entering case without key fields");
            // Case without key fields: use non-key fields as PRIMARY KEY
            let value_names: Vec<String> = self
                .fields
                .iter()
                .filter(|field| !field.is_key)
                .map(|field| field.field_name.clone())
                .collect();
            
            if !value_names.is_empty() {
                fields.push(format!("PRIMARY KEY ({})", value_names.join(", ")));
            }
        }

        format!(
            "CREATE TABLE IF NOT EXISTS {} ({})",
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
            "u8" => "INTEGER",
            "u16" => "INTEGER",
            "u32" => "INTEGER",
            "u64" => "INTEGER",
            "u128" => "TEXT",
            "u256" => "TEXT",
            "address" => "TEXT",
            "String" => "TEXT",
            "bool" => "BOOLEAN",
            _ => "TEXT",
        }
        .to_string()
    }

    pub fn parse_table_keys(&self, keys: Vec<Vec<u8>>) -> Result<Vec<DBData>> {
        let mut result = Vec::new();
        for (key_index, field) in self.fields.iter().filter(|field| field.is_key).enumerate() {
                let parsed_value = field.field_type.into_parsed_move_value(&keys[key_index])?;
                result.push(DBData::new(
                    field.field_name.clone(),
                    field.field_type.clone(),
                    parsed_value,
                    true,
                ));
        }
        Ok(result)
    }

    pub fn parse_table_values(&self, values: Vec<Vec<u8>>) -> Result<Vec<DBData>> {
        let mut result = Vec::new();
        for (value_index, field) in self.fields.iter().filter(|field| !field.is_key).enumerate() {
                let parsed_value = field.field_type.into_parsed_move_value(&values[value_index])?;
                result.push(DBData::new(
                    field.field_name.clone(),
                    field.field_type.clone(),
                    parsed_value,
                    false,
                ));
        };
        Ok(result)
    }

    pub fn parse(&self, keys: Vec<Vec<u8>>, values: Vec<Vec<u8>>) -> Result<Vec<DBData>> {
        let keys = self.parse_table_keys(keys)?;
        let values = self.parse_table_values(values)?;
        let mut result = Vec::new();
        result.extend(keys);
        result.extend(values);
        Ok(result)
    }
}


pub fn format_sql_value(value: &Value, field_type: &str) -> String {
    match field_type {
        "bool" => {
            value.as_bool().unwrap().to_string()
        }
        "u8" | "u16" | "u32" | "u64" | "u128" => {
            value.to_string()
        }
        "u256" => {
            format!("'{}'", value.as_str().unwrap_or(""))
        }
        "vector<u8>" | "vector<u16>" | "vector<u32>" | "vector<u64>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                if array.is_empty() {
                    "'{}'".to_string()
                } else {
                    let values: Vec<String> = array.iter().map(|v| v.to_string()).collect();
                    format!("ARRAY[{}]", values.join(", "))
                }
            } else {
                "'{}'".to_string()
            }
        },
        "vector<u128>" | "vector<u256>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                if array.is_empty() {
                    "'{}'".to_string()
                } else {
                    let values: Vec<String> = array.iter().map(|v| format!("'{}'", v.as_str().unwrap_or(""))).collect();
                    format!("ARRAY[{}]", values.join(", "))
                }
            } else {
                "'{}'".to_string()
            }
        }
        "vector<bool>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                if array.is_empty() {
                    "'{}'".to_string()
                } else {
                    let values: Vec<String> = array
                        .iter()
                        .map(|v| v.as_bool().unwrap_or(false).to_string())
                        .collect();
                    format!("ARRAY[{}]", values.join(", "))
                }
            } else {
                "'{}'".to_string()
            }
        }
        "vector<address>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                if array.is_empty() {
                    "'{}'".to_string()
                } else {
                    let values: Vec<String> = array
                        .iter()
                        .map(|v| format!("'{}'", v.as_str().unwrap_or("")))
                        .collect();
                    format!("ARRAY[{}]", values.join(", "))
                }
            } else {
                "'{}'".to_string()
            }
        },
        "vector<vector<u8>>" => {
            if value.is_array() {
                let array = value.as_array().unwrap();
                if array.is_empty() {
                    "'{}'".to_string()
                } else {
                    let values: Vec<String> = array.iter().map(|v| v.to_string()).collect();
                    format!("ARRAY[{}]", values.join(", "))
                }
            } else {
                "'{}'".to_string()
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
            },
            {
              "counter2": {
                "fields": [
                  { "entity_id": "address" },
                  { "value": "Status" }
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
              "counter3": {
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
              "Direction": [
                "Left",
                "Right"
              ],
              "Status": [
                "Caught",
                "Fled",
                "Missed"
              ]
            }
          ],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        })
    }

    #[test]
    fn test_table_schema_from_json() {
        let test_json = get_test_json();

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();

        assert_eq!(tables.len(), 4);

        let table = &tables[0];
        assert_eq!(table.name, "counter0");
        assert_eq!(table.table_type, "component");
        assert_eq!(table.fields.len(), 1);
        assert_eq!(table.fields[0].is_key, true);
        assert_eq!(table.offchain, false);
        assert_eq!(package_id, "0x1234567890123456789012345678901234567890");
        assert_eq!(start_checkpoint, 1);

        let table2 = &tables[2];
        assert_eq!(table2.name, "counter2");
        assert_eq!(table2.fields.len(), 2);
        assert_eq!(table2.fields[0].is_key, true);
        assert_eq!(table2.enums.len(), 1);
        assert_eq!(table2.enums.get("Status").unwrap(), &vec!["Caught", "Fled", "Missed"]);
    }

    #[test]
    fn test_get_sql_type() {
        let schema = TableMetadata {
            name: "test".to_string(),
            table_type: "component".to_string(),
            fields: vec![],
            enums: HashMap::new(),
            offchain: false,
        };

        assert_eq!(schema.get_sql_type("u8"), "INTEGER");
        assert_eq!(schema.get_sql_type("u64"), "INTEGER");
        assert_eq!(schema.get_sql_type("bool"), "BOOLEAN");
        assert_eq!(schema.get_sql_type("vector<u8>"), "TEXT"); // TableMetadata doesn't handle vector types
        assert_eq!(schema.get_sql_type("unknown"), "TEXT");
    }

    #[test]
    fn test_generate_create_table_sql() {
        let test_json = get_test_json();
        let (package_id, start_checkpoint, tables) = TableMetadata::from_json(test_json).unwrap();
        assert_eq!(tables.len(), 4);
        let table = &tables[0];
        assert_eq!(
                table.generate_create_table_sql(), "CREATE TABLE IF NOT EXISTS counter0 (entity_id TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
            );
        assert_eq!(
                table.generate_insert_table_fields_sql(), vec![
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter0', 'entity_id', 'address', '0', true)"
                ]
            );
        let table = &tables[1];
        assert_eq!(
                table.generate_create_table_sql(), "CREATE TABLE IF NOT EXISTS counter1 (entity_id TEXT, value INTEGER, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
            );
        assert_eq!(
                table.generate_insert_table_fields_sql(), vec![
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter1', 'entity_id', 'address', '0', true)",
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter1', 'value', 'u32', '0', false)"
                ]
            );
        let table = &tables[2];
        assert_eq!(
                table.generate_create_table_sql(),  "CREATE TABLE IF NOT EXISTS counter2 (entity_id TEXT, value TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
            );
        assert_eq!(
                table.generate_insert_table_fields_sql(), vec![
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter2', 'entity_id', 'address', '0', true)",
                    "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter2', 'value', 'Status', '0', false)",
                ]
            );
    }

    #[test]
    fn test_generate_create_table_sql_for_resource_without_keys() {
        let test_json = json!({
          "components": [],
          "resources": [
            {
              "counter": {
                "fields": [
                  { "value": "u32" }
                ],
                "keys": [],
                "offchain": false
              }
            }
          ],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "counter");
        assert_eq!(table.table_type, "resource");
        assert_eq!(table.fields.len(), 1);
        assert_eq!(table.fields[0].is_key, false);
        
        let sql = table.generate_create_table_sql();
        println!("sql: {}", sql);
        // Verify SQL contains all fields as PRIMARY KEY
        assert!(sql.contains("PRIMARY KEY (value)"));
        assert!(sql.contains("value INTEGER"));
        assert!(sql.contains("created_at TIMESTAMPTZ"));
        assert!(sql.contains("updated_at TIMESTAMPTZ"));
    }

    #[test]
    fn test_generate_create_table_sql_for_component_without_keys() {
        let test_json = json!({
          "components": [
            {
              "player": {
                "fields": [
                  { "name": "String" }
                ],
                "keys": [],
                "offchain": false
              }
            }
          ],
          "resources": [],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "player");
        assert_eq!(table.table_type, "component");
        assert_eq!(table.fields.len(), 1);
        assert_eq!(table.fields[0].is_key, false);
        
        let sql = table.generate_create_table_sql();
        // Verify SQL contains non-key fields as PRIMARY KEY (original logic)
        assert!(sql.contains("PRIMARY KEY (name)"));
        assert!(sql.contains("name TEXT"));
        assert!(sql.contains("created_at TIMESTAMPTZ"));
        assert!(sql.contains("updated_at TIMESTAMPTZ"));
    }

    #[test]
    fn test_generate_create_table_sql_for_resource_with_keys() {
        let test_json = json!({
          "components": [],
          "resources": [
            {
              "counter": {
                "fields": [
                  { "id": "u256" },
                  { "value": "u32" }
                ],
                "keys": ["id"],
                "offchain": false
              }
            }
          ],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "counter");
        assert_eq!(table.table_type, "resource");
        assert_eq!(table.fields.len(), 2);
        
        let sql = table.generate_create_table_sql();
        // Verify SQL uses specified key fields as PRIMARY KEY
        assert!(sql.contains("PRIMARY KEY (id)"));
        assert!(sql.contains("id TEXT"));
        assert!(sql.contains("value INTEGER"));
    }

    #[test]
    fn test_generate_create_table_sql_for_component_with_keys() {
        let test_json = json!({
          "components": [
            {
              "position": {
                "fields": [
                  { "player": "address" },
                  { "x": "u64" },
                  { "y": "u64" }
                ],
                "keys": ["player"],
                "offchain": false
              }
            }
          ],
          "resources": [],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "position");
        assert_eq!(table.table_type, "component");
        assert_eq!(table.fields.len(), 3);
        
        let sql = table.generate_create_table_sql();
        // Verify SQL uses specified key fields as PRIMARY KEY
        assert!(sql.contains("PRIMARY KEY (player)"));
        assert!(sql.contains("player TEXT"));
        assert!(sql.contains("x INTEGER"));
        assert!(sql.contains("y INTEGER"));
    }

    #[test]
    fn test_generate_create_table_sql_for_resource_with_multiple_keys() {
        let test_json = json!({
          "components": [],
          "resources": [
            {
              "balance": {
                "fields": [
                  { "account": "address" },
                  { "asset": "address" },
                  { "amount": "u256" }
                ],
                "keys": ["account", "asset"],
                "offchain": false
              }
            }
          ],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "balance");
        assert_eq!(table.table_type, "resource");
        assert_eq!(table.fields.len(), 3);
        
        let sql = table.generate_create_table_sql();
        // Verify SQL uses multiple key fields as PRIMARY KEY
        assert!(sql.contains("PRIMARY KEY (account, asset)"));
        assert!(sql.contains("account TEXT"));
        assert!(sql.contains("asset TEXT"));
        assert!(sql.contains("amount TEXT"));
    }

    #[test]
    fn test_generate_create_table_sql_for_component_with_multiple_non_key_fields() {
        let test_json = json!({
          "components": [
            {
              "stats": {
                "fields": [
                  { "player": "address" },
                  { "health": "u32" },
                  { "mana": "u32" },
                  { "level": "u8" }
                ],
                "keys": ["player"],
                "offchain": false
              }
            }
          ],
          "resources": [],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "stats");
        assert_eq!(table.table_type, "component");
        assert_eq!(table.fields.len(), 4);
        
        let sql = table.generate_create_table_sql();
        // Verify SQL uses key fields as PRIMARY KEY
        assert!(sql.contains("PRIMARY KEY (player)"));
        assert!(sql.contains("player TEXT"));
        assert!(sql.contains("health INTEGER"));
        assert!(sql.contains("mana INTEGER"));
        assert!(sql.contains("level INTEGER"));
    }

    #[test]
    fn test_generate_create_table_sql_for_resource_with_empty_fields() {
        let test_json = json!({
          "components": [],
          "resources": [
            {
              "empty_resource": {
                "fields": [],
                "keys": [],
                "offchain": false
              }
            }
          ],
          "enums": [],
          "package_id": "0x1234567890123456789012345678901234567890",
          "start_checkpoint": "1"
        });

        let result = TableMetadata::from_json(test_json);
        assert!(result.is_ok());

        let (package_id, start_checkpoint, tables) = result.unwrap();
        assert_eq!(tables.len(), 1);
        
        let table = &tables[0];
        assert_eq!(table.name, "empty_resource");
        assert_eq!(table.table_type, "resource");
        assert_eq!(table.fields.len(), 0);
        
        let sql = table.generate_create_table_sql();
        // Verify SQL does not contain PRIMARY KEY (because there are no fields)
        assert!(!sql.contains("PRIMARY KEY"));
        assert!(sql.contains("created_at TIMESTAMPTZ"));
        assert!(sql.contains("updated_at TIMESTAMPTZ"));
    }
}
