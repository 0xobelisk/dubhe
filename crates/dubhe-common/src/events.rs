use serde::{Deserialize, Serialize};

use crate::{sql::DBData, TableMetadata};
use anyhow::Result;
use log;
use serde_json::Value;

pub trait EventParser {
    /// Parse a raw event into a structured event.
    fn parse(&self, table_metadatas: &[TableMetadata]) -> Result<(String, Vec<DBData>)>;
}

/// Normalized set-record event used internally by the indexer.
///
/// The Dubhe framework (v1.66+) emits `Dubhe_Store_SetRecord` with this BCS layout:
///   { dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>> }
///
/// We convert on deserialization to keep the rest of the codebase stable:
///   dapp_key   → dapp_key  (unchanged)
///   account    → table_id  (after normalization: key[0] UTF-8 = actual table name)
///   key[1..]   → key_tuple (additional user keys; key[0] is the table name)
///   value      → value_tuple
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreSetRecord {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
    pub value_tuple: Vec<Vec<u8>>,
}

impl EventParser for StoreSetRecord {
    fn parse(&self, table_metadatas: &[TableMetadata]) -> Result<(String, Vec<DBData>)> {
        let table_metadata = table_metadatas
            .iter()
            .find(|t| t.name == self.table_id)
            .ok_or_else(|| {
                anyhow::anyhow!("Table metadata not found for table_id: {}", self.table_id)
            })?;
        // Convert the record to a JSON value
        let values = table_metadata.parse(self.key_tuple.clone(), self.value_tuple.clone())?;
        Ok((self.table_id.clone(), values))
    }
}

/// Normalized set-field event.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreSetField {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
    pub field_index: u8,
    pub value: Vec<u8>,
}

/// Normalized delete-record event.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreDeleteRecord {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub enum Event {
    StoreSetRecord(StoreSetRecord),
    StoreSetField(StoreSetField),
    StoreDeleteRecord(StoreDeleteRecord),
}

// ── Raw BCS structs matching the new Dubhe framework (v1.66+) event layout ──

/// BCS-compatible representation of `dubhe::dubhe_events::Dubhe_Store_SetRecord`.
///   { dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>> }
#[derive(Debug, Deserialize)]
struct RawSetRecord {
    dapp_key: String,
    account: String,
    key: Vec<Vec<u8>>,
    value: Vec<Vec<u8>>,
}

/// BCS-compatible representation of `dubhe::dubhe_events::Dubhe_Store_DeleteRecord`.
///   { dapp_key: String, account: String, key: vector<vector<u8>> }
#[derive(Debug, Deserialize)]
struct RawDeleteRecord {
    dapp_key: String,
    account: String,
    key: Vec<Vec<u8>>,
}

impl Event {
    /// Normalize an account/entity string to the canonical Sui format.
    ///
    /// Move emits two kinds of account strings, both WITHOUT the "0x" prefix:
    ///
    /// 1. Bare address (user resource key):
    ///    "009c0b…3613"  →  "0x009c0b…3613"
    ///    Exactly 64 lowercase hex chars, no "::".
    ///
    /// 2. Type path (DappKey / global resource key):
    ///    "bffa35…::dapp_key::DappKey"  →  "0xbffa35…::dapp_key::DappKey"
    ///    `type_name::into_string()` omits "0x" from the package address;
    ///    the canonical Sui format includes it.
    fn normalize_account(account: &str) -> String {
        // Already normalized – avoid double-prefixing.
        if account.starts_with("0x") {
            return account.to_owned();
        }

        // Bare address: exactly 64 hex chars, no "::".
        if account.len() == 64
            && !account.contains("::")
            && account.chars().all(|c| c.is_ascii_hexdigit())
        {
            return format!("0x{}", account);
        }

        // Type path: "<pkg_hex>::module::Struct" – prepend "0x" to the package part.
        if let Some(rest) = account.split_once("::") {
            let pkg = rest.0;
            let tail = rest.1;
            // Only normalize if the package portion looks like a hex address.
            if pkg.chars().all(|c| c.is_ascii_hexdigit()) {
                return format!("0x{}::{}", pkg, tail);
            }
        }

        // Unrecognized format – return as-is.
        account.to_owned()
    }

    /// Extract the package address from the dapp_key type path.
    ///
    /// dapp_key is emitted by `type_name::get<DappKey>().into_string()` in Move,
    /// which gives "hex_package_id::module::Type" WITHOUT the "0x" prefix.
    /// We prepend "0x" to produce a standard Sui address string.
    pub fn original_package_id(&self) -> Option<String> {
        let dapp_key = match self {
            Event::StoreSetRecord(e) => &e.dapp_key,
            Event::StoreSetField(e) => &e.dapp_key,
            Event::StoreDeleteRecord(e) => &e.dapp_key,
        };
        dapp_key.split("::").next().map(|s| format!("0x{}", s))
    }

    pub fn table_id(&self) -> &str {
        match self {
            Event::StoreSetRecord(event) => &event.table_id,
            Event::StoreSetField(event) => &event.table_id,
            Event::StoreDeleteRecord(event) => &event.table_id,
        }
    }

    pub fn from_bytes(name: &str, bytes: &[u8]) -> Result<Self> {
        match name {
            "Dubhe_Store_SetRecord" => {
                let raw = bcs::from_bytes::<RawSetRecord>(bytes)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreSetRecord: {}", e))?;
                Ok(Event::StoreSetRecord(Self::convert_set_record(raw)))
            }
            "Dubhe_Store_SetField" => {
                // StoreSetField keeps the same layout (no account field in old or new framework).
                bcs::from_bytes::<StoreSetField>(bytes)
                    .map(Event::StoreSetField)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreSetField: {}", e))
            }
            "Dubhe_Store_DeleteRecord" => {
                let raw = bcs::from_bytes::<RawDeleteRecord>(bytes)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreDeleteRecord: {}", e))?;
                Ok(Event::StoreDeleteRecord(Self::convert_delete_record(raw)))
            }
            _ => Err(anyhow::anyhow!("Invalid event name: {}", name)),
        }
    }

    /// Convert a raw new-format SetRecord into the normalized indexer format.
    ///
    /// New format: { dapp_key, account, key=[table_name, ...user_keys], value }
    /// Normalized: { dapp_key, table_id=table_name, key_tuple=[entity_key, ...], value_tuple }
    ///
    /// The `account` field is the universal entity identifier. It is stored as a
    /// BCS-encoded String (not parsed as SuiAddress) so that it works for both:
    ///   - User resources: account = 64-char hex address (e.g. "009c0b...3613")
    ///   - Global resources: account = DappKey type string (e.g. "pkg::dapp_key::DappKey")
    fn convert_set_record(raw: RawSetRecord) -> StoreSetRecord {
        // key[0] holds the table name as UTF-8 bytes (e.g. b"value").
        let table_id = raw
            .key
            .first()
            .and_then(|b| String::from_utf8(b.clone()).ok())
            .unwrap_or_default();

        // key_tuple[0] = BCS(account String) – the universal entity/resource key.
        // Normalize the account to standard Sui format (prepend "0x" for bare addresses).
        // key_tuple[1..] = additional user-defined keys from key[1..].
        let normalized_account = Self::normalize_account(&raw.account);
        let mut key_tuple = Vec::new();
        key_tuple.push(bcs::to_bytes(&normalized_account).unwrap_or_default());
        if raw.key.len() > 1 {
            key_tuple.extend_from_slice(&raw.key[1..]);
        }

        StoreSetRecord {
            dapp_key: raw.dapp_key,
            table_id,
            key_tuple,
            value_tuple: raw.value,
        }
    }

    /// Convert a raw new-format DeleteRecord into the normalized indexer format.
    fn convert_delete_record(raw: RawDeleteRecord) -> StoreDeleteRecord {
        let table_id = raw
            .key
            .first()
            .and_then(|b| String::from_utf8(b.clone()).ok())
            .unwrap_or_default();

        let normalized_account = Self::normalize_account(&raw.account);
        let mut key_tuple = Vec::new();
        key_tuple.push(bcs::to_bytes(&normalized_account).unwrap_or_default());
        if raw.key.len() > 1 {
            key_tuple.extend_from_slice(&raw.key[1..]);
        }

        StoreDeleteRecord {
            dapp_key: raw.dapp_key,
            table_id,
            key_tuple,
        }
    }
}
