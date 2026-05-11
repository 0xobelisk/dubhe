use crate::events::Event;
use crate::primitives::MoveTypeParser;
use crate::sql::DBData;
use anyhow::Result;
use bcs;
use move_core_types::u256::U256;
use prost_types::ListValue;
use prost_types::{Struct, Value as ProtoValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::collections::HashMap;
use sui_types::base_types::SuiAddress;

pub const ONCHAIN_TABLE: &str = "ont";
pub const OFFCHAIN_TABLE: &str = "oft";

#[derive(Debug, Deserialize, Default)]
pub struct Field {
    pub table: String,
    pub name: String,
    pub index: u8,
    pub move_type: String,
    pub db_type: String,
    pub primary_key: bool,
}

impl Field {
    pub fn new(table: String, name: String) -> Self {
        Self {
            table,
            name,
            ..Default::default()
        }
    }

    pub fn index(&mut self, index: u8) -> &mut Self {
        self.index = index;
        self
    }

    pub fn move_type(&mut self, move_type: String) -> &mut Self {
        self.move_type = move_type;
        self
    }

    pub fn db_type(&mut self, db_type: String) -> &mut Self {
        self.db_type = db_type;
        self
    }

    pub fn primary_key(&mut self, primary_key: bool) -> &mut Self {
        self.primary_key = primary_key;
        self
    }

    pub fn proto_value(&self, value: &[u8]) -> ProtoValue {
        match self.move_type.as_str() {
            "bool" => {
                let parsed_value: bool = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::BoolValue(parsed_value)),
                }
            }
            "u8" => {
                let parsed_value: u8 = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::NumberValue(parsed_value as f64)),
                }
            }
            "u16" => {
                let parsed_value: u16 = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::NumberValue(parsed_value as f64)),
                }
            }
            "u32" => {
                let parsed_value: u32 = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::NumberValue(parsed_value as f64)),
                }
            }
            "u64" => {
                let parsed_value: u64 = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::NumberValue(parsed_value as f64)),
                }
            }
            "u128" => {
                let parsed_value: u128 = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::StringValue(
                        parsed_value.to_string(),
                    )),
                }
            }
            "u256" => {
                let parsed_value: U256 = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::StringValue(
                        parsed_value.to_string(),
                    )),
                }
            }
            "address" => {
                let parsed_value: SuiAddress = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::StringValue(
                        parsed_value.to_string(),
                    )),
                }
            }
            "String" => {
                let parsed_value: String = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::StringValue(
                        parsed_value.to_string(),
                    )),
                }
            }
            "vector<bool>" => {
                let parsed_value: Vec<bool> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::BoolValue(*v)),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<u8>" => {
                let parsed_value: Vec<u8> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::NumberValue(*v as f64)),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<u16>" => {
                let parsed_value: Vec<u16> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::NumberValue(*v as f64)),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<u32>" => {
                let parsed_value: Vec<u32> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::NumberValue(*v as f64)),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<u64>" => {
                let parsed_value: Vec<u64> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::NumberValue(*v as f64)),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<u128>" => {
                let parsed_value: Vec<u128> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::StringValue(v.to_string())),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<u256>" => {
                let parsed_value: Vec<U256> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::StringValue(v.to_string())),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<address>" => {
                let parsed_value: Vec<SuiAddress> = bcs::from_bytes(value).unwrap();
                println!("parsed_value: {:?}", parsed_value);
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::StringValue(v.to_string())),
                            })
                            .collect(),
                    })),
                }
            }
            "vector<String>" => {
                let parsed_value: Vec<String> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::StringValue(v.to_string())),
                            })
                            .collect(),
                    })),
                }
            }
            // Llist list
            "vector<vector<u8>>" => {
                let parsed_value: Vec<Vec<u8>> = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::ListValue(ListValue {
                        values: parsed_value
                            .iter()
                            .map(|v| ProtoValue {
                                kind: Some(prost_types::value::Kind::ListValue(ListValue {
                                    values: v
                                        .iter()
                                        .map(|v| ProtoValue {
                                            kind: Some(prost_types::value::Kind::NumberValue(
                                                *v as f64,
                                            )),
                                        })
                                        .collect(),
                                })),
                            })
                            .collect(),
                    })),
                }
            }
            // String
            _ => {
                let parsed_value: String = bcs::from_bytes(value).unwrap();
                ProtoValue {
                    kind: Some(prost_types::value::Kind::StringValue(
                        parsed_value.to_string(),
                    )),
                }
            }
        }
    }
}

#[derive(Debug, Deserialize, Default)]
pub struct Enum {
    pub name: String,
    pub index: u8,
    pub value: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct Table {
    pub name: String,
    pub offchain: bool,
    pub component: bool,
}

#[derive(Debug, Clone, Deserialize, Default, Eq, PartialEq)]
pub struct StorageSchemaField {
    pub kind: String,
    pub name: String,
    pub field_name: String,
    pub field_type: String,
    pub field_index: u8,
    pub is_key: bool,
}

#[derive(Debug, Clone, Deserialize, Default, Eq, PartialEq)]
pub struct StorageSchema {
    pub kind: String,
    pub name: String,
    pub schema_json: String,
    pub fields: Vec<StorageSchemaField>,
}

fn sql_string(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn stable_hash(value: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{:016x}", hash)
}

#[derive(Debug, Deserialize, Default)]
pub struct DubheConfig {
    pub fields: Vec<Field>,
    pub enums: Vec<Enum>,
    pub tables: Vec<Table>,
    pub storage_schemas: Vec<StorageSchema>,
    pub original_package_id: String,
    pub start_checkpoint: String,
    /// Canonical dapp_key type string, e.g. `"0105c1...::dapp_key::DappKey"`.
    /// Derived from original_package_id at build time. Used for direct string
    /// comparison when filtering system-table events in the indexer.
    pub dapp_key: String,
}

impl DubheConfig {
    pub fn new(original_package_id: String, start_checkpoint: String) -> Self {
        let hex = original_package_id.trim_start_matches("0x");
        let padded = format!("{:0>64}", hex);
        let dapp_key = format!("{}::dapp_key::DappKey", padded);
        Self {
            fields: Vec::new(),
            enums: Vec::new(),
            tables: Vec::new(),
            storage_schemas: Vec::new(),
            original_package_id,
            start_checkpoint,
            dapp_key,
        }
    }

    pub fn push_field(&mut self, field: Field) -> &mut Self {
        self.fields.push(field);
        self
    }

    pub fn push_enum(&mut self, enum_: Enum) -> &mut Self {
        self.enums.push(enum_);
        self
    }

    pub fn push_table(&mut self, table: Table) -> &mut Self {
        self.tables.push(table);
        self
    }

    pub fn dapp_schema_hash(&self) -> String {
        let mut entries = self.storage_schemas.clone();
        entries.sort_by(|a, b| (&a.kind, &a.name).cmp(&(&b.kind, &b.name)));

        let mut input = String::new();
        for schema in entries {
            input.push_str(&schema.kind);
            input.push('|');
            input.push_str(&schema.name);
            input.push('|');
            input.push_str(&schema.schema_json);
            input.push('\n');
        }
        stable_hash(&input)
    }

    pub fn storage_schema_upsert_sql(&self) -> Vec<String> {
        let config_hash = self.dapp_schema_hash();
        let mut sqls = Vec::new();

        for schema in &self.storage_schemas {
            sqls.push(format!(
                "INSERT INTO storage_schemas (kind, name, schema_json, config_hash, updated_at) VALUES ({}, {}, {}, {}, CURRENT_TIMESTAMP) ON CONFLICT (kind, name) DO UPDATE SET schema_json = EXCLUDED.schema_json, config_hash = EXCLUDED.config_hash, updated_at = EXCLUDED.updated_at;",
                sql_string(&schema.kind),
                sql_string(&schema.name),
                sql_string(&schema.schema_json),
                sql_string(&config_hash),
            ));

            for field in &schema.fields {
                sqls.push(format!(
                    "INSERT INTO storage_schema_fields (kind, name, field_name, field_type, field_index, is_key, updated_at) VALUES ({}, {}, {}, {}, {}, {}, CURRENT_TIMESTAMP) ON CONFLICT (kind, name, field_name) DO UPDATE SET field_type = EXCLUDED.field_type, field_index = EXCLUDED.field_index, is_key = EXCLUDED.is_key, updated_at = EXCLUDED.updated_at;",
                    sql_string(&field.kind),
                    sql_string(&field.name),
                    sql_string(&field.field_name),
                    sql_string(&field.field_type),
                    field.field_index,
                    field.is_key,
                ));
            }
        }

        sqls.push(format!(
            "INSERT INTO indexer_schema_state (id, dapp_schema_hash, schema_json, updated_at) VALUES (1, {}, {}, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET dapp_schema_hash = EXCLUDED.dapp_schema_hash, schema_json = EXCLUDED.schema_json, updated_at = EXCLUDED.updated_at;",
            sql_string(&config_hash),
            sql_string(&self.combined_schema_json()),
        ));

        sqls
    }

    pub fn combined_schema_json(&self) -> String {
        let mut entries = self.storage_schemas.clone();
        entries.sort_by(|a, b| (&a.kind, &a.name).cmp(&(&b.kind, &b.name)));
        let values: Vec<BTreeMap<&str, &str>> = entries
            .iter()
            .map(|schema| {
                let mut value = BTreeMap::new();
                value.insert("kind", schema.kind.as_str());
                value.insert("name", schema.name.as_str());
                value.insert("schema_json", schema.schema_json.as_str());
                value
            })
            .collect();
        serde_json::to_string(&values).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn field_names_by_table_and_primary_key(&self, table_id: &str) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id && field.primary_key)
            .map(|field| format!("\"{}\"", field.name))
            .collect()
    }

    pub fn field_names_by_table(&self, table_id: &str) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id)
            .map(|field| format!("\"{}\"", field.name))
            .collect()
    }

    pub fn field_names_and_db_types_by_table(&self, table_id: &str) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id)
            .map(|field| format!("\"{}\" {}", field.name, field.db_type))
            .collect()
    }

    pub fn field_values_by_table(
        &self,
        table_id: &str,
        key_tuple: &Vec<Vec<u8>>,
        value_tuple: &Vec<Vec<u8>>,
    ) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id)
            .map(|field| {
                if field.primary_key {
                    if self.is_enum(&field.move_type) {
                        let enum_index = bcs::from_bytes(&key_tuple[field.index as usize]).unwrap();
                        self.enum_value(&field.move_type, enum_index)
                    } else {
                        into_sql_string(&field.move_type, &key_tuple[field.index as usize]).unwrap()
                    }
                } else {
                    if self.is_enum(&field.move_type) {
                        let enum_index =
                            bcs::from_bytes(&value_tuple[field.index as usize]).unwrap();
                        self.enum_value(&field.move_type, enum_index)
                    } else {
                        into_sql_string(&field.move_type, &value_tuple[field.index as usize])
                            .unwrap()
                    }
                }
            })
            .collect::<Vec<String>>()
    }

    pub fn field_proto_values_by_table(
        &self,
        table_id: &str,
        key_tuple: &Vec<Vec<u8>>,
        value_tuple: &Vec<Vec<u8>>,
    ) -> BTreeMap<String, ProtoValue> {
        let mut fields = BTreeMap::new();
        self.fields
            .iter()
            .filter(|field| field.table == table_id)
            .for_each(|field| {
                if field.primary_key {
                    if self.is_enum(&field.move_type) {
                        let enum_index = bcs::from_bytes(&key_tuple[field.index as usize]).unwrap();
                        fields.insert(
                            field.name.clone(),
                            ProtoValue {
                                kind: Some(prost_types::value::Kind::StringValue(
                                    self.enum_value_string(&field.move_type, enum_index),
                                )),
                            },
                        );
                    } else {
                        fields.insert(
                            field.name.clone(),
                            field.proto_value(&key_tuple[field.index as usize]),
                        );
                    }
                } else {
                    if self.is_enum(&field.move_type) {
                        let enum_index =
                            bcs::from_bytes(&value_tuple[field.index as usize]).unwrap();
                        fields.insert(
                            field.name.clone(),
                            ProtoValue {
                                kind: Some(prost_types::value::Kind::StringValue(
                                    self.enum_value_string(&field.move_type, enum_index),
                                )),
                            },
                        );
                    } else {
                        fields.insert(
                            field.name.clone(),
                            field.proto_value(&value_tuple[field.index as usize]),
                        );
                    }
                }
            });
        fields
    }

    pub fn field_proto_value_by_table_and_index(
        &self,
        table_id: &str,
        index: u8,
        value: &[u8],
    ) -> BTreeMap<String, ProtoValue> {
        let mut fields = BTreeMap::new();
        self.fields
            .iter()
            .filter(|field| field.table == table_id && field.index == index)
            .for_each(|field| {
                if self.is_enum(&field.move_type) {
                    let enum_index = bcs::from_bytes(&value).unwrap();
                    fields.insert(
                        field.name.clone(),
                        ProtoValue {
                            kind: Some(prost_types::value::Kind::StringValue(
                                self.enum_value_string(&field.move_type, enum_index),
                            )),
                        },
                    );
                } else {
                    fields.insert(field.name.clone(), field.proto_value(value));
                }
            });
        fields
    }

    /// Generate a proto struct for a single named field (used by StoreSetField).
    pub fn field_proto_value_by_table_and_name(
        &self,
        table_id: &str,
        field_name: &str,
        value: &[u8],
    ) -> BTreeMap<String, ProtoValue> {
        let mut fields = BTreeMap::new();
        self.fields
            .iter()
            .filter(|field| field.table == table_id && field.name == field_name)
            .for_each(|field| {
                if self.is_enum(&field.move_type) {
                    let enum_index = bcs::from_bytes(&value).unwrap();
                    fields.insert(
                        field.name.clone(),
                        ProtoValue {
                            kind: Some(prost_types::value::Kind::StringValue(
                                self.enum_value_string(&field.move_type, enum_index),
                            )),
                        },
                    );
                } else {
                    fields.insert(field.name.clone(), field.proto_value(value));
                }
            });
        fields
    }

    pub fn field_values_with_set_by_table(
        &self,
        table_id: &str,
        key_tuple: &Vec<Vec<u8>>,
        value_tuple: &Vec<Vec<u8>>,
    ) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id)
            .map(|field| {
                if field.primary_key {
                    if self.is_enum(&field.move_type) {
                        let enum_index = bcs::from_bytes(&key_tuple[field.index as usize]).unwrap();
                        format!(
                            "\"{}\" = {}",
                            field.name,
                            self.enum_value(&field.move_type, enum_index)
                        )
                    } else {
                        format!(
                            "\"{}\" = {}",
                            field.name,
                            into_sql_string(&field.move_type, &key_tuple[field.index as usize])
                                .unwrap()
                        )
                    }
                } else {
                    if self.is_enum(&field.move_type) {
                        let enum_index =
                            bcs::from_bytes(&value_tuple[field.index as usize]).unwrap();
                        format!(
                            "\"{}\" = {}",
                            field.name,
                            self.enum_value(&field.move_type, enum_index)
                        )
                    } else {
                        format!(
                            "\"{}\" = {}",
                            field.name,
                            into_sql_string(&field.move_type, &value_tuple[field.index as usize])
                                .unwrap()
                        )
                    }
                }
            })
            .collect::<Vec<String>>()
    }

    pub fn field_values_by_table_and_non_primary_key(
        &self,
        table_id: &str,
        value_tuple: &Vec<Vec<u8>>,
    ) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id && !field.primary_key)
            .map(|field| {
                if self.is_enum(&field.move_type) {
                    let enum_index = bcs::from_bytes(&value_tuple[field.index as usize]).unwrap();
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        self.enum_value(&field.move_type, enum_index)
                    )
                } else {
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        into_sql_string(&field.move_type, &value_tuple[field.index as usize])
                            .unwrap()
                    )
                }
            })
            .collect::<Vec<String>>()
    }

    pub fn field_values_by_table_and_primary_key(
        &self,
        table_id: &str,
        key_tuple: &Vec<Vec<u8>>,
    ) -> Vec<String> {
        self.fields
            .iter()
            .filter(|field| field.table == table_id && field.primary_key)
            .map(|field| {
                if self.is_enum(&field.move_type) {
                    let enum_index = bcs::from_bytes(&key_tuple[field.index as usize]).unwrap();
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        self.enum_value(&field.move_type, enum_index)
                    )
                } else {
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        into_sql_string(&field.move_type, &key_tuple[field.index as usize])
                            .unwrap()
                    )
                }
            })
            .collect::<Vec<String>>()
    }

    pub fn field_value_by_table_and_index(
        &self,
        table_id: &str,
        index: u8,
        value: &[u8],
    ) -> String {
        self.fields
            .iter()
            .filter(|field| field.table == table_id && field.index == index && !field.primary_key)
            .map(|field| {
                if self.is_enum(&field.move_type) {
                    let enum_index = bcs::from_bytes(&value).unwrap();
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        self.enum_value(&field.move_type, enum_index)
                    )
                } else {
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        into_sql_string(&field.move_type, &value).unwrap()
                    )
                }
            })
            .collect::<Vec<String>>()
            .join(",")
    }

    /// Generate a SQL SET clause for a single named field (used by StoreSetField).
    pub fn field_value_by_table_and_name(
        &self,
        table_id: &str,
        field_name: &str,
        value: &[u8],
    ) -> String {
        self.fields
            .iter()
            .filter(|field| {
                field.table == table_id && field.name == field_name && !field.primary_key
            })
            .map(|field| {
                if self.is_enum(&field.move_type) {
                    let enum_index = bcs::from_bytes(&value).unwrap();
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        self.enum_value(&field.move_type, enum_index)
                    )
                } else {
                    format!(
                        "\"{}\" = {}",
                        field.name,
                        into_sql_string(&field.move_type, &value).unwrap()
                    )
                }
            })
            .collect::<Vec<String>>()
            .join(",")
    }

    pub fn is_exist_primary_key(&self, table_id: &str) -> bool {
        self.fields
            .iter()
            .any(|field| field.table == table_id && field.primary_key)
    }

    pub fn is_enum(&self, field_type: &str) -> bool {
        self.enums.iter().any(|enum_| enum_.name == field_type)
    }

    pub fn enum_value(&self, field_type: &str, index: u8) -> String {
        self.enums
            .iter()
            .find(|enum_| enum_.name == field_type && enum_.index == index)
            .and_then(|enum_| Some(format!("'{}'", enum_.value.clone())))
            .unwrap_or_default()
    }

    pub fn enum_value_string(&self, field_type: &str, index: u8) -> String {
        self.enums
            .iter()
            .find(|enum_| enum_.name == field_type && enum_.index == index)
            .and_then(|enum_| Some(enum_.value.clone()))
            .unwrap_or_default()
    }

    pub fn from_json(json: Value) -> Result<Self> {
        let dubhe_config_json: DubheConfigJson = serde_json::from_value(json)?;

        let original_package_id = dubhe_config_json
            .original_package_id
            .clone()
            .or(dubhe_config_json.package_id.clone())
            .ok_or(anyhow::anyhow!("No package id found in config file"))?;
        let start_checkpoint = dubhe_config_json
            .start_checkpoint
            .clone()
            .ok_or(anyhow::anyhow!("No start checkpoint found in config file"))?;

        let mut dubhe_config = Self::new(original_package_id, start_checkpoint);
        // If config.json already has a pre-computed dapp_key, prefer it over the derived one.
        if let Some(dapp_key) = dubhe_config_json.dapp_key.clone() {
            dubhe_config.dapp_key = dapp_key;
        }
        dubhe_config.storage_schemas = StorageSchema::from_config_json(&dubhe_config_json)?;

        // handle enums
        for enum_ in dubhe_config_json.enums {
            enum_.into_iter().for_each(|(name, values)| {
                values.iter().enumerate().for_each(|(index, value)| {
                    dubhe_config.push_enum(Enum {
                        name: name.clone(),
                        index: index as u8,
                        value: value.clone(),
                    });
                });
            });
        }

        // handle resources
        for tables in dubhe_config_json.resources {
            for (table_name, table_info) in tables {
                dubhe_config.push_table(Table {
                    name: table_name.clone(),
                    offchain: table_info.offchain,
                    component: false,
                });

                let mut key_field_index = 0;
                let mut value_field_index = 0;
                for field in table_info.fields {
                    field.into_iter().for_each(|(field_name, field_type)| {
                        let mut f = Field::new(table_name.clone(), field_name.clone());
                        if dubhe_config.is_enum(&field_type) {
                            f.move_type(field_type.clone());
                            f.db_type("TEXT".to_string());
                        } else {
                            f.move_type(field_type.clone());
                            f.db_type(get_sql_type(&field_type));
                        }
                        if table_info.keys.contains(&field_name) {
                            f.primary_key(true);
                            f.index(key_field_index);
                            key_field_index += 1;
                        } else {
                            f.index(value_field_index);
                            f.primary_key(false);
                            value_field_index += 1;
                        }
                        dubhe_config.push_field(f);
                    });
                }
            }
        }

        Ok(dubhe_config)
    }

    pub fn create_tables_sql(&self) -> Vec<String> {
        self.tables
            .iter()
            .map(|table| {
                if self.is_exist_primary_key(&table.name) {
                    let mut sql = String::new();
                    sql.push_str(&format!(
                        "CREATE TABLE IF NOT EXISTS {} (",
                        format!("store_{}", table.name)
                    ));
                    sql.push_str(
                        &self
                            .field_names_and_db_types_by_table(&table.name)
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str("created_at_timestamp_ms BIGINT DEFAULT 0,");
                    sql.push_str("updated_at_timestamp_ms BIGINT DEFAULT 0,");
                    sql.push_str("last_update_digest VARCHAR(255) DEFAULT '',");
                    sql.push_str("is_deleted BOOLEAN DEFAULT FALSE,");
                    sql.push_str("PRIMARY KEY (");
                    sql.push_str(
                        &self
                            .field_names_by_table_and_primary_key(&table.name)
                            .join(","),
                    );
                    sql.push_str("));");
                    sql
                } else if !table.offchain {
                    let mut sql = String::new();
                    sql.push_str(&format!(
                        "CREATE TABLE IF NOT EXISTS {} (",
                        format!("store_{}", table.name)
                    ));
                    sql.push_str(
                        "unique_resource_id INTEGER PRIMARY KEY CHECK (unique_resource_id = 1),",
                    );
                    sql.push_str(
                        &self
                            .field_names_and_db_types_by_table(&table.name)
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str("created_at_timestamp_ms BIGINT DEFAULT 0,");
                    sql.push_str("updated_at_timestamp_ms BIGINT DEFAULT 0,");
                    sql.push_str("last_update_digest VARCHAR(255) DEFAULT '',");
                    sql.push_str("is_deleted BOOLEAN DEFAULT FALSE");
                    sql.push_str(");");
                    sql
                } else {
                    let mut sql = String::new();
                    sql.push_str(&format!(
                        "CREATE TABLE IF NOT EXISTS {} (",
                        format!("store_{}", table.name)
                    ));
                    sql.push_str(
                        &self
                            .field_names_and_db_types_by_table(&table.name)
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str("created_at_timestamp_ms BIGINT DEFAULT 0,");
                    sql.push_str("updated_at_timestamp_ms BIGINT DEFAULT 0,");
                    sql.push_str("last_update_digest VARCHAR(255) DEFAULT '',");
                    sql.push_str("is_deleted BOOLEAN DEFAULT FALSE");
                    sql.push_str(");");
                    sql
                }
            })
            .collect()
    }

    /// Generate CREATE INDEX statements for every store table.
    ///
    /// For tables that have an `entity_id` primary-key field, a single-column index is created
    /// so that lookups by entity are fast.  When the table also has additional primary-key columns
    /// (composite key), a second index covering all PK columns is created.
    ///
    /// Additionally, every store table receives:
    /// - A partial index on `is_deleted = FALSE` to keep active-record queries fast.
    /// - An index on `updated_at_timestamp_ms` for incremental sync / time-range queries.
    ///
    /// Finally, PostGraphile Smart Comments are generated to declare FK-like relationships
    /// between store tables and the corresponding system tables, enabling nested GraphQL
    /// resolvers without actual FOREIGN KEY constraints:
    ///
    /// - kind="resource" with entity_id PK → user_storages(canonical_owner)
    ///   Enables: `userStorageByEntityId { sessionKey, sessionExpiresAt }`
    /// - kind="object" with entity_id PK   → object_storages(entity_id_raw)
    ///   Enables: `objectStorageByEntityId { objectType, isDestroyed }`
    pub fn create_indexes_sql(&self) -> Vec<String> {
        let mut sqls = Vec::new();
        for table in &self.tables {
            let table_name = &table.name;
            let store_name = format!("store_{}", table_name);

            let pk_fields: Vec<String> = self
                .fields
                .iter()
                .filter(|f| f.table == *table_name && f.primary_key)
                .map(|f| f.name.clone())
                .collect();

            let has_entity_id = pk_fields.iter().any(|n| n == "entity_id");

            if has_entity_id {
                // Single-column index on entity_id for fast entity lookups.
                sqls.push(format!(
                    "CREATE INDEX IF NOT EXISTS \"idx_{store_name}_entity_id\" ON \"{store_name}\" (\"entity_id\");"
                ));

                // If there are additional key columns beyond entity_id, add a composite index.
                if pk_fields.len() > 1 {
                    let cols: Vec<String> =
                        pk_fields.iter().map(|n| format!("\"{}\"", n)).collect();
                    sqls.push(format!(
                        "CREATE INDEX IF NOT EXISTS \"idx_{store_name}_composite\" ON \"{store_name}\" ({});",
                        cols.join(", ")
                    ));
                }

                // Determine the schema kind for this table so we can declare the right FK
                // relationship.  A table may only appear in one kind.
                let schema_kind = self
                    .storage_schemas
                    .iter()
                    .find(|s| s.name == *table_name)
                    .map(|s| s.kind.as_str())
                    .unwrap_or("");

                match schema_kind {
                    "resource" => {
                        // entity_id == canonical_owner (user address).
                        // Declares a virtual FK so PostGraphile generates:
                        //   store_gold { userStorageByEntityId { sessionKey ... } }
                        //   user_storages { storeGoldByEntityId { amount } }
                        sqls.push(format!(
                            "COMMENT ON TABLE \"{store_name}\" IS E'@foreignKey (entity_id) references user_storages (canonical_owner)';"
                        ));
                    }
                    // "object": entity_id is derived from the object's own key fields, not a user
                    // address.  object_storages uses object_id (Sui object ID) as its PK, while
                    // entity_id_raw stores raw bytes-as-hex which may differ in format from the
                    // BCS-decoded entity_id written to store_* tables.  Additionally entity_id_raw
                    // is not unique in object_storages (a destroyed-and-recreated object yields
                    // multiple rows with the same entity_id_raw but different object_ids), making
                    // a @foreignKey ambiguous.  The correct relationship is already modelled via
                    // object_id through the object_storage_fields Smart Comment.
                    //
                    // "scene" / "permit" / "enum" – no entity_id FK relationship applies.
                    _ => {}
                }
            }

            // Partial index for active (non-deleted) record queries.
            // Queries like "fetch all active wheat records" always filter is_deleted = FALSE;
            // this index skips deleted rows entirely, staying small as data accumulates.
            sqls.push(format!(
                "CREATE INDEX IF NOT EXISTS \"idx_{store_name}_active\" ON \"{store_name}\" (\"is_deleted\") WHERE \"is_deleted\" = FALSE;"
            ));

            // Index for incremental sync queries and time-range analytics.
            // The indexer and GraphQL clients often need "records updated after checkpoint X".
            sqls.push(format!(
                "CREATE INDEX IF NOT EXISTS \"idx_{store_name}_updated\" ON \"{store_name}\" (\"updated_at_timestamp_ms\");"
            ));
        }
        sqls
    }

    pub fn create_indexer_tables_sql(&self) -> Vec<String> {
        vec![
            "CREATE TABLE IF NOT EXISTS user_storages (
                dapp_key TEXT NOT NULL,
                canonical_owner TEXT NOT NULL,
                user_storage_id TEXT PRIMARY KEY,
                session_key TEXT,
                session_expires_at BIGINT,
                created_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT,
                UNIQUE (dapp_key, canonical_owner)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS object_storages (
                object_id TEXT PRIMARY KEY,
                dapp_key TEXT NOT NULL,
                object_type TEXT NOT NULL,
                object_type_raw TEXT NOT NULL,
                entity_id_raw TEXT NOT NULL,
                is_destroyed BOOLEAN DEFAULT FALSE,
                created_at_checkpoint BIGINT,
                destroyed_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS object_storage_fields (
                object_id TEXT NOT NULL,
                field_name_raw TEXT NOT NULL,
                dapp_key TEXT NOT NULL,
                object_type TEXT NOT NULL,
                object_type_raw TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_value_raw TEXT,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT,
                PRIMARY KEY (object_id, field_name_raw)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS scene_storages (
                scene_id TEXT PRIMARY KEY,
                dapp_key TEXT NOT NULL,
                scene_type TEXT NOT NULL,
                scene_type_raw TEXT NOT NULL,
                authorization_kind TEXT,
                authorization_kind_raw TEXT,
                authorized_permit_id TEXT,
                is_destroyed BOOLEAN DEFAULT FALSE,
                created_at_checkpoint BIGINT,
                destroyed_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS scene_storage_fields (
                scene_id TEXT NOT NULL,
                field_name_raw TEXT NOT NULL,
                dapp_key TEXT NOT NULL,
                scene_type TEXT NOT NULL,
                scene_type_raw TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_value_raw TEXT,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT,
                PRIMARY KEY (scene_id, field_name_raw)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS scene_permits (
                permit_id TEXT PRIMARY KEY,
                dapp_key TEXT NOT NULL,
                permit_type TEXT NOT NULL,
                permit_type_raw TEXT NOT NULL,
                expires_at BIGINT,
                invites_expire_at BIGINT,
                max_participants BIGINT,
                participant_count BIGINT DEFAULT 0,
                expired BOOLEAN DEFAULT FALSE,
                created_at_checkpoint BIGINT,
                expired_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS scene_permit_participants (
                permit_id TEXT NOT NULL,
                participant TEXT NOT NULL,
                dapp_key TEXT NOT NULL,
                permit_type TEXT NOT NULL,
                permit_type_raw TEXT NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                last_action TEXT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT,
                PRIMARY KEY (permit_id, participant)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS marketplace_listings (
                listing_id TEXT PRIMARY KEY,
                dapp_key TEXT NOT NULL,
                seller TEXT NOT NULL,
                buyer TEXT,
                record_type TEXT NOT NULL,
                record_type_raw TEXT NOT NULL,
                record_key_raw TEXT NOT NULL,
                field_names_raw TEXT NOT NULL,
                record_data_raw TEXT NOT NULL,
                price BIGINT NOT NULL,
                coin_type TEXT NOT NULL,
                is_fungible BOOLEAN DEFAULT FALSE,
                listed_until BIGINT,
                status TEXT NOT NULL,
                created_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS dapp_runtime_state (
                dapp_key TEXT PRIMARY KEY,
                admin TEXT,
                dapp_storage_id TEXT,
                created_at BIGINT,
                version BIGINT,
                package_id TEXT,
                credit_pool TEXT,
                settlement_mode BIGINT,
                write_fee_share_bps BIGINT,
                paused BOOLEAN,
                suspended BOOLEAN,
                last_runtime_event TEXT,
                last_runtime_actor TEXT,
                last_runtime_amount TEXT,
                created_at_checkpoint BIGINT,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS dapp_marketplace_fees (
                dapp_key TEXT NOT NULL,
                listing_id TEXT NOT NULL,
                coin_type TEXT NOT NULL,
                total_fee BIGINT NOT NULL,
                treasury_amount BIGINT NOT NULL,
                dapp_amount BIGINT NOT NULL,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT,
                PRIMARY KEY (dapp_key, listing_id)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS dapp_fee_state (
                entity_id TEXT PRIMARY KEY,
                base_fee_per_write TEXT,
                bytes_fee_per_byte TEXT,
                free_credit TEXT,
                credit_pool TEXT,
                total_settled TEXT,
                created_at_timestamp_ms BIGINT DEFAULT 0,
                updated_at_timestamp_ms BIGINT DEFAULT 0,
                last_update_digest VARCHAR(255) DEFAULT '',
                is_deleted BOOLEAN DEFAULT FALSE
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS dapp_revenue_state (
                entity_id TEXT PRIMARY KEY,
                dapp_revenue BIGINT NOT NULL DEFAULT 0,
                coin_type TEXT,
                created_at_timestamp_ms BIGINT DEFAULT 0,
                updated_at_timestamp_ms BIGINT DEFAULT 0,
                last_update_digest VARCHAR(255) DEFAULT '',
                is_deleted BOOLEAN DEFAULT FALSE
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS sessions (
                dapp_key TEXT NOT NULL,
                canonical TEXT NOT NULL,
                session_wallet TEXT NOT NULL,
                expires_at BIGINT,
                active BOOLEAN DEFAULT FALSE,
                updated_at_checkpoint BIGINT,
                last_update_digest TEXT,
                last_event_seq BIGINT,
                PRIMARY KEY (dapp_key, canonical)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS indexer_schema_migrations (
                version BIGINT PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS indexer_schema_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                dapp_schema_hash TEXT NOT NULL,
                schema_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS storage_schemas (
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                schema_json TEXT NOT NULL,
                config_hash TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (kind, name)
            );"
            .to_string(),
            "CREATE TABLE IF NOT EXISTS storage_schema_fields (
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_type TEXT NOT NULL,
                field_index INTEGER NOT NULL,
                is_key BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (kind, name, field_name)
            );"
            .to_string(),
            // ── user_storages ──────────────────────────────────────────────────────
            // Existing: look up by canonical owner (kept for compatibility).
            "CREATE INDEX IF NOT EXISTS idx_user_storages_owner ON user_storages (canonical_owner);"
                .to_string(),
            // Session validation covering index: one index scan simultaneously checks the session
            // key and its expiry, avoiding a second heap access.  Replaces two narrower indexes.
            "CREATE INDEX IF NOT EXISTS idx_user_storages_session ON user_storages (session_key, session_expires_at) WHERE session_key IS NOT NULL;"
                .to_string(),
            // Sync watermark: incremental indexer catch-up queries ordered by checkpoint.
            "CREATE INDEX IF NOT EXISTS idx_user_storages_checkpoint ON user_storages (updated_at_checkpoint);"
                .to_string(),

            // ── object_storages ────────────────────────────────────────────────────
            // Existing: lookup by (dapp_key, object_type, entity_id_raw) – kept for compatibility.
            "CREATE INDEX IF NOT EXISTS idx_object_storages_lookup ON object_storages (dapp_key, object_type, entity_id_raw);"
                .to_string(),
            // List all active (non-destroyed) objects of a specific type.
            "CREATE INDEX IF NOT EXISTS idx_object_storages_type_active ON object_storages (object_type, is_destroyed);"
                .to_string(),
            // Cross-type entity lookup: find every object storage that belongs to an entity.
            "CREATE INDEX IF NOT EXISTS idx_object_storages_entity ON object_storages (entity_id_raw);"
                .to_string(),
            // Sync watermark.
            "CREATE INDEX IF NOT EXISTS idx_object_storages_checkpoint ON object_storages (updated_at_checkpoint);"
                .to_string(),

            // ── object_storage_fields ──────────────────────────────────────────────
            // Existing: lookup by (dapp_key, object_type, field_name) – kept.
            "CREATE INDEX IF NOT EXISTS idx_object_fields_lookup ON object_storage_fields (dapp_key, object_type, field_name);"
                .to_string(),
            // Quickly fetch all non-deleted fields of a specific object (augments PK).
            "CREATE INDEX IF NOT EXISTS idx_object_fields_active ON object_storage_fields (object_id, is_deleted);"
                .to_string(),
            // ECS-style filter: find objects where a named field has a specific value.
            "CREATE INDEX IF NOT EXISTS idx_object_fields_value ON object_storage_fields (field_name, field_value_raw) WHERE is_deleted = FALSE;"
                .to_string(),
            // GC: locate recently deleted fields for cleanup jobs.
            "CREATE INDEX IF NOT EXISTS idx_object_fields_deleted ON object_storage_fields (is_deleted, updated_at_checkpoint);"
                .to_string(),
            // Standalone checkpoint index: the compound (is_deleted, updated_at_checkpoint) index
            // cannot satisfy queries that filter only on updated_at_checkpoint (no is_deleted filter).
            "CREATE INDEX IF NOT EXISTS idx_object_fields_checkpoint ON object_storage_fields (updated_at_checkpoint);"
                .to_string(),

            // ── scene_storages ─────────────────────────────────────────────────────
            // Existing: permit reverse-lookup.
            "CREATE INDEX IF NOT EXISTS idx_scene_storages_permit ON scene_storages (authorized_permit_id);"
                .to_string(),
            // List active scenes of a given type (e.g., open lobbies).
            "CREATE INDEX IF NOT EXISTS idx_scene_storages_type_active ON scene_storages (scene_type, is_destroyed);"
                .to_string(),
            // Filter scenes by their authorization kind (e.g., permit-gated vs open).
            "CREATE INDEX IF NOT EXISTS idx_scene_storages_auth_kind ON scene_storages (authorization_kind);"
                .to_string(),
            // Sync watermark.
            "CREATE INDEX IF NOT EXISTS idx_scene_storages_checkpoint ON scene_storages (updated_at_checkpoint);"
                .to_string(),

            // ── scene_storage_fields ───────────────────────────────────────────────
            // Existing: lookup by (dapp_key, scene_type, field_name) – kept.
            "CREATE INDEX IF NOT EXISTS idx_scene_fields_lookup ON scene_storage_fields (dapp_key, scene_type, field_name);"
                .to_string(),
            // Fetch all active fields of a scene (augments PK).
            "CREATE INDEX IF NOT EXISTS idx_scene_fields_active ON scene_storage_fields (scene_id, is_deleted);"
                .to_string(),
            // Find scenes where a field has a specific value (e.g., status = 'waiting').
            "CREATE INDEX IF NOT EXISTS idx_scene_fields_value ON scene_storage_fields (field_name, field_value_raw) WHERE is_deleted = FALSE;"
                .to_string(),
            // Standalone checkpoint index for incremental sync (same rationale as object_storage_fields).
            "CREATE INDEX IF NOT EXISTS idx_scene_fields_checkpoint ON scene_storage_fields (updated_at_checkpoint);"
                .to_string(),

            // ── scene_permits ──────────────────────────────────────────────────────
            // Existing: (dapp_key, permit_type, expired) – kept.
            "CREATE INDEX IF NOT EXISTS idx_scene_permits_lookup ON scene_permits (dapp_key, permit_type, expired);"
                .to_string(),
            // TTL expiry daemon: find active permits that are past their deadline.
            "CREATE INDEX IF NOT EXISTS idx_scene_permits_expires ON scene_permits (expires_at) WHERE expired = FALSE;"
                .to_string(),
            // Invite expiry: find permits whose invite window has closed.
            "CREATE INDEX IF NOT EXISTS idx_scene_permits_invite_expiry ON scene_permits (invites_expire_at) WHERE expired = FALSE;"
                .to_string(),

            // ── scene_permit_participants ──────────────────────────────────────────
            // Existing: find all permits a player is in.
            "CREATE INDEX IF NOT EXISTS idx_scene_participants_addr ON scene_permit_participants (participant, active);"
                .to_string(),
            // Reverse: list all active participants inside a specific permit/room.
            "CREATE INDEX IF NOT EXISTS idx_scene_participants_permit ON scene_permit_participants (permit_id, active);"
                .to_string(),
            // Cross-permit analytics: count active participants by permit type.
            "CREATE INDEX IF NOT EXISTS idx_scene_participants_type ON scene_permit_participants (permit_type, active);"
                .to_string(),
            // Sync watermark.
            "CREATE INDEX IF NOT EXISTS idx_scene_participants_checkpoint ON scene_permit_participants (updated_at_checkpoint);"
                .to_string(),

            // ── marketplace_listings ───────────────────────────────────────────────
            // Existing: seller's listings, buyer history, expiry scan – kept.
            "CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings (dapp_key, seller, status);"
                .to_string(),
            "CREATE INDEX IF NOT EXISTS idx_marketplace_buyer ON marketplace_listings (dapp_key, buyer);"
                .to_string(),
            "CREATE INDEX IF NOT EXISTS idx_marketplace_expiry ON marketplace_listings (listed_until, status);"
                .to_string(),
            // PRIMARY new index: browse market by item type (e.g., "show all listed wheat").
            // Most common market-page query; record_type has high cardinality.
            "CREATE INDEX IF NOT EXISTS idx_marketplace_type ON marketplace_listings (status, record_type);"
                .to_string(),
            // Price sorting within a type (e.g., "cheapest wheat first").
            "CREATE INDEX IF NOT EXISTS idx_marketplace_type_price ON marketplace_listings (status, record_type, price);"
                .to_string(),
            // Global cheapest-first sort across all item types.
            "CREATE INDEX IF NOT EXISTS idx_marketplace_price ON marketplace_listings (status, price);"
                .to_string(),
            // Multi-token markets: filter listings by accepted payment coin.
            "CREATE INDEX IF NOT EXISTS idx_marketplace_coin ON marketplace_listings (status, coin_type);"
                .to_string(),
            // Separate fungible (stackable) from non-fungible (unique) listings.
            "CREATE INDEX IF NOT EXISTS idx_marketplace_fungible ON marketplace_listings (is_fungible, status);"
                .to_string(),
            // "Newest listings" feed sorted by when they were created.
            "CREATE INDEX IF NOT EXISTS idx_marketplace_created ON marketplace_listings (status, created_at_checkpoint DESC);"
                .to_string(),
            // Check if a specific on-chain item is already listed (e.g., before showing 'Sell' button).
            "CREATE INDEX IF NOT EXISTS idx_marketplace_record_key ON marketplace_listings (record_key_raw, status);"
                .to_string(),
            // Seller's listings filtered by item type ("my listed wheat").
            "CREATE INDEX IF NOT EXISTS idx_marketplace_seller_type ON marketplace_listings (seller, record_type, status);"
                .to_string(),

            // ── dapp_marketplace_fees ──────────────────────────────────────────────
            // Aggregate total fees earned per payment token.
            "CREATE INDEX IF NOT EXISTS idx_dapp_fees_coin ON dapp_marketplace_fees (coin_type);"
                .to_string(),
            // Covering index for fee revenue reports: SUM(dapp_amount)/SUM(treasury_amount)
            // grouped by coin_type avoids heap lookups entirely.
            "CREATE INDEX IF NOT EXISTS idx_dapp_fees_revenue ON dapp_marketplace_fees (coin_type, dapp_amount, treasury_amount);"
                .to_string(),
            // Time-range fee reporting (e.g., fees earned in the last 7 days).
            "CREATE INDEX IF NOT EXISTS idx_dapp_fees_checkpoint ON dapp_marketplace_fees (updated_at_checkpoint);"
                .to_string(),
            // JOIN index: PK is (dapp_key, listing_id), so joining solely on listing_id cannot
            // use the PK.  This dedicated index makes listing ↔ fee JOINs index-only.
            "CREATE INDEX IF NOT EXISTS idx_dapp_fees_listing ON dapp_marketplace_fees (listing_id);"
                .to_string(),

            // ── sessions ──────────────────────────────────────────────────────────
            // Existing: look up active session by session_wallet – kept.
            "CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON sessions (session_wallet, active);"
                .to_string(),
            // Direct canonical lookup: PK is (dapp_key, canonical), so a query on
            // canonical alone cannot use the PK without dapp_key in the WHERE clause.
            "CREATE INDEX IF NOT EXISTS idx_sessions_canonical ON sessions (canonical);"
                .to_string(),
            // GC / expiry cleanup: find sessions past their deadline.
            "CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at) WHERE expires_at IS NOT NULL;"
                .to_string(),
            // Health check: active sessions that haven't expired yet.
            "CREATE INDEX IF NOT EXISTS idx_sessions_active_expiry ON sessions (active, expires_at);"
                .to_string(),
            // Sync watermark.
            "CREATE INDEX IF NOT EXISTS idx_sessions_checkpoint ON sessions (updated_at_checkpoint);"
                .to_string(),

            // ── storage_schemas / storage_schema_fields ───────────────────────────
            // These are small, append-only metadata tables; existing indexes are sufficient.
            "CREATE INDEX IF NOT EXISTS idx_storage_schemas_kind ON storage_schemas (kind);"
                .to_string(),
            "CREATE INDEX IF NOT EXISTS idx_storage_schema_fields_lookup ON storage_schema_fields (kind, name);"
                .to_string(),

            // ══════════════════════════════════════════════════════════════════════
            // PostGraphile Smart Comments – declare FK-like relationships without
            // actual FOREIGN KEY constraints (which would break out-of-order indexing).
            // PostGraphile discovers these COMMENT ON statements at startup and
            // auto-generates nested GraphQL resolvers for each declared relationship.
            // ══════════════════════════════════════════════════════════════════════

            // listing (1) ↔ fee (1)
            // Enables: allStoreMarketplaceListings { nodes { dappMarketplaceFeeByListingId { ... } } }
            "COMMENT ON TABLE dapp_marketplace_fees IS E'@foreignKey (listing_id) references marketplace_listings (listing_id)';"
                .to_string(),

            // object_storage (1) ↔ object_storage_fields (N)
            // Enables: allStoreObjectStorages { nodes { objectStorageFieldsByObjectId { nodes { ... } } } }
            "COMMENT ON TABLE object_storage_fields IS E'@foreignKey (object_id) references object_storages (object_id)';"
                .to_string(),

            // scene_storage (1) ↔ scene_storage_fields (N)
            "COMMENT ON TABLE scene_storage_fields IS E'@foreignKey (scene_id) references scene_storages (scene_id)';"
                .to_string(),

            // scene_storage (N) → scene_permit (1)  [scene holds authorized_permit_id]
            // Enables: allStoreSceneStorages { nodes { scenePermitByAuthorizedPermitId { ... } } }
            "COMMENT ON COLUMN scene_storages.authorized_permit_id IS E'@foreignKey (authorized_permit_id) references scene_permits (permit_id)';"
                .to_string(),

            // scene_permit (1) ↔ scene_permit_participants (N)
            // Enables: allStoreScenePermits { nodes { scenePermitParticipantsByPermitId { nodes { ... } } } }
            "COMMENT ON TABLE scene_permit_participants IS E'@foreignKey (permit_id) references scene_permits (permit_id)';"
                .to_string(),

            // user_storage (1) ↔ sessions (N)
            // Enables: allStoreUserStorages { nodes { sessionsByCanonical { nodes { ... } } } }
            "COMMENT ON TABLE sessions IS E'@foreignKey (canonical) references user_storages (canonical_owner)';"
                .to_string(),

            // storage_schema (1) ↔ storage_schema_fields (N)
            "COMMENT ON TABLE storage_schema_fields IS E'@foreignKey (kind, name) references storage_schemas (kind, name)';"
                .to_string(),

            // ══════════════════════════════════════════════════════════════════════
            // Pre-computed JOIN views
            // Registered in database-introspector.ts so PostGraphile exposes them
            // alongside regular store_* tables via the GraphQL API.
            // ══════════════════════════════════════════════════════════════════════

            // View A: marketplace listing enriched with its fee breakdown.
            // Replaces the two-query pattern (listing → fee) with a single GraphQL request.
            // The LEFT JOIN ensures listings without a fee row (e.g., cancelled before settlement)
            // are still returned with NULL fee columns.
            "CREATE OR REPLACE VIEW store_dubhe_listing_with_fees AS
                SELECT
                    ml.listing_id,
                    ml.seller,
                    ml.buyer,
                    ml.record_type,
                    ml.record_type_raw,
                    ml.record_key_raw,
                    ml.field_names_raw,
                    ml.record_data_raw,
                    ml.price,
                    ml.coin_type,
                    ml.is_fungible,
                    ml.listed_until,
                    ml.status,
                    ml.created_at_checkpoint,
                    ml.updated_at_checkpoint,
                    dmf.total_fee,
                    dmf.treasury_amount,
                    dmf.dapp_amount
                FROM marketplace_listings ml
                LEFT JOIN dapp_marketplace_fees dmf
                    ON ml.listing_id = dmf.listing_id;"
                .to_string(),

            // View B: object storage with all active field values aggregated into a JSONB map.
            // Avoids the N+1 problem when loading objects: one query returns both object metadata
            // and all field values.  fields_json has the form {"field_name": "value", ...}.
            // Only non-deleted fields are included; destroyed objects are still returned so that
            // clients can detect removals.
            "CREATE OR REPLACE VIEW store_dubhe_object_with_fields AS
                SELECT
                    os.object_id,
                    os.object_type,
                    os.object_type_raw,
                    os.entity_id_raw,
                    os.is_destroyed,
                    os.created_at_checkpoint,
                    os.destroyed_at_checkpoint,
                    os.updated_at_checkpoint,
                    COALESCE(
                        jsonb_object_agg(osf.field_name, osf.field_value_raw)
                            FILTER (WHERE osf.field_name IS NOT NULL AND osf.is_deleted = FALSE),
                        '{}'::jsonb
                    ) AS fields_json
                FROM object_storages os
                LEFT JOIN object_storage_fields osf ON os.object_id = osf.object_id
                GROUP BY
                    os.object_id,
                    os.object_type,
                    os.object_type_raw,
                    os.entity_id_raw,
                    os.is_destroyed,
                    os.created_at_checkpoint,
                    os.destroyed_at_checkpoint,
                    os.updated_at_checkpoint;"
                .to_string(),

            // View C: user storage joined with the user's current active session.
            // Provides a single GraphQL type that carries both the storage ID and the live
            // session wallet/expiry, useful for the "who is online" player listing.
            "CREATE OR REPLACE VIEW store_dubhe_user_with_session AS
                SELECT
                    us.user_storage_id,
                    us.canonical_owner,
                    us.session_key,
                    us.session_expires_at,
                    us.created_at_checkpoint,
                    us.updated_at_checkpoint,
                    s.session_wallet   AS active_session_wallet,
                    s.expires_at       AS active_session_expires_at,
                    s.active           AS session_active
                FROM user_storages us
                LEFT JOIN sessions s
                    ON us.canonical_owner = s.canonical AND s.active = TRUE;"
                .to_string(),

            // View D: scene storage enriched with its controlling permit's metadata.
            // Allows a single query to determine whether a scene is permit-gated and
            // how many participants have already joined vs the capacity limit.
            "CREATE OR REPLACE VIEW store_dubhe_scene_with_permit AS
                SELECT
                    ss.scene_id,
                    ss.scene_type,
                    ss.scene_type_raw,
                    ss.authorization_kind,
                    ss.authorized_permit_id,
                    ss.is_destroyed,
                    ss.created_at_checkpoint,
                    ss.updated_at_checkpoint,
                    sp.permit_type,
                    sp.expires_at          AS permit_expires_at,
                    sp.invites_expire_at   AS permit_invites_expire_at,
                    sp.max_participants,
                    sp.participant_count,
                    sp.expired             AS permit_expired
                FROM scene_storages ss
                LEFT JOIN scene_permits sp
                    ON ss.authorized_permit_id = sp.permit_id;"
                .to_string(),
        ]
    }

    pub fn can_convert_event_to_sql(&self, event: &Event) -> Result<()> {
        if event.original_package_id() != Some(self.original_package_id.clone()) {
            return Err(anyhow::anyhow!(
                "Event origin package id does not match the package id"
            ));
        }
        if !self
            .fields
            .iter()
            .any(|field| field.table == event.table_id())
        {
            return Err(anyhow::anyhow!(
                "Event table id does not match the table id: {}",
                event.table_id()
            ));
        }
        if let Event::StoreSetRecord(event) = event {
            let required_key_tuple_len = self
                .fields
                .iter()
                .filter(|field| {
                    field.table == event.table_id
                        && field.primary_key
                        && field.name != "unique_resource_id"
                })
                .map(|field| field.index as usize + 1)
                .max()
                .unwrap_or(0);
            let required_value_tuple_len = self
                .fields
                .iter()
                .filter(|field| field.table == event.table_id && !field.primary_key)
                .map(|field| field.index as usize + 1)
                .max()
                .unwrap_or(0);
            if event.key_tuple.len() < required_key_tuple_len
                || event.value_tuple.len() < required_value_tuple_len
            {
                return Err(anyhow::anyhow!(
                    "SetRecord tuple length mismatch for table {}: keys expected at least {}, got {}; values expected at least {}, got {}",
                    event.table_id,
                    required_key_tuple_len,
                    event.key_tuple.len(),
                    required_value_tuple_len,
                    event.value_tuple.len()
                ));
            }
        }
        Ok(())
    }

    pub fn convert_event_to_sql(
        &self,
        event: Event,
        current_checkpoint_timestamp_ms: u64,
        current_digest: String,
    ) -> Result<String> {
        self.can_convert_event_to_sql(&event)?;
        match event {
            Event::StoreSetRecord(event) => {
                let mut sql = String::new();
                if self.is_exist_primary_key(&event.table_id) {
                    // insert or update the record
                    // INSERT INTO config (id, database_url, port, log_level, created_at_timestamp_ms, updated_at_timestamp_ms)
                    //    VALUES (1, 'postgres://localhost:5432', 3000, 'debug', 0, 0)
                    //    ON CONFLICT (id)
                    //    DO UPDATE SET
                    //        database_url = EXCLUDED.database_url,
                    //        port = EXCLUDED.port,
                    //        log_level = EXCLUDED.log_level,
                    //        created_at_timestamp_ms = EXCLUDED.created_at_timestamp_ms,
                    //        updated_at_timestamp_ms = EXCLUDED.updated_at_timestamp_ms
                    sql.push_str(&format!("INSERT INTO store_{} (", event.table_id));
                    sql = format!(
                        "{} {}, created_at_timestamp_ms, updated_at_timestamp_ms, last_update_digest",
                        sql,
                        self.field_names_by_table(&event.table_id).join(",")
                    );
                    sql.push_str(") VALUES (");
                    sql.push_str(
                        &self
                            .field_values_by_table(
                                &event.table_id,
                                &event.key_tuple,
                                &event.value_tuple,
                            )
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str(current_checkpoint_timestamp_ms.to_string().as_str());
                    sql.push_str(",");
                    sql.push_str(current_checkpoint_timestamp_ms.to_string().as_str());
                    sql.push_str(",");
                    sql.push_str(format!("'{}'", current_digest).as_str());
                    sql.push_str(") ON CONFLICT (");

                    // Add primary key field names for conflict detection
                    sql.push_str(
                        &self
                            .field_names_by_table_and_primary_key(&event.table_id)
                            .join(","),
                    );
                    sql.push_str(") DO UPDATE SET ");

                    // Add update fields
                    sql.push_str(
                        &self
                            .field_values_with_set_by_table(
                                &event.table_id,
                                &event.key_tuple,
                                &event.value_tuple,
                            )
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str(
                        format!(
                            "updated_at_timestamp_ms = {}",
                            current_checkpoint_timestamp_ms
                        )
                        .as_str(),
                    );
                    sql.push_str(",");
                    sql.push_str(format!("last_update_digest = '{}'", current_digest).as_str());
                    sql.push_str(";");
                } else if !self
                    .tables
                    .iter()
                    .any(|table| table.name == event.table_id && table.offchain)
                {
                    sql.push_str(&format!("INSERT INTO store_{} (", event.table_id));
                    sql.push_str("unique_resource_id,");
                    sql.push_str(&self.field_names_by_table(&event.table_id).join(","));
                    sql.push_str(",");
                    sql.push_str(
                        "created_at_timestamp_ms, updated_at_timestamp_ms, last_update_digest",
                    );
                    sql.push_str(") VALUES (1,");
                    sql.push_str(
                        &self
                            .field_values_by_table(
                                &event.table_id,
                                &event.key_tuple,
                                &event.value_tuple,
                            )
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str(current_checkpoint_timestamp_ms.to_string().as_str());
                    sql.push_str(",");
                    sql.push_str(current_checkpoint_timestamp_ms.to_string().as_str());
                    sql.push_str(",");
                    sql.push_str(format!("'{}'", current_digest).as_str());
                    sql.push_str(") ON CONFLICT (unique_resource_id) DO UPDATE SET ");
                    sql.push_str(
                        &self
                            .field_values_by_table_and_non_primary_key(
                                &event.table_id,
                                &event.value_tuple,
                            )
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str(
                        format!(
                            "updated_at_timestamp_ms = {}",
                            current_checkpoint_timestamp_ms
                        )
                        .as_str(),
                    );
                    sql.push_str(",");
                    sql.push_str(format!("last_update_digest = '{}'", current_digest).as_str());
                    sql.push_str(";");
                } else {
                    sql.push_str(&format!("INSERT INTO store_{} (", event.table_id));
                    sql.push_str(&self.field_names_by_table(&event.table_id).join(","));
                    sql.push_str(",");
                    sql.push_str(
                        "created_at_timestamp_ms, updated_at_timestamp_ms, last_update_digest",
                    );
                    sql.push_str(") VALUES (");
                    sql.push_str(
                        &self
                            .field_values_by_table(
                                &event.table_id,
                                &event.key_tuple,
                                &event.value_tuple,
                            )
                            .join(","),
                    );
                    sql.push_str(",");
                    sql.push_str(current_checkpoint_timestamp_ms.to_string().as_str());
                    sql.push_str(",");
                    sql.push_str(current_checkpoint_timestamp_ms.to_string().as_str());
                    sql.push_str(",");
                    sql.push_str(format!("'{}'", current_digest).as_str());
                    sql.push_str(");");
                };
                Ok(sql)
            }
            Event::StoreSetField(event) => {
                let mut sql = String::new();
                if self.is_exist_primary_key(&event.table_id) {
                    sql.push_str(&format!("UPDATE store_{} SET ", event.table_id));
                    sql.push_str(&self.field_value_by_table_and_name(
                        &event.table_id,
                        &event.field_name,
                        &event.value,
                    ));
                    sql.push_str(",");
                    sql.push_str(
                        format!(
                            "updated_at_timestamp_ms = {}",
                            current_checkpoint_timestamp_ms
                        )
                        .as_str(),
                    );
                    sql.push_str(" WHERE ");
                    sql.push_str(
                        &self
                            .field_values_by_table_and_primary_key(
                                &event.table_id,
                                &event.key_tuple,
                            )
                            .join(" AND "),
                    );
                    sql.push_str(";");
                } else {
                    sql.push_str(&format!("UPDATE store_{} SET ", event.table_id));
                    sql.push_str(&self.field_value_by_table_and_name(
                        &event.table_id,
                        &event.field_name,
                        &event.value,
                    ));
                    sql.push_str(",");
                    sql.push_str(
                        format!(
                            "updated_at_timestamp_ms = {}",
                            current_checkpoint_timestamp_ms
                        )
                        .as_str(),
                    );
                    sql.push_str(" WHERE unique_resource_id = 1;");
                }
                Ok(sql)
            }
            Event::StoreDeleteRecord(event) => {
                let mut sql = String::new();
                if self.is_exist_primary_key(&event.table_id) {
                    sql.push_str(&format!("UPDATE store_{} SET is_deleted = TRUE, updated_at_timestamp_ms = {}, last_update_digest = '{}' WHERE ", event.table_id, current_checkpoint_timestamp_ms, current_digest));
                    sql.push_str(
                        &self
                            .field_values_by_table_and_primary_key(
                                &event.table_id,
                                &event.key_tuple,
                            )
                            .join(" AND "),
                    );
                    sql.push_str(";");
                } else {
                    sql.push_str(&format!("UPDATE store_{} SET is_deleted = TRUE, updated_at_timestamp_ms = {}, last_update_digest = '{}' WHERE unique_resource_id = 1;", event.table_id, current_checkpoint_timestamp_ms, current_digest));
                }
                Ok(sql)
            }
            Event::StoreDeleteField(event) => {
                let mut sql = String::new();
                if self.is_exist_primary_key(&event.table_id) {
                    sql.push_str(&format!(
                        "UPDATE store_{} SET \"{}\" = NULL, updated_at_timestamp_ms = {}, last_update_digest = '{}' WHERE ",
                        event.table_id,
                        event.field_name.replace('"', "\"\""),
                        current_checkpoint_timestamp_ms,
                        current_digest,
                    ));
                    sql.push_str(
                        &self
                            .field_values_by_table_and_primary_key(
                                &event.table_id,
                                &event.key_tuple,
                            )
                            .join(" AND "),
                    );
                    sql.push_str(";");
                } else {
                    sql.push_str(&format!(
                        "UPDATE store_{} SET \"{}\" = NULL, updated_at_timestamp_ms = {}, last_update_digest = '{}' WHERE unique_resource_id = 1;",
                        event.table_id,
                        event.field_name.replace('"', "\"\""),
                        current_checkpoint_timestamp_ms,
                        current_digest,
                    ));
                }
                Ok(sql)
            }
            _ => Err(anyhow::anyhow!(
                "non-store event must be converted with convert_indexer_event_to_sql"
            )),
        }
    }

    pub fn convert_event_to_proto_struct(&self, event: &Event) -> Result<Struct> {
        self.can_convert_event_to_sql(event)?;
        match event {
            Event::StoreSetRecord(event) => {
                let fields = self.field_proto_values_by_table(
                    &event.table_id,
                    &event.key_tuple,
                    &event.value_tuple,
                );
                Ok(Struct { fields })
            }
            Event::StoreSetField(event) => {
                let fields = self.field_proto_value_by_table_and_name(
                    &event.table_id,
                    &event.field_name,
                    &event.value,
                );
                Ok(Struct { fields })
            }
            Event::StoreDeleteField(_) => Ok(Struct {
                fields: BTreeMap::new(),
            }),
            _ => Ok(Struct {
                fields: BTreeMap::new(),
            }),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TableJsonInfo {
    pub fields: Vec<HashMap<String, String>>,
    pub keys: Vec<String>,
    pub offchain: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ObjectJsonInfo {
    #[serde(default)]
    pub fields: Vec<HashMap<String, String>>,
    #[serde(default)]
    pub accepts: Vec<String>,
    #[serde(rename = "acceptsFrom", default)]
    pub accepts_from: Vec<String>,
    #[serde(rename = "adminOnly", default)]
    pub admin_only: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct SceneJsonInfo {
    #[serde(default)]
    pub fields: Vec<HashMap<String, String>>,
    #[serde(default)]
    pub authorization: Value,
    #[serde(default)]
    pub accepts: Vec<String>,
    #[serde(rename = "acceptsFrom", default)]
    pub accepts_from: Vec<String>,
}

pub type PermitJsonInfo = Value;

#[derive(Debug, Clone, Deserialize)]
pub struct DubheConfigJson {
    #[serde(default)]
    pub resources: Vec<HashMap<String, TableJsonInfo>>,
    #[serde(default)]
    pub objects: Vec<HashMap<String, ObjectJsonInfo>>,
    #[serde(default)]
    pub scenes: Vec<HashMap<String, SceneJsonInfo>>,
    #[serde(default)]
    pub permits: Vec<HashMap<String, PermitJsonInfo>>,
    #[serde(default)]
    pub enums: Vec<HashMap<String, Vec<String>>>,
    pub original_package_id: Option<String>,
    pub package_id: Option<String>,
    pub start_checkpoint: Option<String>,
    pub dapp_key: Option<String>,
}

impl StorageSchema {
    fn from_config_json(config: &DubheConfigJson) -> Result<Vec<Self>> {
        let mut schemas = Vec::new();

        for tables in &config.resources {
            for (name, table_info) in tables {
                let mut schema = BTreeMap::new();
                schema.insert(
                    "fields",
                    serde_json::to_value(ordered_fields(&table_info.fields))?,
                );
                schema.insert("keys", serde_json::to_value(&table_info.keys)?);
                schema.insert("offchain", serde_json::to_value(table_info.offchain)?);
                schemas.push(Self {
                    kind: "resource".to_string(),
                    name: name.clone(),
                    schema_json: serde_json::to_string(&schema)?,
                    fields: storage_schema_fields(
                        "resource",
                        name,
                        &table_info.fields,
                        Some(&table_info.keys),
                    ),
                });
            }
        }

        for objects in &config.objects {
            for (name, object_info) in objects {
                let mut schema = BTreeMap::new();
                schema.insert(
                    "fields",
                    serde_json::to_value(ordered_fields(&object_info.fields))?,
                );
                schema.insert("accepts", serde_json::to_value(&object_info.accepts)?);
                schema.insert(
                    "acceptsFrom",
                    serde_json::to_value(&object_info.accepts_from)?,
                );
                schema.insert("adminOnly", serde_json::to_value(object_info.admin_only)?);
                schemas.push(Self {
                    kind: "object".to_string(),
                    name: name.clone(),
                    schema_json: serde_json::to_string(&schema)?,
                    fields: storage_schema_fields("object", name, &object_info.fields, None),
                });
            }
        }

        for scenes in &config.scenes {
            for (name, scene_info) in scenes {
                let mut schema = BTreeMap::new();
                schema.insert(
                    "fields",
                    serde_json::to_value(ordered_fields(&scene_info.fields))?,
                );
                schema.insert("authorization", scene_info.authorization.clone());
                schema.insert("accepts", serde_json::to_value(&scene_info.accepts)?);
                schema.insert(
                    "acceptsFrom",
                    serde_json::to_value(&scene_info.accepts_from)?,
                );
                schemas.push(Self {
                    kind: "scene".to_string(),
                    name: name.clone(),
                    schema_json: serde_json::to_string(&schema)?,
                    fields: storage_schema_fields("scene", name, &scene_info.fields, None),
                });
            }
        }

        for permits in &config.permits {
            for (name, permit_info) in permits {
                schemas.push(Self {
                    kind: "permit".to_string(),
                    name: name.clone(),
                    schema_json: serde_json::to_string(permit_info)?,
                    fields: Vec::new(),
                });
            }
        }

        for enum_map in &config.enums {
            for (name, values) in enum_map {
                schemas.push(Self {
                    kind: "enum".to_string(),
                    name: name.clone(),
                    schema_json: serde_json::to_string(values)?,
                    fields: Vec::new(),
                });
            }
        }

        Ok(schemas)
    }
}

fn ordered_fields(fields: &[HashMap<String, String>]) -> Vec<BTreeMap<String, String>> {
    fields
        .iter()
        .map(|field| {
            field
                .iter()
                .map(|(name, field_type)| (name.clone(), field_type.clone()))
                .collect()
        })
        .collect()
}

fn storage_schema_fields(
    kind: &str,
    schema_name: &str,
    fields: &[HashMap<String, String>],
    keys: Option<&Vec<String>>,
) -> Vec<StorageSchemaField> {
    fields
        .iter()
        .enumerate()
        .flat_map(|(index, field)| {
            field
                .iter()
                .map(move |(field_name, field_type)| StorageSchemaField {
                    kind: kind.to_string(),
                    name: schema_name.to_string(),
                    field_name: field_name.clone(),
                    field_type: field_type.clone(),
                    field_index: index as u8,
                    is_key: keys
                        .map(|keys| keys.iter().any(|key| key == field_name))
                        .unwrap_or(false),
                })
        })
        .collect()
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
                            let enum_ = dubhe_config_json
                                .enums
                                .iter()
                                .find(|map| map.contains_key(&field_type));
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

        if dubhe_config_json.original_package_id.is_none() && dubhe_config_json.package_id.is_none()
        {
            return Err(anyhow::anyhow!("No package id found in config file"));
        }

        if dubhe_config_json.start_checkpoint.is_none() {
            return Err(anyhow::anyhow!("No start checkpoint found in config file"));
        }

        let package_id = dubhe_config_json
            .original_package_id
            .or(dubhe_config_json.package_id)
            .unwrap();
        let start_checkpoint = dubhe_config_json
            .start_checkpoint
            .unwrap()
            .parse::<u64>()
            .unwrap_or(0);

        Ok((package_id, start_checkpoint, final_tables))
    }

    pub fn is_enum(field_type: &str) -> bool {
        match field_type {
            "u8"
            | "u16"
            | "u32"
            | "u64"
            | "u128"
            | "u256"
            | "bool"
            | "address"
            | "String"
            | "vector<u8>"
            | "vector<u16>"
            | "vector<u32>"
            | "vector<u64>"
            | "vector<u128>"
            | "vector<u256>"
            | "vector<address>"
            | "vector<String>"
            | "vector<bool>"
            | "vector<vector<u8>>"
            | "vector<vector<u16>>"
            | "vector<vector<u32>>"
            | "vector<vector<u64>>"
            | "vector<vector<u128>>"
            | "vector<vector<u256>>"
            | "vector<vector<address>>"
            | "vector<vector<bool>>" => false,
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
            println!(
                "DEBUG: field[{}] = {{ name: '{}', is_key: {} }}",
                i, field.field_name, field.is_key
            );
        }
        println!(
            "DEBUG: has_key_fields = {}",
            self.fields.iter().any(|field| field.is_key)
        );

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
                self.name.clone(),
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
            let parsed_value = field
                .field_type
                .into_parsed_move_value(&values[value_index])?;
            result.push(DBData::new(
                self.name.clone(),
                field.field_name.clone(),
                field.field_type.clone(),
                parsed_value,
                false,
            ));
        }
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

pub fn into_sql_string(type_: &str, value: &[u8]) -> Result<String> {
    match type_ {
        "u8" => {
            let v: u8 = bcs::from_bytes(value).unwrap();
            Ok(v.to_string())
        }
        "u16" => {
            let v: u16 = bcs::from_bytes(value).unwrap();
            Ok(v.to_string())
        }
        "u32" => {
            let v: u32 = bcs::from_bytes(value).unwrap();
            Ok(v.to_string())
        }
        "u64" => {
            let v: u64 = bcs::from_bytes(value).unwrap();
            Ok(v.to_string())
        }
        "u128" => {
            let v: u128 = bcs::from_bytes(value).unwrap();
            Ok(format!("'{}'", v.to_string()))
        }
        "u256" => {
            let v: U256 = bcs::from_bytes(value).unwrap();
            Ok(format!("'{}'", v.to_string()))
        }
        "String" => {
            let v: String = bcs::from_bytes(value).unwrap();
            Ok(format!("'{}'", v))
        }
        "bool" => {
            let v: bool = bcs::from_bytes(value).unwrap();
            Ok(v.to_string())
        }
        "address" => {
            let v: SuiAddress = bcs::from_bytes(value).unwrap();
            Ok(format!("'{}'", v.to_string()))
        }
        "vector<u8>" => {
            let v: Vec<u8> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            Ok(format!("ARRAY[{}]", values.join(", ")))
        }
        "vector<u16>" => {
            let v: Vec<u16> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            Ok(format!("ARRAY[{}]", values.join(", ")))
        }
        "vector<u32>" => {
            let v: Vec<u32> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            Ok(format!("ARRAY[{}]", values.join(", ")))
        }
        "vector<u64>" => {
            let v: Vec<u64> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            Ok(format!("ARRAY[{}]", values.join(", ")))
        }
        "vector<u128>" => {
            let v: Vec<u128> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| format!("'{}'", v.to_string())).collect();
            if values.is_empty() {
                Ok("ARRAY[]::TEXT[]".to_string())
            } else {
                Ok(format!("ARRAY[{}]::TEXT[]", values.join(", ")))
            }
        }
        "vector<u256>" => {
            let v: Vec<U256> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| format!("'{}'", v.to_string())).collect();
            if values.is_empty() {
                Ok("ARRAY[]::TEXT[]".to_string())
            } else {
                Ok(format!("ARRAY[{}]::TEXT[]", values.join(", ")))
            }
        }
        "vector<address>" => {
            let v: Vec<SuiAddress> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| format!("'{}'", v.to_string())).collect();
            if values.is_empty() {
                Ok("ARRAY[]::TEXT[]".to_string())
            } else {
                Ok(format!("ARRAY[{}]::TEXT[]", values.join(", ")))
            }
        }
        "vector<bool>" => {
            let v: Vec<bool> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            Ok(format!("ARRAY[{}]", values.join(", ")))
        }
        "vector<String>" => {
            let v: Vec<String> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| format!("'{}'", v)).collect();
            if values.is_empty() {
                Ok("ARRAY[]::TEXT[]".to_string())
            } else {
                Ok(format!("ARRAY[{}]::TEXT[]", values.join(", ")))
            }
        }
        "vector<vector<u8>>" => {
            let v: Vec<Vec<u8>> = bcs::from_bytes(value).unwrap();
            let values: Vec<String> = v.iter().map(|v| format!("ARRAY{:?}", v)).collect();
            Ok(format!("ARRAY[{}]", values.join(", ")))
        }
        _ => Err(anyhow::anyhow!("Invalid move type: {}", type_)),
    }
}

pub fn format_sql_value(value: &Value, field_type: &str) -> String {
    match field_type {
        "bool" => value.as_bool().unwrap().to_string(),
        "u8" | "u16" | "u32" | "u64" | "u128" => value.to_string(),
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
        }
        "vector<u128>" | "vector<u256>" => {
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
        }
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

pub fn get_sql_type(type_: &str) -> String {
    match type_ {
        "u8" => "INTEGER",
        "u16" => "INTEGER",
        "u32" => "INTEGER",
        "u64" => "BIGINT",
        "u128" => "TEXT",
        "u256" => "TEXT",
        "address" => "TEXT",
        "String" => "TEXT",
        "bool" => "BOOLEAN",
        "vector<u8>" => "INTEGER[]",
        "vector<u16>" => "INTEGER[]",
        "vector<u32>" => "INTEGER[]",
        "vector<u64>" => "BIGINT[]",
        "vector<u128>" => "TEXT[]",
        "vector<u256>" => "TEXT[]",
        "vector<address>" => "TEXT[]",
        "vector<bool>" => "BOOLEAN[]",
        "vector<String>" => "TEXT[]",
        _ => "TEXT",
    }
    .to_string()
}

pub fn is_sql_keyword(name: &str) -> bool {
    let sql_keywords = [
        "from",
        "to",
        "select",
        "insert",
        "update",
        "delete",
        "where",
        "order",
        "group",
        "having",
        "join",
        "union",
        "create",
        "drop",
        "alter",
        "table",
        "index",
        "constraint",
        "primary",
        "foreign",
        "key",
        "references",
        "check",
        "unique",
        "not",
        "null",
        "default",
        "user",
        "role",
        "grant",
        "revoke",
        "view",
        "trigger",
        "function",
        "procedure",
        "begin",
        "end",
        "if",
        "else",
        "while",
        "for",
        "case",
        "when",
        "then",
        "return",
        "declare",
        "cursor",
        "fetch",
        "close",
    ];
    sql_keywords.contains(&name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Event, StoreSetRecord};
    use serde_json::json;
    use std::str::FromStr;

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
            },
            {
                "counter3": {
                    "fields": [
                    { "entity_id": "address" },
                    { "hp": "u64" },
                    { "attack": "u64" },
                    { "defense": "u64" }
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
              "counter4": {
                "fields": [
                  { "value": "u32" }
                ],
                "keys": [],
                "offchain": false
              }
            },
            {
                "counter5": {
                  "fields": [
                    { "player": "address" },
                    { "value": "u32" }
                  ],
                  "keys": [],
                  "offchain": false
                }
            },
            {
                "counter6": {
                  "fields": [
                    { "player": "address" },
                    { "monster": "address" },
                    { "value": "u32" }
                  ],
                  "keys": ["player", "monster"],
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
          "package_id": "0x1",
          "start_checkpoint": "1"
        })
    }

    fn get_full_test_json() -> Value {
        json!({
          "components": [
            {
                "component0": {
                  "fields": [
                    {
                      "entity_id": "address"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component1": {
                  "fields": [
                    {
                      "player": "address"
                    }
                  ],
                  "keys": [
                    "player"
                  ],
                  "offchain": false
                }
              },
              {
                "component2": {
                  "fields": [
                    {
                      "player_id": "u32"
                    }
                  ],
                  "keys": [
                    "player_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component3": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u32"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component4": {
                  "fields": [
                    {
                      "player": "address"
                    },
                    {
                      "value": "u32"
                    }
                  ],
                  "keys": [
                    "player"
                  ],
                  "offchain": false
                }
              },
              {
                "component5": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u32"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component6": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "attack": "u32"
                    },
                    {
                      "hp": "u32"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component7": {
                  "fields": [
                    {
                      "monster": "address"
                    },
                    {
                      "attack": "u32"
                    },
                    {
                      "hp": "u32"
                    }
                  ],
                  "keys": [
                    "monster"
                  ],
                  "offchain": false
                }
              },
              {
                "component8": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "Direction"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component9": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "direction": "Direction"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component10": {
                  "fields": [
                    {
                      "player": "address"
                    },
                    {
                      "direction": "Direction"
                    }
                  ],
                  "keys": [
                    "player"
                  ],
                  "offchain": false
                }
              },
              {
                "component11": {
                  "fields": [
                    {
                      "player": "address"
                    },
                    {
                      "value": "u32"
                    },
                    {
                      "direction": "Direction"
                    }
                  ],
                  "keys": [
                    "player"
                  ],
                  "offchain": false
                }
              },
              {
                "component12": {
                  "fields": [
                    {
                      "direction": "Direction"
                    },
                    {
                      "player": "address"
                    },
                    {
                      "value": "u32"
                    }
                  ],
                  "keys": [
                    "direction"
                  ],
                  "offchain": false
                }
              },
              {
                "component13": {
                  "fields": [
                    {
                      "player": "address"
                    },
                    {
                      "value": "u32"
                    }
                  ],
                  "keys": [
                    "player"
                  ],
                  "offchain": true
                }
              },
              {
                "component14": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "result": "Direction"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": true
                }
              },
              {
                "component15": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u8"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component16": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u16"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component17": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u32"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component18": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u64"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component19": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u128"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component20": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "u256"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component21": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "address"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component22": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "bool"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component23": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<u8>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component24": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<u16>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component25": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<u32>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component26": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<u64>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component27": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<u128>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component28": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<u256>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component29": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<address>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component30": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<bool>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component31": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<vector<u8>>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component32": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "String"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component33": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "value": "vector<String>"
                    }
                  ],
                  "keys": [
                    "entity_id"
                  ],
                  "offchain": false
                }
              },
              {
                "component34": {
                  "fields": [
                    {
                      "entity_id": "address"
                    },
                    {
                      "name": "vector<String>"
                    },
                    {
                      "age": "u8"
                    }
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
              "counter4": {
                "fields": [
                  { "value": "u32" }
                ],
                "keys": [],
                "offchain": false
              }
            },
            {
                "counter5": {
                  "fields": [
                    { "player": "address" },
                    { "value": "u32" }
                  ],
                  "keys": [],
                  "offchain": false
                }
            },
            {
                "counter6": {
                  "fields": [
                    { "player": "address" },
                    { "monster": "address" },
                    { "value": "u32" }
                  ],
                  "keys": ["player", "monster"],
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
          "package_id": "0x1",
          "start_checkpoint": "1"
        })
    }

    #[test]
    fn test_dubhe_config_enums_from_json() {
        let test_json = get_test_json();
        let result = DubheConfig::from_json(test_json).unwrap();
        assert_eq!(result.enums.len(), 5);
        assert_eq!(result.enums[0].name, "Direction");
        assert_eq!(result.enums[0].index, 0);
        assert_eq!(result.enums[0].value, "Left");
        assert_eq!(result.enums[1].name, "Direction");
        assert_eq!(result.enums[1].index, 1);
        assert_eq!(result.enums[1].value, "Right");

        assert_eq!(result.enums[2].name, "Status");
        assert_eq!(result.enums[2].index, 0);
        assert_eq!(result.enums[2].value, "Caught");
        assert_eq!(result.enums[3].name, "Status");
        assert_eq!(result.enums[3].index, 1);
        assert_eq!(result.enums[3].value, "Fled");
        assert_eq!(result.enums[4].name, "Status");
        assert_eq!(result.enums[4].index, 2);
        assert_eq!(result.enums[4].value, "Missed");
    }

    #[test]
    fn test_dubhe_config_fields_from_json() {
        let test_json = get_test_json();
        let result = DubheConfig::from_json(test_json).unwrap();
        assert_eq!(result.fields.len(), 15);
        assert_eq!(result.fields[0].name, "entity_id");
        assert_eq!(result.fields[1].name, "entity_id");
        assert_eq!(result.fields[2].name, "value");
        assert_eq!(result.fields[3].name, "entity_id");
        assert_eq!(result.fields[4].name, "value");

        assert_eq!(result.fields[5].table, "counter3");
        assert_eq!(result.fields[5].name, "entity_id");
        assert_eq!(result.fields[5].index, 0);
        assert_eq!(result.fields[5].primary_key, true);
        assert_eq!(result.fields[5].move_type, "address");
        assert_eq!(result.fields[5].db_type, "TEXT");

        assert_eq!(result.fields[6].name, "hp");
        assert_eq!(result.fields[6].index, 0);
        assert_eq!(result.fields[6].primary_key, false);
        assert_eq!(result.fields[6].move_type, "u64");
        assert_eq!(result.fields[6].db_type, "INTEGER");

        assert_eq!(result.fields[7].name, "attack");
        assert_eq!(result.fields[7].index, 1);
        assert_eq!(result.fields[7].primary_key, false);
        assert_eq!(result.fields[7].move_type, "u64");
        assert_eq!(result.fields[7].db_type, "INTEGER");

        assert_eq!(result.fields[8].name, "defense");
        assert_eq!(result.fields[8].index, 2);
        assert_eq!(result.fields[8].primary_key, false);
        assert_eq!(result.fields[8].move_type, "u64");
        assert_eq!(result.fields[8].db_type, "INTEGER");

        assert_eq!(result.fields[9].name, "value");
        assert_eq!(result.fields[9].index, 0);
        assert_eq!(result.fields[9].primary_key, false);

        assert_eq!(result.fields[10].name, "player");
        assert_eq!(result.fields[10].index, 0);
        assert_eq!(result.fields[10].primary_key, false);
        assert_eq!(result.fields[11].name, "value");
        assert_eq!(result.fields[11].index, 1);
        assert_eq!(result.fields[11].primary_key, false);

        assert_eq!(result.fields[12].name, "player");
        assert_eq!(result.fields[12].index, 0);
        assert_eq!(result.fields[12].primary_key, true);
        assert_eq!(result.fields[13].name, "monster");
        assert_eq!(result.fields[13].index, 1);
        assert_eq!(result.fields[13].primary_key, true);
        assert_eq!(result.fields[14].name, "value");
        assert_eq!(result.fields[14].index, 0);
        assert_eq!(result.fields[14].primary_key, false);

        println!("fields: {:?}", result.fields);
    }

    #[test]
    fn test_dubhe_config_storage_schemas_from_json() {
        let test_json = json!({
          "resources": [
            {
              "counter": {
                "fields": [
                  { "entity_id": "String" },
                  { "value": "u64" }
                ],
                "keys": ["entity_id"],
                "offchain": false
              }
            }
          ],
          "objects": [
            {
              "boss": {
                "fields": [
                  { "hp": "u64" }
                ],
                "accepts": ["balance"],
                "acceptsFrom": [],
                "adminOnly": false
              }
            }
          ],
          "scenes": [
            {
              "arena": {
                "fields": [
                  { "round": "u64" }
                ],
                "authorization": { "kind": "permit", "permit": "battlePermit" },
                "accepts": [],
                "acceptsFrom": ["boss"]
              }
            }
          ],
          "permits": [
            {
              "battlePermit": {}
            }
          ],
          "enums": [
            {
              "Status": ["Open", "Closed"]
            }
          ],
          "original_package_id": "0x1",
          "start_checkpoint": "1"
        });

        let result = DubheConfig::from_json(test_json).unwrap();

        assert!(result
            .storage_schemas
            .iter()
            .any(|schema| schema.kind == "resource" && schema.name == "counter"));
        assert!(result
            .storage_schemas
            .iter()
            .any(|schema| schema.kind == "object" && schema.name == "boss"));
        assert!(result
            .storage_schemas
            .iter()
            .any(|schema| schema.kind == "scene" && schema.name == "arena"));
        assert!(result
            .storage_schemas
            .iter()
            .any(|schema| schema.kind == "permit" && schema.name == "battlePermit"));
        assert!(result
            .storage_schemas
            .iter()
            .any(|schema| schema.kind == "enum" && schema.name == "Status"));
        assert!(!result.dapp_schema_hash().is_empty());
    }

    #[test]
    fn test_can_convert_event_to_sql() {
        let test_json = get_test_json();
        let result = DubheConfig::from_json(test_json).unwrap();
        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "counter5".to_string(),
            key_tuple: Vec::new(),
            value_tuple: vec![
                bcs::to_bytes(
                    &SuiAddress::from_str(
                        "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975",
                    )
                    .unwrap(),
                )
                .unwrap(),
                bcs::to_bytes(&10u32).unwrap(),
            ],
        });
        let conversion = result.can_convert_event_to_sql(&event);
        assert!(conversion.is_ok(), "{conversion:?}");

        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "counter6".to_string(),
            key_tuple: vec![bcs::to_bytes(
                &SuiAddress::from_str(
                    "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975",
                )
                .unwrap(),
            )
            .unwrap()],
            value_tuple: Vec::new(),
        });
        assert!(result.can_convert_event_to_sql(&event).is_err());
    }

    #[test]
    fn test_convert_event_to_sql() {
        let test_json = get_test_json();
        let config = DubheConfig::from_json(test_json).unwrap();
        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "counter3".to_string(),
            key_tuple: vec![bcs::to_bytes(
                &SuiAddress::from_str(
                    "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975",
                )
                .unwrap(),
            )
            .unwrap()],
            value_tuple: vec![
                bcs::to_bytes(&10u64).unwrap(),
                bcs::to_bytes(&10u64).unwrap(),
                bcs::to_bytes(&10u64).unwrap(),
            ],
        });
        let result = config
            .convert_event_to_sql(event, 0, "".to_string())
            .unwrap();
        assert_eq!(result, "INSERT INTO store_counter3 ( entity_id,hp,attack,defense) VALUES ('0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975',10,10,10) ON CONFLICT (entity_id) DO UPDATE SET hp = 10,attack = 10,defense = 10;");

        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "counter5".to_string(),
            key_tuple: Vec::new(),
            value_tuple: vec![
                bcs::to_bytes(
                    &SuiAddress::from_str(
                        "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975",
                    )
                    .unwrap(),
                )
                .unwrap(),
                bcs::to_bytes(&10u32).unwrap(),
            ],
        });
        let result = config
            .convert_event_to_sql(event, 0, "".to_string())
            .unwrap();
        assert_eq!(result, "INSERT INTO store_counter5 (unique_resource_id,player,value) VALUES (1,'0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975',10) ON CONFLICT (unique_resource_id) DO UPDATE SET player = '0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975',value = 10;");
    }

    #[test]
    fn test_convert_event_to_proto_struct() {
        let test_json = get_full_test_json();
        let config = DubheConfig::from_json(test_json).unwrap();
        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "component6".to_string(),
            key_tuple: vec![bcs::to_bytes(
                &SuiAddress::from_str(
                    "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975",
                )
                .unwrap(),
            )
            .unwrap()],
            value_tuple: vec![
                bcs::to_bytes(&100u32).unwrap(),
                bcs::to_bytes(&10u32).unwrap(),
            ],
        });
        let result = config.convert_event_to_proto_struct(&event).unwrap();
        println!("result: {:?}", result);

        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "component11".to_string(),
            key_tuple: vec![bcs::to_bytes(
                &SuiAddress::from_str(
                    "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975",
                )
                .unwrap(),
            )
            .unwrap()],
            value_tuple: vec![
                bcs::to_bytes(&100u32).unwrap(),
                bcs::to_bytes(&1u8).unwrap(),
            ],
        });
        let result = config.convert_event_to_proto_struct(&event).unwrap();
        println!("result: {:?}", result);
    }
}

//     #[test]
//     fn test_table_schema_from_json() {
//         let test_json = get_test_json();

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();

//         assert_eq!(tables.len(), 4);

//         let table = &tables[0];
//         assert_eq!(table.name, "counter0");
//         assert_eq!(table.table_type, "component");
//         assert_eq!(table.fields.len(), 1);
//         assert_eq!(table.fields[0].is_key, true);
//         assert_eq!(table.offchain, false);
//         assert_eq!(package_id, "0x1234567890123456789012345678901234567890");
//         assert_eq!(start_checkpoint, 1);

//         let table2 = &tables[2];
//         assert_eq!(table2.name, "counter2");
//         assert_eq!(table2.fields.len(), 2);
//         assert_eq!(table2.fields[0].is_key, true);
//         assert_eq!(table2.enums.len(), 1);
//         assert_eq!(table2.enums.get("Status").unwrap(), &vec!["Caught", "Fled", "Missed"]);
//     }

//     #[test]
//     fn test_get_sql_type() {
//         let schema = TableMetadata {
//             name: "test".to_string(),
//             table_type: "component".to_string(),
//             fields: vec![],
//             enums: HashMap::new(),
//             offchain: false,
//         };

//         assert_eq!(schema.get_sql_type("u8"), "INTEGER");
//         assert_eq!(schema.get_sql_type("u64"), "INTEGER");
//         assert_eq!(schema.get_sql_type("bool"), "BOOLEAN");
//         assert_eq!(schema.get_sql_type("vector<u8>"), "TEXT"); // TableMetadata doesn't handle vector types
//         assert_eq!(schema.get_sql_type("unknown"), "TEXT");
//     }

//     #[test]
//     fn test_generate_create_table_sql() {
//         let test_json = get_test_json();
//         let (package_id, start_checkpoint, tables) = TableMetadata::from_json(test_json).unwrap();
//         assert_eq!(tables.len(), 4);
//         let table = &tables[0];
//         assert_eq!(
//                 table.generate_create_table_sql(), "CREATE TABLE IF NOT EXISTS counter0 (entity_id TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
//             );
//         assert_eq!(
//                 table.generate_insert_table_fields_sql(), vec![
//                     "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter0', 'entity_id', 'address', '0', true)"
//                 ]
//             );
//         let table = &tables[1];
//         assert_eq!(
//                 table.generate_create_table_sql(), "CREATE TABLE IF NOT EXISTS counter1 (entity_id TEXT, value INTEGER, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
//             );
//         assert_eq!(
//                 table.generate_insert_table_fields_sql(), vec![
//                     "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter1', 'entity_id', 'address', '0', true)",
//                     "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter1', 'value', 'u32', '0', false)"
//                 ]
//             );
//         let table = &tables[2];
//         assert_eq!(
//                 table.generate_create_table_sql(),  "CREATE TABLE IF NOT EXISTS counter2 (entity_id TEXT, value TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, last_updated_checkpoint BIGINT DEFAULT 0, is_deleted BOOLEAN DEFAULT FALSE, PRIMARY KEY (entity_id))"
//             );
//         assert_eq!(
//                 table.generate_insert_table_fields_sql(), vec![
//                     "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter2', 'entity_id', 'address', '0', true)",
//                     "INSERT INTO table_fields (table_name, field_name, field_type, field_index, is_key) VALUES ('counter2', 'value', 'Status', '0', false)",
//                 ]
//             );
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_resource_without_keys() {
//         let test_json = json!({
//           "components": [],
//           "resources": [
//             {
//               "counter": {
//                 "fields": [
//                   { "value": "u32" }
//                 ],
//                 "keys": [],
//                 "offchain": false
//               }
//             }
//           ],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "counter");
//         assert_eq!(table.table_type, "resource");
//         assert_eq!(table.fields.len(), 1);
//         assert_eq!(table.fields[0].is_key, false);

//         let sql = table.generate_create_table_sql();
//         println!("sql: {}", sql);
//         // Verify SQL contains all fields as PRIMARY KEY
//         assert!(sql.contains("PRIMARY KEY (value)"));
//         assert!(sql.contains("value INTEGER"));
//         assert!(sql.contains("created_at TIMESTAMPTZ"));
//         assert!(sql.contains("updated_at TIMESTAMPTZ"));
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_component_without_keys() {
//         let test_json = json!({
//           "components": [
//             {
//               "player": {
//                 "fields": [
//                   { "name": "String" }
//                 ],
//                 "keys": [],
//                 "offchain": false
//               }
//             }
//           ],
//           "resources": [],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "player");
//         assert_eq!(table.table_type, "component");
//         assert_eq!(table.fields.len(), 1);
//         assert_eq!(table.fields[0].is_key, false);

//         let sql = table.generate_create_table_sql();
//         // Verify SQL contains non-key fields as PRIMARY KEY (original logic)
//         assert!(sql.contains("PRIMARY KEY (name)"));
//         assert!(sql.contains("name TEXT"));
//         assert!(sql.contains("created_at TIMESTAMPTZ"));
//         assert!(sql.contains("updated_at TIMESTAMPTZ"));
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_resource_with_keys() {
//         let test_json = json!({
//           "components": [],
//           "resources": [
//             {
//               "counter": {
//                 "fields": [
//                   { "id": "u256" },
//                   { "value": "u32" }
//                 ],
//                 "keys": ["id"],
//                 "offchain": false
//               }
//             }
//           ],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "counter");
//         assert_eq!(table.table_type, "resource");
//         assert_eq!(table.fields.len(), 2);

//         let sql = table.generate_create_table_sql();
//         // Verify SQL uses specified key fields as PRIMARY KEY
//         assert!(sql.contains("PRIMARY KEY (id)"));
//         assert!(sql.contains("id TEXT"));
//         assert!(sql.contains("value INTEGER"));
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_component_with_keys() {
//         let test_json = json!({
//           "components": [
//             {
//               "position": {
//                 "fields": [
//                   { "player": "address" },
//                   { "x": "u64" },
//                   { "y": "u64" }
//                 ],
//                 "keys": ["player"],
//                 "offchain": false
//               }
//             }
//           ],
//           "resources": [],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "position");
//         assert_eq!(table.table_type, "component");
//         assert_eq!(table.fields.len(), 3);

//         let sql = table.generate_create_table_sql();
//         // Verify SQL uses specified key fields as PRIMARY KEY
//         assert!(sql.contains("PRIMARY KEY (player)"));
//         assert!(sql.contains("player TEXT"));
//         assert!(sql.contains("x INTEGER"));
//         assert!(sql.contains("y INTEGER"));
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_resource_with_multiple_keys() {
//         let test_json = json!({
//           "components": [],
//           "resources": [
//             {
//               "balance": {
//                 "fields": [
//                   { "account": "address" },
//                   { "asset": "address" },
//                   { "amount": "u256" }
//                 ],
//                 "keys": ["account", "asset"],
//                 "offchain": false
//               }
//             }
//           ],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "balance");
//         assert_eq!(table.table_type, "resource");
//         assert_eq!(table.fields.len(), 3);

//         let sql = table.generate_create_table_sql();
//         // Verify SQL uses multiple key fields as PRIMARY KEY
//         assert!(sql.contains("PRIMARY KEY (account, asset)"));
//         assert!(sql.contains("account TEXT"));
//         assert!(sql.contains("asset TEXT"));
//         assert!(sql.contains("amount TEXT"));
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_component_with_multiple_non_key_fields() {
//         let test_json = json!({
//           "components": [
//             {
//               "stats": {
//                 "fields": [
//                   { "player": "address" },
//                   { "health": "u32" },
//                   { "mana": "u32" },
//                   { "level": "u8" }
//                 ],
//                 "keys": ["player"],
//                 "offchain": false
//               }
//             }
//           ],
//           "resources": [],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "stats");
//         assert_eq!(table.table_type, "component");
//         assert_eq!(table.fields.len(), 4);

//         let sql = table.generate_create_table_sql();
//         // Verify SQL uses key fields as PRIMARY KEY
//         assert!(sql.contains("PRIMARY KEY (player)"));
//         assert!(sql.contains("player TEXT"));
//         assert!(sql.contains("health INTEGER"));
//         assert!(sql.contains("mana INTEGER"));
//         assert!(sql.contains("level INTEGER"));
//     }

//     #[test]
//     fn test_generate_create_table_sql_for_resource_with_empty_fields() {
//         let test_json = json!({
//           "components": [],
//           "resources": [
//             {
//               "empty_resource": {
//                 "fields": [],
//                 "keys": [],
//                 "offchain": false
//               }
//             }
//           ],
//           "enums": [],
//           "package_id": "0x1234567890123456789012345678901234567890",
//           "start_checkpoint": "1"
//         });

//         let result = TableMetadata::from_json(test_json);
//         assert!(result.is_ok());

//         let (package_id, start_checkpoint, tables) = result.unwrap();
//         assert_eq!(tables.len(), 1);

//         let table = &tables[0];
//         assert_eq!(table.name, "empty_resource");
//         assert_eq!(table.table_type, "resource");
//         assert_eq!(table.fields.len(), 0);

//         let sql = table.generate_create_table_sql();
//         // Verify SQL does not contain PRIMARY KEY (because there are no fields)
//         assert!(!sql.contains("PRIMARY KEY"));
//         assert!(sql.contains("created_at TIMESTAMPTZ"));
//         assert!(sql.contains("updated_at TIMESTAMPTZ"));
//     }
// }
