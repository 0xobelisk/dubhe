use serde::{Deserialize, Serialize};

use crate::TableMetadata;
use anyhow::Result;
use log;
use move_core_types::u256::U256;
use sui_types::base_types::SuiAddress;
use prost_types::{Value, value::Kind};

pub trait MoveTypeParser {
    fn into_move_type(&self) -> Result<MoveType>;
    fn into_parsed_move_value(&self, value: &[u8]) -> Result<ParsedMoveValue>;
}

pub enum MoveType {
    U8,
    U16,
    U32,
    U64,
    U128,
    U256,
    Address,
    Bool,
    String,
    // VectorU8,
    // VectorU16,
    // VectorU32,
    // VectorU64,
    // VectorU128,
    // VectorU256,
    // VectorAddress,
    // VectorBool,
}

impl MoveTypeParser for String { 
    fn into_move_type(&self) -> Result<MoveType> {
        match self.as_str() {
            "u8" => Ok(MoveType::U8),
            "u16" => Ok(MoveType::U16),
            "u32" => Ok(MoveType::U32),
            "u64" => Ok(MoveType::U64),
            "u128" => Ok(MoveType::U128),
            "u256" => Ok(MoveType::U256),
            "address" => Ok(MoveType::Address),
            "bool" => Ok(MoveType::Bool),
            "String" => Ok(MoveType::String),
            _ => Err(anyhow::anyhow!("Invalid move type: {}", self)),
        }
    }

    fn into_parsed_move_value(&self, value: &[u8]) -> Result<ParsedMoveValue> {
        match self.as_str() {
           "u8" => {
                let v: u8 = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::U8(v))
            }
            "u16" => {
                let v: u16 = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::U16(v))
            }
            "u32" => {
                let v: u32 = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::U32(v))
            }
            "u64" => {
                let v: u64 = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::U64(v))
            }
            "u128" => {
                let v: u128 = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::U128(v))
            }
            "u256" => {
                let v: U256 = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::U256(v.to_string()))
            }
            "String" => {
                let v: String = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::String(v))
            }
            "bool" => {
                let v: bool = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::Bool(v))
            }
            "address" => {
                let v: SuiAddress = bcs::from_bytes(value).unwrap();
                Ok(ParsedMoveValue::Address(v.to_string()))
            }
            // "vector<u8>" => {
            //     let v: Vec<u8> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorU8(v))
            // }
            // "vector<u16>" => {
            //     let v: Vec<u16> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorU16(v))
            // }
            // "vector<u32>" => {
            //     let v: Vec<u32> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorU32(v))
            // }
            // "vector<u64>" => {
            //     let v: Vec<u64> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorU64(v))
            // }
            // "vector<u128>" => {
            //     let v: Vec<u128> = bcs::from_bytes(field_value).unwrap();
            //     let v: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            //     Ok(ParsedMoveValue::VectorU128(v))
            // }
            // "vector<u256>" => {
            //     let v: Vec<U256> = bcs::from_bytes(field_value).unwrap();
            //     let v: Vec<String> = v.iter().map(|v| v.to_string()).collect();
            //     Ok(ParsedMoveValue::VectorU256(v))
            // }
            // "vector<address>" => {
            //     let v: Vec<SuiAddress> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorAddress(v))
            // }
            // "vector<bool>" => {
            //     let v: Vec<bool> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorBool(v))
            // }
            // "vector<String>" => {
            //     let v: Vec<String> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorString(v))
            // }
            // "vector<vector<u8>>" => {
            //     let v: Vec<Vec<u8>> = bcs::from_bytes(field_value).unwrap();
            //     Ok(ParsedMoveValue::VectorVectorU8(v))
            // }
            _ => Err(anyhow::anyhow!("Invalid move type: {}", self)),
        }
    }
}

/// A single record in the registry.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub enum ParsedMoveValue {
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    U128(u128),
    U256(String),
    Address(String),
    Bool(bool),
    String(String),
    // VectorU8(Vec<u8>),
    // VectorU16(Vec<u16>),
    // VectorU32(Vec<u32>),
    // VectorU64(Vec<u64>),
    // VectorU128(Vec<u128>),
    // VectorU256(Vec<String>),
    // VectorAddress(Vec<String>),
    // VectorBool(Vec<bool>),
}

impl ParsedMoveValue {
    pub fn to_string(&self) -> String {
        match self {
            ParsedMoveValue::U8(v) => v.to_string(),
            ParsedMoveValue::U16(v) => v.to_string(),
            ParsedMoveValue::U32(v) => v.to_string(),
            ParsedMoveValue::U64(v) => v.to_string(),
            ParsedMoveValue::U128(v) => v.to_string(),
            ParsedMoveValue::U256(v) => format!("'{}'", v),
            ParsedMoveValue::Address(v) => format!("'{}'", v),
            ParsedMoveValue::Bool(v) => v.to_string(),
            ParsedMoveValue::String(v) => format!("'{}'", v),
        }
    }

    pub fn into_google_protobuf_value(self) -> Value {
        match self {
            ParsedMoveValue::U8(n) => Value {
                kind: Some(Kind::NumberValue(n as f64)),
            },
            ParsedMoveValue::U16(n) => Value {
                kind: Some(Kind::NumberValue(n as f64)),
            },
            ParsedMoveValue::U32(n) => Value {
                kind: Some(Kind::NumberValue(n as f64)),
            },
            ParsedMoveValue::U64(n) => Value {
                kind: Some(Kind::NumberValue(n as f64)),
            },
            ParsedMoveValue::U128(n) => Value {
                kind: Some(Kind::StringValue(n.to_string())),
            },
            ParsedMoveValue::U256(s) => Value {
                kind: Some(Kind::StringValue(s)),
            },
            ParsedMoveValue::Address(s) => Value {
                kind: Some(Kind::StringValue(s)),
            },
            ParsedMoveValue::Bool(b) => Value {
                kind: Some(Kind::BoolValue(b)),
            },
            ParsedMoveValue::String(s) => Value {
                kind: Some(Kind::StringValue(s)),
            },
        }
    }
}