use anyhow::Result;
use prost_types::{Struct, Value as ProtoValue};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

pub fn json_to_proto_struct(json_value: &Value) -> Result<Struct> {
    match json_value {
        Value::Object(obj) => {
            let mut fields = BTreeMap::new();
            for (key, value) in obj {
                fields.insert(key.clone(), json_value_to_proto_value(value)?);
            }
            Ok(Struct { fields })
        }
        _ => Err(anyhow::anyhow!(
            "Expected JSON object, got {:?}",
            json_value
        )),
    }
}

/// Convert serde_json::Value to protobuf Value
pub fn json_value_to_proto_value(json_value: &Value) -> Result<ProtoValue> {
    let proto_value = match json_value {
        Value::Null => ProtoValue {
            kind: Some(prost_types::value::Kind::NullValue(0)),
        },
        Value::Bool(b) => ProtoValue {
            kind: Some(prost_types::value::Kind::BoolValue(*b)),
        },
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                ProtoValue {
                    kind: Some(prost_types::value::Kind::NumberValue(i as f64)),
                }
            } else if let Some(f) = n.as_f64() {
                ProtoValue {
                    kind: Some(prost_types::value::Kind::NumberValue(f)),
                }
            } else {
                return Err(anyhow::anyhow!("Invalid number value: {}", n));
            }
        }
        Value::String(s) => ProtoValue {
            kind: Some(prost_types::value::Kind::StringValue(s.clone())),
        },
        Value::Array(arr) => {
            let mut list_values = Vec::new();
            for item in arr {
                list_values.push(json_value_to_proto_value(item)?);
            }
            ProtoValue {
                kind: Some(prost_types::value::Kind::ListValue(
                    prost_types::ListValue {
                        values: list_values,
                    },
                )),
            }
        }
        Value::Object(_obj) => {
            let struct_value = json_to_proto_struct(json_value)?;
            ProtoValue {
                kind: Some(prost_types::value::Kind::StructValue(struct_value)),
            }
        }
    };
    Ok(proto_value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_json_to_proto_conversion() {
        let json_obj = json!({
            "name": "test",
            "age": 25,
            "active": true,
            "scores": [1, 2, 3],
            "metadata": {
                "version": "1.0",
                "tags": ["rust", "protobuf"]
            }
        });

        let proto_struct = json_to_proto_struct(&json_obj).unwrap();

        // assert_eq!(json_obj, proto_struct);
    }

    #[test]
    fn test_primitive_values() {
        let test_cases = vec![
            json!(null),
            json!(true),
            json!(false),
            json!(42),
            json!(3.14),
            json!("hello world"),
        ];

        for json_value in test_cases {
            let proto_value = json_value_to_proto_value(&json_value).unwrap();
            // assert_eq!(json_value, proto_value);
        }
    }
}
