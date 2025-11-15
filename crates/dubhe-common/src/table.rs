use crate::events::Event;
use crate::events::StoreSetRecord;
use crate::primitives::{MoveTypeParser, ParsedMoveValue};
use crate::sql::DBData;
use anyhow::Result;
use bcs;
use move_core_types::u256::U256;
use prost_types::compiler::code_generator_response::Feature;
use prost_types::ListValue;
use prost_types::{Struct, Value as ProtoValue};
use serde::Deserialize;
use serde_json;
use serde_json::Value;
use std::collections::BTreeMap;
use std::collections::HashMap;
use std::fmt::format;
use std::str::FromStr;
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

#[derive(Debug, Deserialize, Default)]
pub struct DubheConfig {
    pub fields: Vec<Field>,
    pub enums: Vec<Enum>,
    pub tables: Vec<Table>,
    pub original_package_id: String,
    pub start_checkpoint: String,
}

impl DubheConfig {
    pub fn new(original_package_id: String, start_checkpoint: String) -> Self {
        Self {
            fields: Vec::new(),
            enums: Vec::new(),
            tables: Vec::new(),
            original_package_id,
            start_checkpoint,
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
            .ok_or(anyhow::anyhow!("No package id found in config file"))?;
        let start_checkpoint = dubhe_config_json
            .start_checkpoint
            .ok_or(anyhow::anyhow!("No start checkpoint found in config file"))?;

        let mut dubhe_config = Self::new(original_package_id, start_checkpoint);

        /// handle enums
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

        // handle components
        for tables in dubhe_config_json.components {
            for (table_name, table_info) in tables {
                dubhe_config.push_table(Table {
                    name: table_name.clone(),
                    offchain: table_info.offchain,
                    component: true,
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

    pub fn can_convert_event_to_sql(&self, event: &Event) -> Result<()> {
        if event.table_id() == "dapp_fee_state"
            && event.original_package_id()
                != Some(
                    "0xa337791835d15223727ace33cce17ea0901c094c8cfbe34d089c1a18c2df7a15"
                        .to_string(),
                )
        {
            return Ok(());
        }
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
                    sql.push_str(&self.field_value_by_table_and_index(
                        &event.table_id,
                        event.field_index,
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
                    sql.push_str(&self.field_value_by_table_and_index(
                        &event.table_id,
                        event.field_index,
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
        }
    }

    pub fn convert_event_to_proto_struct(&self, event: &Event) -> Result<Struct> {
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
                let fields = self.field_proto_value_by_table_and_index(
                    &event.table_id,
                    event.field_index,
                    &event.value,
                );
                Ok(Struct { fields })
            }
            _ => Ok(Struct {
                fields: BTreeMap::new(),
            }),
        }
    }
}

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
    pub original_package_id: Option<String>,
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

        if dubhe_config_json.original_package_id.is_none() {
            return Err(anyhow::anyhow!("No package id found in config file"));
        }

        if dubhe_config_json.start_checkpoint.is_none() {
            return Err(anyhow::anyhow!("No start checkpoint found in config file"));
        }

        let package_id = dubhe_config_json.original_package_id.unwrap();
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
    fn test_can_convert_event_to_sql() {
        let test_json = get_test_json();
        let result = DubheConfig::from_json(test_json).unwrap();
        let event = Event::StoreSetRecord(StoreSetRecord {
            dapp_key: "1::dapp_key::DappKey".to_string(),
            table_id: "counter0".to_string(),
            key_tuple: Vec::new(),
            value_tuple: Vec::new(),
        });
        assert!(result.can_convert_event_to_sql(&event).is_ok());
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
        let result = config.convert_event_to_sql(event).unwrap();
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
        let result = config.convert_event_to_sql(event).unwrap();
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
        let result = config.convert_event_to_proto_struct(event).unwrap();
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
        let result = config.convert_event_to_proto_struct(event).unwrap();
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
