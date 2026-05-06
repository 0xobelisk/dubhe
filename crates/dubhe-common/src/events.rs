use serde::{Deserialize, Serialize};

use crate::{sql::DBData, TableMetadata};
use anyhow::Result;
use move_core_types::u256::U256;
use sui_types::base_types::SuiAddress;

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
    /// UTF-8 name of the field being updated (e.g. "health").
    pub field_name: String,
    pub value: Vec<u8>,
}

/// Normalized delete-record event.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreDeleteRecord {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
}

/// Normalized delete-field event.
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct StoreDeleteField {
    pub dapp_key: String,
    pub table_id: String,
    pub key_tuple: Vec<Vec<u8>>,
    pub field_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct UserStorageCreated {
    pub dapp_key: String,
    pub canonical_owner: String,
    pub user_storage_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct ObjectStorageLifecycle {
    pub dapp_key: String,
    pub object_type: Vec<u8>,
    pub object_id: String,
    pub entity_id: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct ObjectStorageField {
    pub dapp_key: String,
    pub object_type: Vec<u8>,
    pub object_id: String,
    pub field_name: Vec<u8>,
    pub field_value: Option<Vec<u8>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct SceneStorageLifecycle {
    pub dapp_key: String,
    pub scene_type: Vec<u8>,
    pub scene_id: String,
    pub authorization_kind: Option<Vec<u8>>,
    pub authorized_permit_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct SceneStorageField {
    pub dapp_key: String,
    pub scene_type: Vec<u8>,
    pub scene_id: String,
    pub field_name: Vec<u8>,
    pub field_value: Option<Vec<u8>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct ScenePermitCreated {
    pub dapp_key: String,
    pub permit_type: Vec<u8>,
    pub permit_id: String,
    pub expires_at: Option<u64>,
    pub invites_expire_at: Option<u64>,
    pub max_participants: Option<u64>,
    pub participant_count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct ScenePermitParticipant {
    pub dapp_key: String,
    pub permit_type: Vec<u8>,
    pub permit_id: String,
    pub participant: String,
    pub action: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct ScenePermitExpire {
    pub dapp_key: String,
    pub permit_type: Vec<u8>,
    pub permit_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct MarketplaceListing {
    pub dapp_key: String,
    pub listing_id: String,
    pub seller: String,
    pub record_type: Vec<u8>,
    pub record_key: Vec<Vec<u8>>,
    pub field_names: Vec<Vec<u8>>,
    pub record_data: Vec<u8>,
    pub price: u64,
    pub coin_type: String,
    pub is_fungible: bool,
    pub listed_until: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct MarketplaceListingUpdate {
    pub dapp_key: String,
    pub listing_id: String,
    pub actor: String,
    pub seller: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct DappCreatedEvent {
    pub dapp_key: String,
    pub admin: String,
    pub created_at: u64,
    pub dapp_storage_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct DappUpgradedEvent {
    pub dapp_key: String,
    pub new_package_id: String,
    pub new_version: u32,
    pub admin: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct CreditRechargedEvent {
    pub dapp_key: String,
    pub from: String,
    pub coin_type: String,
    pub amount: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct SessionLifecycle {
    pub dapp_key: String,
    pub canonical: String,
    pub session_wallet: String,
    pub expires_at: Option<u64>,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct DappPausedChangedEvent {
    pub dapp_key: String,
    pub paused: bool,
    pub updated_by: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct DappRuntimeUpdate {
    pub dapp_key: String,
    pub event_name: String,
    pub actor: Option<String>,
    pub amount: Option<String>,
    pub settlement_mode: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub enum Event {
    StoreSetRecord(StoreSetRecord),
    StoreSetField(StoreSetField),
    StoreDeleteRecord(StoreDeleteRecord),
    StoreDeleteField(StoreDeleteField),
    UserStorageCreated(UserStorageCreated),
    ObjectCreated(ObjectStorageLifecycle),
    ObjectDestroyed(ObjectStorageLifecycle),
    ObjectSetField(ObjectStorageField),
    ObjectDeleteField(ObjectStorageField),
    SceneCreated(SceneStorageLifecycle),
    SceneDestroyed(SceneStorageLifecycle),
    SceneSetField(SceneStorageField),
    SceneDeleteField(SceneStorageField),
    ScenePermitCreated(ScenePermitCreated),
    ScenePermitAccept(ScenePermitParticipant),
    ScenePermitJoin(ScenePermitParticipant),
    ScenePermitLeave(ScenePermitParticipant),
    ScenePermitExpire(ScenePermitExpire),
    ItemListed(MarketplaceListing),
    ItemSold(MarketplaceListingUpdate),
    ListingCancelled(MarketplaceListingUpdate),
    ListingExpired(MarketplaceListingUpdate),
    DappCreated(DappCreatedEvent),
    DappUpgraded(DappUpgradedEvent),
    CreditRecharged(CreditRechargedEvent),
    SessionActivated(SessionLifecycle),
    SessionDeactivated(SessionLifecycle),
    DappPausedChanged(DappPausedChangedEvent),
    DappRuntimeUpdate(DappRuntimeUpdate),
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

/// BCS-compatible representation of `dubhe::dubhe_events::Dubhe_Store_SetField`.
///   { dapp_key: String, account: String, key: vector<vector<u8>>,
///     field_name: vector<u8>, field_value: vector<u8> }
#[derive(Debug, Deserialize)]
struct RawSetField {
    dapp_key: String,
    account: String,
    key: Vec<Vec<u8>>,
    field_name: Vec<u8>,
    field_value: Vec<u8>,
}

/// BCS-compatible representation of `dubhe::dubhe_events::Dubhe_Store_DeleteRecord`.
///   { dapp_key: String, account: String, key: vector<vector<u8>> }
#[derive(Debug, Deserialize)]
struct RawDeleteRecord {
    dapp_key: String,
    account: String,
    key: Vec<Vec<u8>>,
}

#[derive(Debug, Deserialize)]
struct RawDeleteField {
    dapp_key: String,
    account: String,
    key: Vec<Vec<u8>>,
    field_name: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct RawUserStorageCreated {
    dapp_key: String,
    canonical_owner: SuiAddress,
    user_storage_id: SuiAddress,
}

#[derive(Debug, Deserialize)]
struct RawObjectLifecycle {
    dapp_key: String,
    object_type: Vec<u8>,
    object_id: SuiAddress,
    entity_id: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct RawObjectSetField {
    dapp_key: String,
    object_type: Vec<u8>,
    object_id: SuiAddress,
    field_name: Vec<u8>,
    field_value: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct RawObjectDeleteField {
    dapp_key: String,
    object_type: Vec<u8>,
    object_id: SuiAddress,
    field_name: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct RawSceneCreated {
    dapp_key: String,
    scene_type: Vec<u8>,
    scene_id: SuiAddress,
    authorization_kind: Vec<u8>,
    authorized_permit_id: Option<SuiAddress>,
}

#[derive(Debug, Deserialize)]
struct RawSceneDestroyed {
    dapp_key: String,
    scene_type: Vec<u8>,
    scene_id: SuiAddress,
    authorized_permit_id: Option<SuiAddress>,
}

#[derive(Debug, Deserialize)]
struct RawSceneSetField {
    dapp_key: String,
    scene_type: Vec<u8>,
    scene_id: SuiAddress,
    field_name: Vec<u8>,
    field_value: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct RawSceneDeleteField {
    dapp_key: String,
    scene_type: Vec<u8>,
    scene_id: SuiAddress,
    field_name: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct RawScenePermitCreated {
    dapp_key: String,
    permit_type: Vec<u8>,
    permit_id: SuiAddress,
    expires_at: Option<u64>,
    invites_expire_at: Option<u64>,
    max_participants: Option<u64>,
    participant_count: u64,
}

#[derive(Debug, Deserialize)]
struct RawScenePermitParticipant {
    dapp_key: String,
    permit_type: Vec<u8>,
    permit_id: SuiAddress,
    participant: SuiAddress,
}

#[derive(Debug, Deserialize)]
struct RawScenePermitExpire {
    dapp_key: String,
    permit_type: Vec<u8>,
    permit_id: SuiAddress,
}

#[derive(Debug, Deserialize)]
struct RawItemListed {
    dapp_key: String,
    listing_id: SuiAddress,
    seller: SuiAddress,
    record_type: Vec<u8>,
    record_key: Vec<Vec<u8>>,
    field_names: Vec<Vec<u8>>,
    record_data: Vec<u8>,
    price: u64,
    coin_type: String,
    is_fungible: bool,
    listed_until: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawItemSold {
    dapp_key: String,
    listing_id: SuiAddress,
    buyer: SuiAddress,
    seller: SuiAddress,
    record_type: Vec<u8>,
    price: u64,
    coin_type: String,
    is_fungible: bool,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawListingTerminal {
    dapp_key: String,
    listing_id: SuiAddress,
    seller: SuiAddress,
    is_fungible: bool,
}

#[derive(Debug, Deserialize)]
struct RawDappCreated {
    dapp_key: String,
    admin: SuiAddress,
    created_at: u64,
    dapp_storage_id: SuiAddress,
}

#[derive(Debug, Deserialize)]
struct RawDappUpgraded {
    dapp_key: String,
    new_package_id: SuiAddress,
    new_version: u32,
    admin: SuiAddress,
}

#[derive(Debug, Deserialize)]
struct RawCreditRecharged {
    dapp_key: String,
    from: SuiAddress,
    coin_type: String,
    amount: U256,
}

#[derive(Debug, Deserialize)]
struct RawSessionActivated {
    dapp_key: String,
    canonical: SuiAddress,
    session_wallet: SuiAddress,
    expires_at: u64,
}

#[derive(Debug, Deserialize)]
struct RawSessionDeactivated {
    dapp_key: String,
    canonical: SuiAddress,
    session_key: SuiAddress,
}

#[derive(Debug, Deserialize)]
struct RawDappPausedChanged {
    dapp_key: String,
    paused: bool,
    updated_by: SuiAddress,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawWritesSettled {
    dapp_key: String,
    account: SuiAddress,
    writes: u64,
    bytes: U256,
    free_cost: U256,
    paid_cost: U256,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawSettlementSkipped {
    dapp_key: String,
    account: SuiAddress,
    unsettled_writes: u64,
    unsettled_bytes: U256,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawSettlementPartial {
    dapp_key: String,
    account: SuiAddress,
    settled_writes: u64,
    settled_bytes: U256,
    remaining_writes: u64,
    remaining_bytes: U256,
    free_cost: U256,
    paid_cost: U256,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawFreeCreditGranted {
    dapp_key: String,
    amount: U256,
    expires_at: u64,
    granted_by: SuiAddress,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawFreeCreditRevoked {
    dapp_key: String,
    amount_remaining: U256,
    revoked_by: SuiAddress,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawFreeCreditExtended {
    dapp_key: String,
    new_expires_at: u64,
    extended_by: SuiAddress,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawSettlementModeChanged {
    dapp_key: String,
    old_mode: u8,
    new_mode: u8,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RawDappRevenueWithdrawn {
    dapp_key: String,
    admin: SuiAddress,
    coin_type: String,
    amount: u64,
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
            Event::StoreDeleteField(e) => &e.dapp_key,
            Event::UserStorageCreated(e) => &e.dapp_key,
            Event::ObjectCreated(e) | Event::ObjectDestroyed(e) => &e.dapp_key,
            Event::ObjectSetField(e) | Event::ObjectDeleteField(e) => &e.dapp_key,
            Event::SceneCreated(e) | Event::SceneDestroyed(e) => &e.dapp_key,
            Event::SceneSetField(e) | Event::SceneDeleteField(e) => &e.dapp_key,
            Event::ScenePermitCreated(e) => &e.dapp_key,
            Event::ScenePermitAccept(e)
            | Event::ScenePermitJoin(e)
            | Event::ScenePermitLeave(e) => &e.dapp_key,
            Event::ScenePermitExpire(e) => &e.dapp_key,
            Event::ItemListed(e) => &e.dapp_key,
            Event::ItemSold(e) | Event::ListingCancelled(e) | Event::ListingExpired(e) => {
                &e.dapp_key
            }
            Event::DappCreated(e) => &e.dapp_key,
            Event::DappUpgraded(e) => &e.dapp_key,
            Event::CreditRecharged(e) => &e.dapp_key,
            Event::SessionActivated(e) | Event::SessionDeactivated(e) => &e.dapp_key,
            Event::DappPausedChanged(e) => &e.dapp_key,
            Event::DappRuntimeUpdate(e) => &e.dapp_key,
        };
        dapp_key.split("::").next().map(|s| format!("0x{}", s))
    }

    pub fn table_id(&self) -> &str {
        match self {
            Event::StoreSetRecord(event) => &event.table_id,
            Event::StoreSetField(event) => &event.table_id,
            Event::StoreDeleteRecord(event) => &event.table_id,
            Event::StoreDeleteField(event) => &event.table_id,
            Event::UserStorageCreated(_) => "user_storages",
            Event::ObjectCreated(_) | Event::ObjectDestroyed(_) => "object_storages",
            Event::ObjectSetField(_) | Event::ObjectDeleteField(_) => "object_storage_fields",
            Event::SceneCreated(_) | Event::SceneDestroyed(_) => "scene_storages",
            Event::SceneSetField(_) | Event::SceneDeleteField(_) => "scene_storage_fields",
            Event::ScenePermitCreated(_) | Event::ScenePermitExpire(_) => "scene_permits",
            Event::ScenePermitAccept(_)
            | Event::ScenePermitJoin(_)
            | Event::ScenePermitLeave(_) => "scene_permit_participants",
            Event::ItemListed(_)
            | Event::ItemSold(_)
            | Event::ListingCancelled(_)
            | Event::ListingExpired(_) => "marketplace_listings",
            Event::DappCreated(_) | Event::DappUpgraded(_) | Event::CreditRecharged(_) => {
                "dapp_runtime_state"
            }
            Event::DappPausedChanged(_) => "dapp_runtime_state",
            Event::DappRuntimeUpdate(_) => "dapp_runtime_state",
            Event::SessionActivated(_) | Event::SessionDeactivated(_) => "sessions",
        }
    }

    pub fn is_schema_backed_store_event(&self) -> bool {
        matches!(
            self,
            Event::StoreSetRecord(_)
                | Event::StoreSetField(_)
                | Event::StoreDeleteRecord(_)
                | Event::StoreDeleteField(_)
        )
    }

    pub fn from_bytes(name: &str, bytes: &[u8]) -> Result<Self> {
        match name {
            "Dubhe_Store_SetRecord" => {
                let raw = bcs::from_bytes::<RawSetRecord>(bytes)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreSetRecord: {}", e))?;
                Ok(Event::StoreSetRecord(Self::convert_set_record(raw)))
            }
            "Dubhe_Store_SetField" => {
                let raw = bcs::from_bytes::<RawSetField>(bytes)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreSetField: {}", e))?;
                Ok(Event::StoreSetField(Self::convert_set_field(raw)))
            }
            "Dubhe_Store_DeleteRecord" => {
                let raw = bcs::from_bytes::<RawDeleteRecord>(bytes)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreDeleteRecord: {}", e))?;
                Ok(Event::StoreDeleteRecord(Self::convert_delete_record(raw)))
            }
            "Dubhe_Store_DeleteField" => {
                let raw = bcs::from_bytes::<RawDeleteField>(bytes)
                    .map_err(|e| anyhow::anyhow!("Failed to parse StoreDeleteField: {}", e))?;
                Ok(Event::StoreDeleteField(Self::convert_delete_field(raw)))
            }
            "Dubhe_UserStorage_Created" => {
                let raw = bcs::from_bytes::<RawUserStorageCreated>(bytes)?;
                Ok(Event::UserStorageCreated(UserStorageCreated {
                    dapp_key: raw.dapp_key,
                    canonical_owner: Self::addr(raw.canonical_owner),
                    user_storage_id: Self::addr(raw.user_storage_id),
                }))
            }
            "Dubhe_Object_Created" => {
                let raw = bcs::from_bytes::<RawObjectLifecycle>(bytes)?;
                Ok(Event::ObjectCreated(Self::convert_object_lifecycle(raw)))
            }
            "Dubhe_Object_Destroyed" => {
                let raw = bcs::from_bytes::<RawObjectLifecycle>(bytes)?;
                Ok(Event::ObjectDestroyed(Self::convert_object_lifecycle(raw)))
            }
            "Dubhe_Object_SetField" => {
                let raw = bcs::from_bytes::<RawObjectSetField>(bytes)?;
                Ok(Event::ObjectSetField(ObjectStorageField {
                    dapp_key: raw.dapp_key,
                    object_type: raw.object_type,
                    object_id: Self::addr(raw.object_id),
                    field_name: raw.field_name,
                    field_value: Some(raw.field_value),
                }))
            }
            "Dubhe_Object_DeleteField" => {
                let raw = bcs::from_bytes::<RawObjectDeleteField>(bytes)?;
                Ok(Event::ObjectDeleteField(ObjectStorageField {
                    dapp_key: raw.dapp_key,
                    object_type: raw.object_type,
                    object_id: Self::addr(raw.object_id),
                    field_name: raw.field_name,
                    field_value: None,
                }))
            }
            "Dubhe_Scene_Created" => {
                let raw = bcs::from_bytes::<RawSceneCreated>(bytes)?;
                Ok(Event::SceneCreated(SceneStorageLifecycle {
                    dapp_key: raw.dapp_key,
                    scene_type: raw.scene_type,
                    scene_id: Self::addr(raw.scene_id),
                    authorization_kind: Some(raw.authorization_kind),
                    authorized_permit_id: raw.authorized_permit_id.map(Self::addr),
                }))
            }
            "Dubhe_Scene_Destroyed" => {
                let raw = bcs::from_bytes::<RawSceneDestroyed>(bytes)?;
                Ok(Event::SceneDestroyed(SceneStorageLifecycle {
                    dapp_key: raw.dapp_key,
                    scene_type: raw.scene_type,
                    scene_id: Self::addr(raw.scene_id),
                    authorization_kind: None,
                    authorized_permit_id: raw.authorized_permit_id.map(Self::addr),
                }))
            }
            "Dubhe_Scene_SetField" => {
                let raw = bcs::from_bytes::<RawSceneSetField>(bytes)?;
                Ok(Event::SceneSetField(SceneStorageField {
                    dapp_key: raw.dapp_key,
                    scene_type: raw.scene_type,
                    scene_id: Self::addr(raw.scene_id),
                    field_name: raw.field_name,
                    field_value: Some(raw.field_value),
                }))
            }
            "Dubhe_Scene_DeleteField" => {
                let raw = bcs::from_bytes::<RawSceneDeleteField>(bytes)?;
                Ok(Event::SceneDeleteField(SceneStorageField {
                    dapp_key: raw.dapp_key,
                    scene_type: raw.scene_type,
                    scene_id: Self::addr(raw.scene_id),
                    field_name: raw.field_name,
                    field_value: None,
                }))
            }
            "Dubhe_ScenePermit_Created" => {
                let raw = bcs::from_bytes::<RawScenePermitCreated>(bytes)?;
                Ok(Event::ScenePermitCreated(ScenePermitCreated {
                    dapp_key: raw.dapp_key,
                    permit_type: raw.permit_type,
                    permit_id: Self::addr(raw.permit_id),
                    expires_at: raw.expires_at,
                    invites_expire_at: raw.invites_expire_at,
                    max_participants: raw.max_participants,
                    participant_count: raw.participant_count,
                }))
            }
            "Dubhe_ScenePermit_Accept" => {
                let raw = bcs::from_bytes::<RawScenePermitParticipant>(bytes)?;
                Ok(Event::ScenePermitAccept(Self::convert_permit_participant(
                    raw, "accept",
                )))
            }
            "Dubhe_ScenePermit_Join" => {
                let raw = bcs::from_bytes::<RawScenePermitParticipant>(bytes)?;
                Ok(Event::ScenePermitJoin(Self::convert_permit_participant(
                    raw, "join",
                )))
            }
            "Dubhe_ScenePermit_Leave" => {
                let raw = bcs::from_bytes::<RawScenePermitParticipant>(bytes)?;
                Ok(Event::ScenePermitLeave(Self::convert_permit_participant(
                    raw, "leave",
                )))
            }
            "Dubhe_ScenePermit_Expire" => {
                let raw = bcs::from_bytes::<RawScenePermitExpire>(bytes)?;
                Ok(Event::ScenePermitExpire(ScenePermitExpire {
                    dapp_key: raw.dapp_key,
                    permit_type: raw.permit_type,
                    permit_id: Self::addr(raw.permit_id),
                }))
            }
            "ItemListed" => {
                let raw = bcs::from_bytes::<RawItemListed>(bytes)?;
                Ok(Event::ItemListed(MarketplaceListing {
                    dapp_key: raw.dapp_key,
                    listing_id: Self::addr(raw.listing_id),
                    seller: Self::addr(raw.seller),
                    record_type: raw.record_type,
                    record_key: raw.record_key,
                    field_names: raw.field_names,
                    record_data: raw.record_data,
                    price: raw.price,
                    coin_type: raw.coin_type,
                    is_fungible: raw.is_fungible,
                    listed_until: raw.listed_until,
                }))
            }
            "ItemSold" => {
                let raw = bcs::from_bytes::<RawItemSold>(bytes)?;
                Ok(Event::ItemSold(MarketplaceListingUpdate {
                    dapp_key: raw.dapp_key,
                    listing_id: Self::addr(raw.listing_id),
                    actor: Self::addr(raw.buyer),
                    seller: Some(Self::addr(raw.seller)),
                    status: "sold".to_string(),
                }))
            }
            "ListingCancelled" => {
                let raw = bcs::from_bytes::<RawListingTerminal>(bytes)?;
                Ok(Event::ListingCancelled(MarketplaceListingUpdate {
                    dapp_key: raw.dapp_key,
                    listing_id: Self::addr(raw.listing_id),
                    actor: Self::addr(raw.seller),
                    seller: Some(Self::addr(raw.seller)),
                    status: "cancelled".to_string(),
                }))
            }
            "ListingExpired" => {
                let raw = bcs::from_bytes::<RawListingTerminal>(bytes)?;
                Ok(Event::ListingExpired(MarketplaceListingUpdate {
                    dapp_key: raw.dapp_key,
                    listing_id: Self::addr(raw.listing_id),
                    actor: Self::addr(raw.seller),
                    seller: Some(Self::addr(raw.seller)),
                    status: "expired".to_string(),
                }))
            }
            "DappCreated" => {
                let raw = bcs::from_bytes::<RawDappCreated>(bytes)?;
                Ok(Event::DappCreated(DappCreatedEvent {
                    dapp_key: raw.dapp_key,
                    admin: Self::addr(raw.admin),
                    created_at: raw.created_at,
                    dapp_storage_id: Self::addr(raw.dapp_storage_id),
                }))
            }
            "DappUpgraded" => {
                let raw = bcs::from_bytes::<RawDappUpgraded>(bytes)?;
                Ok(Event::DappUpgraded(DappUpgradedEvent {
                    dapp_key: raw.dapp_key,
                    new_package_id: Self::addr(raw.new_package_id),
                    new_version: raw.new_version,
                    admin: Self::addr(raw.admin),
                }))
            }
            "CreditRecharged" => {
                let raw = bcs::from_bytes::<RawCreditRecharged>(bytes)?;
                Ok(Event::CreditRecharged(CreditRechargedEvent {
                    dapp_key: raw.dapp_key,
                    from: Self::addr(raw.from),
                    coin_type: raw.coin_type,
                    amount: raw.amount.to_string(),
                }))
            }
            "SessionActivated" => {
                let raw = bcs::from_bytes::<RawSessionActivated>(bytes)?;
                Ok(Event::SessionActivated(SessionLifecycle {
                    dapp_key: raw.dapp_key,
                    canonical: Self::addr(raw.canonical),
                    session_wallet: Self::addr(raw.session_wallet),
                    expires_at: Some(raw.expires_at),
                    active: true,
                }))
            }
            "SessionDeactivated" => {
                let raw = bcs::from_bytes::<RawSessionDeactivated>(bytes)?;
                Ok(Event::SessionDeactivated(SessionLifecycle {
                    dapp_key: raw.dapp_key,
                    canonical: Self::addr(raw.canonical),
                    session_wallet: Self::addr(raw.session_key),
                    expires_at: None,
                    active: false,
                }))
            }
            "DappPausedChanged" => {
                let raw = bcs::from_bytes::<RawDappPausedChanged>(bytes)?;
                Ok(Event::DappPausedChanged(DappPausedChangedEvent {
                    dapp_key: raw.dapp_key,
                    paused: raw.paused,
                    updated_by: Self::addr(raw.updated_by),
                }))
            }
            "WritesSettled" => {
                let raw = bcs::from_bytes::<RawWritesSettled>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "WritesSettled".to_string(),
                    actor: Some(Self::addr(raw.account)),
                    amount: Some(raw.paid_cost.to_string()),
                    settlement_mode: None,
                }))
            }
            "SettlementSkipped" => {
                let raw = bcs::from_bytes::<RawSettlementSkipped>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "SettlementSkipped".to_string(),
                    actor: Some(Self::addr(raw.account)),
                    amount: None,
                    settlement_mode: None,
                }))
            }
            "SettlementPartial" => {
                let raw = bcs::from_bytes::<RawSettlementPartial>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "SettlementPartial".to_string(),
                    actor: Some(Self::addr(raw.account)),
                    amount: Some(raw.paid_cost.to_string()),
                    settlement_mode: None,
                }))
            }
            "FreeCreditGranted" => {
                let raw = bcs::from_bytes::<RawFreeCreditGranted>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "FreeCreditGranted".to_string(),
                    actor: Some(Self::addr(raw.granted_by)),
                    amount: Some(raw.amount.to_string()),
                    settlement_mode: None,
                }))
            }
            "FreeCreditRevoked" => {
                let raw = bcs::from_bytes::<RawFreeCreditRevoked>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "FreeCreditRevoked".to_string(),
                    actor: Some(Self::addr(raw.revoked_by)),
                    amount: Some(raw.amount_remaining.to_string()),
                    settlement_mode: None,
                }))
            }
            "FreeCreditExtended" => {
                let raw = bcs::from_bytes::<RawFreeCreditExtended>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "FreeCreditExtended".to_string(),
                    actor: Some(Self::addr(raw.extended_by)),
                    amount: Some(raw.new_expires_at.to_string()),
                    settlement_mode: None,
                }))
            }
            "SettlementModeChanged" => {
                let raw = bcs::from_bytes::<RawSettlementModeChanged>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "SettlementModeChanged".to_string(),
                    actor: None,
                    amount: None,
                    settlement_mode: Some(raw.new_mode),
                }))
            }
            "DappRevenueWithdrawn" => {
                let raw = bcs::from_bytes::<RawDappRevenueWithdrawn>(bytes)?;
                Ok(Event::DappRuntimeUpdate(DappRuntimeUpdate {
                    dapp_key: raw.dapp_key,
                    event_name: "DappRevenueWithdrawn".to_string(),
                    actor: Some(Self::addr(raw.admin)),
                    amount: Some(raw.amount.to_string()),
                    settlement_mode: None,
                }))
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

    fn convert_delete_field(raw: RawDeleteField) -> StoreDeleteField {
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

        StoreDeleteField {
            dapp_key: raw.dapp_key,
            table_id,
            key_tuple,
            field_name: String::from_utf8(raw.field_name).unwrap_or_default(),
        }
    }

    /// Convert a raw new-format SetField into the normalized indexer format.
    ///
    /// New format: { dapp_key, account, key=[table_name, ...user_keys], field_name, field_value }
    /// Normalized: { dapp_key, table_id=table_name, key_tuple=[entity_key, ...], field_name, value }
    fn convert_set_field(raw: RawSetField) -> StoreSetField {
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

        let field_name = String::from_utf8(raw.field_name).unwrap_or_default();

        StoreSetField {
            dapp_key: raw.dapp_key,
            table_id,
            key_tuple,
            field_name,
            value: raw.field_value,
        }
    }

    fn addr(addr: SuiAddress) -> String {
        addr.to_string()
    }

    fn bytes_hex(bytes: &[u8]) -> String {
        const HEX: &[u8; 16] = b"0123456789abcdef";
        let mut out = String::with_capacity(bytes.len() * 2 + 2);
        out.push_str("0x");
        for byte in bytes {
            out.push(HEX[(byte >> 4) as usize] as char);
            out.push(HEX[(byte & 0x0f) as usize] as char);
        }
        out
    }

    fn bytes_text(bytes: &[u8]) -> String {
        String::from_utf8(bytes.to_vec()).unwrap_or_default()
    }

    fn vec_bytes_json(values: &[Vec<u8>]) -> String {
        serde_json::to_string(
            &values
                .iter()
                .map(|bytes| Self::bytes_hex(bytes))
                .collect::<Vec<_>>(),
        )
        .unwrap_or_else(|_| "[]".to_string())
    }

    fn sql_string(value: &str) -> String {
        format!("'{}'", value.replace('\'', "''"))
    }

    fn sql_optional_string(value: Option<&str>) -> String {
        value
            .map(Self::sql_string)
            .unwrap_or_else(|| "NULL".to_string())
    }

    fn sql_optional_u64(value: Option<u64>) -> String {
        value
            .map(|v| v.to_string())
            .unwrap_or_else(|| "NULL".to_string())
    }

    fn convert_object_lifecycle(raw: RawObjectLifecycle) -> ObjectStorageLifecycle {
        ObjectStorageLifecycle {
            dapp_key: raw.dapp_key,
            object_type: raw.object_type,
            object_id: Self::addr(raw.object_id),
            entity_id: raw.entity_id,
        }
    }

    fn convert_permit_participant(
        raw: RawScenePermitParticipant,
        action: &str,
    ) -> ScenePermitParticipant {
        ScenePermitParticipant {
            dapp_key: raw.dapp_key,
            permit_type: raw.permit_type,
            permit_id: Self::addr(raw.permit_id),
            participant: Self::addr(raw.participant),
            action: action.to_string(),
        }
    }

    pub fn convert_indexer_event_to_sql(
        &self,
        current_checkpoint_timestamp_ms: u64,
        current_digest: &str,
        event_seq: u64,
    ) -> Result<String> {
        match self {
            Event::UserStorageCreated(event) => Ok(format!(
                "INSERT INTO user_storages (dapp_key, canonical_owner, user_storage_id, created_at_checkpoint, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {ts}, {ts}, {}, {seq}) ON CONFLICT (user_storage_id) DO UPDATE SET dapp_key = EXCLUDED.dapp_key, canonical_owner = EXCLUDED.canonical_owner, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&event.canonical_owner),
                Self::sql_string(&event.user_storage_id),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ObjectCreated(event) => Ok(format!(
                "INSERT INTO object_storages (dapp_key, object_type, object_type_raw, object_id, entity_id_raw, is_destroyed, created_at_checkpoint, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, FALSE, {ts}, {ts}, {}, {seq}) ON CONFLICT (object_id) DO UPDATE SET dapp_key = EXCLUDED.dapp_key, object_type = EXCLUDED.object_type, object_type_raw = EXCLUDED.object_type_raw, entity_id_raw = EXCLUDED.entity_id_raw, is_destroyed = FALSE, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&Self::bytes_text(&event.object_type)),
                Self::sql_string(&Self::bytes_hex(&event.object_type)),
                Self::sql_string(&event.object_id),
                Self::sql_string(&Self::bytes_hex(&event.entity_id)),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ObjectDestroyed(event) => Ok(format!(
                "UPDATE object_storages SET is_destroyed = TRUE, destroyed_at_checkpoint = {ts}, updated_at_checkpoint = {ts}, last_update_digest = {}, last_event_seq = {seq} WHERE object_id = {};",
                Self::sql_string(current_digest),
                Self::sql_string(&event.object_id),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ObjectSetField(event) => Ok(format!(
                "INSERT INTO object_storage_fields (dapp_key, object_type, object_type_raw, object_id, field_name, field_name_raw, field_value_raw, is_deleted, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {}, {}, FALSE, {ts}, {}, {seq}) ON CONFLICT (object_id, field_name_raw) DO UPDATE SET field_value_raw = EXCLUDED.field_value_raw, is_deleted = FALSE, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&Self::bytes_text(&event.object_type)),
                Self::sql_string(&Self::bytes_hex(&event.object_type)),
                Self::sql_string(&event.object_id),
                Self::sql_string(&Self::bytes_text(&event.field_name)),
                Self::sql_string(&Self::bytes_hex(&event.field_name)),
                Self::sql_string(&Self::bytes_hex(event.field_value.as_deref().unwrap_or_default())),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ObjectDeleteField(event) => Ok(format!(
                "UPDATE object_storage_fields SET is_deleted = TRUE, deleted_at_checkpoint = {ts}, updated_at_checkpoint = {ts}, last_update_digest = {}, last_event_seq = {seq} WHERE object_id = {} AND field_name_raw = {};",
                Self::sql_string(current_digest),
                Self::sql_string(&event.object_id),
                Self::sql_string(&Self::bytes_hex(&event.field_name)),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::SceneCreated(event) => Ok(format!(
                "INSERT INTO scene_storages (dapp_key, scene_type, scene_type_raw, scene_id, authorization_kind, authorization_kind_raw, authorized_permit_id, is_destroyed, created_at_checkpoint, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {}, {}, FALSE, {ts}, {ts}, {}, {seq}) ON CONFLICT (scene_id) DO UPDATE SET dapp_key = EXCLUDED.dapp_key, scene_type = EXCLUDED.scene_type, scene_type_raw = EXCLUDED.scene_type_raw, authorization_kind = EXCLUDED.authorization_kind, authorization_kind_raw = EXCLUDED.authorization_kind_raw, authorized_permit_id = EXCLUDED.authorized_permit_id, is_destroyed = FALSE, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&Self::bytes_text(&event.scene_type)),
                Self::sql_string(&Self::bytes_hex(&event.scene_type)),
                Self::sql_string(&event.scene_id),
                Self::sql_optional_string(event.authorization_kind.as_deref().map(Self::bytes_text).as_deref()),
                Self::sql_optional_string(event.authorization_kind.as_deref().map(Self::bytes_hex).as_deref()),
                Self::sql_optional_string(event.authorized_permit_id.as_deref()),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::SceneDestroyed(event) => Ok(format!(
                "UPDATE scene_storages SET is_destroyed = TRUE, destroyed_at_checkpoint = {ts}, updated_at_checkpoint = {ts}, last_update_digest = {}, last_event_seq = {seq} WHERE scene_id = {};",
                Self::sql_string(current_digest),
                Self::sql_string(&event.scene_id),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::SceneSetField(event) => Ok(format!(
                "INSERT INTO scene_storage_fields (dapp_key, scene_type, scene_type_raw, scene_id, field_name, field_name_raw, field_value_raw, is_deleted, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {}, {}, FALSE, {ts}, {}, {seq}) ON CONFLICT (scene_id, field_name_raw) DO UPDATE SET field_value_raw = EXCLUDED.field_value_raw, is_deleted = FALSE, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&Self::bytes_text(&event.scene_type)),
                Self::sql_string(&Self::bytes_hex(&event.scene_type)),
                Self::sql_string(&event.scene_id),
                Self::sql_string(&Self::bytes_text(&event.field_name)),
                Self::sql_string(&Self::bytes_hex(&event.field_name)),
                Self::sql_string(&Self::bytes_hex(event.field_value.as_deref().unwrap_or_default())),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::SceneDeleteField(event) => Ok(format!(
                "UPDATE scene_storage_fields SET is_deleted = TRUE, deleted_at_checkpoint = {ts}, updated_at_checkpoint = {ts}, last_update_digest = {}, last_event_seq = {seq} WHERE scene_id = {} AND field_name_raw = {};",
                Self::sql_string(current_digest),
                Self::sql_string(&event.scene_id),
                Self::sql_string(&Self::bytes_hex(&event.field_name)),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ScenePermitCreated(event) => Ok(format!(
                "INSERT INTO scene_permits (dapp_key, permit_type, permit_type_raw, permit_id, expires_at, invites_expire_at, max_participants, participant_count, expired, created_at_checkpoint, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {}, {}, {}, FALSE, {ts}, {ts}, {}, {seq}) ON CONFLICT (permit_id) DO UPDATE SET participant_count = EXCLUDED.participant_count, expired = FALSE, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&Self::bytes_text(&event.permit_type)),
                Self::sql_string(&Self::bytes_hex(&event.permit_type)),
                Self::sql_string(&event.permit_id),
                Self::sql_optional_u64(event.expires_at),
                Self::sql_optional_u64(event.invites_expire_at),
                Self::sql_optional_u64(event.max_participants),
                event.participant_count,
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ScenePermitAccept(event)
            | Event::ScenePermitJoin(event)
            | Event::ScenePermitLeave(event) => {
                let active = event.action != "leave";
                Ok(format!(
                    "INSERT INTO scene_permit_participants (dapp_key, permit_type, permit_type_raw, permit_id, participant, active, last_action, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {}, {}, {ts}, {}, {seq}) ON CONFLICT (permit_id, participant) DO UPDATE SET active = EXCLUDED.active, last_action = EXCLUDED.last_action, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                    Self::sql_string(&event.dapp_key),
                    Self::sql_string(&Self::bytes_text(&event.permit_type)),
                    Self::sql_string(&Self::bytes_hex(&event.permit_type)),
                    Self::sql_string(&event.permit_id),
                    Self::sql_string(&event.participant),
                    if active { "TRUE" } else { "FALSE" },
                    Self::sql_string(&event.action),
                    Self::sql_string(current_digest),
                    ts = current_checkpoint_timestamp_ms,
                    seq = event_seq,
                ))
            }
            Event::ScenePermitExpire(event) => Ok(format!(
                "UPDATE scene_permits SET expired = TRUE, expired_at_checkpoint = {ts}, updated_at_checkpoint = {ts}, last_update_digest = {}, last_event_seq = {seq} WHERE permit_id = {};",
                Self::sql_string(current_digest),
                Self::sql_string(&event.permit_id),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ItemListed(event) => Ok(format!(
                "INSERT INTO marketplace_listings (dapp_key, listing_id, seller, record_type, record_type_raw, record_key_raw, field_names_raw, record_data_raw, price, coin_type, is_fungible, listed_until, status, created_at_checkpoint, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, 'listed', {ts}, {ts}, {}, {seq}) ON CONFLICT (listing_id) DO UPDATE SET status = 'listed', updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&event.listing_id),
                Self::sql_string(&event.seller),
                Self::sql_string(&Self::bytes_text(&event.record_type)),
                Self::sql_string(&Self::bytes_hex(&event.record_type)),
                Self::sql_string(&Self::vec_bytes_json(&event.record_key)),
                Self::sql_string(&Self::vec_bytes_json(&event.field_names)),
                Self::sql_string(&Self::bytes_hex(&event.record_data)),
                event.price,
                Self::sql_string(&event.coin_type),
                if event.is_fungible { "TRUE" } else { "FALSE" },
                Self::sql_optional_u64(event.listed_until),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::ItemSold(event) | Event::ListingCancelled(event) | Event::ListingExpired(event) => {
                Ok(format!(
                    "UPDATE marketplace_listings SET status = {}, buyer = CASE WHEN {} = 'sold' THEN {} ELSE buyer END, updated_at_checkpoint = {ts}, last_update_digest = {}, last_event_seq = {seq} WHERE listing_id = {};",
                    Self::sql_string(&event.status),
                    Self::sql_string(&event.status),
                    Self::sql_string(&event.actor),
                    Self::sql_string(current_digest),
                    Self::sql_string(&event.listing_id),
                    ts = current_checkpoint_timestamp_ms,
                    seq = event_seq,
                ))
            }
            Event::DappCreated(event) => Ok(format!(
                "INSERT INTO dapp_runtime_state (dapp_key, admin, dapp_storage_id, created_at, created_at_checkpoint, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {ts}, {ts}, {}, {seq}) ON CONFLICT (dapp_key) DO UPDATE SET admin = EXCLUDED.admin, dapp_storage_id = EXCLUDED.dapp_storage_id, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&event.admin),
                Self::sql_string(&event.dapp_storage_id),
                event.created_at,
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::DappUpgraded(event) => Ok(format!(
                "INSERT INTO dapp_runtime_state (dapp_key, admin, package_id, version, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {ts}, {}, {seq}) ON CONFLICT (dapp_key) DO UPDATE SET admin = EXCLUDED.admin, package_id = EXCLUDED.package_id, version = EXCLUDED.version, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&event.admin),
                Self::sql_string(&event.new_package_id),
                event.new_version,
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::CreditRecharged(event) => Ok(format!(
                "INSERT INTO dapp_runtime_state (dapp_key, credit_pool, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {ts}, {}, {seq}) ON CONFLICT (dapp_key) DO UPDATE SET credit_pool = EXCLUDED.credit_pool, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&event.amount),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::SessionActivated(event) | Event::SessionDeactivated(event) => Ok(format!(
                "INSERT INTO sessions (dapp_key, canonical, session_wallet, expires_at, active, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {ts}, {}, {seq}) ON CONFLICT (dapp_key, canonical) DO UPDATE SET session_wallet = EXCLUDED.session_wallet, expires_at = EXCLUDED.expires_at, active = EXCLUDED.active, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                Self::sql_string(&event.canonical),
                Self::sql_string(&event.session_wallet),
                Self::sql_optional_u64(event.expires_at),
                if event.active { "TRUE" } else { "FALSE" },
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::DappPausedChanged(event) => Ok(format!(
                "INSERT INTO dapp_runtime_state (dapp_key, paused, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {ts}, {}, {seq}) ON CONFLICT (dapp_key) DO UPDATE SET paused = EXCLUDED.paused, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                if event.paused { "TRUE" } else { "FALSE" },
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            Event::DappRuntimeUpdate(event) => Ok(format!(
                "INSERT INTO dapp_runtime_state (dapp_key, settlement_mode, last_runtime_event, last_runtime_actor, last_runtime_amount, updated_at_checkpoint, last_update_digest, last_event_seq) VALUES ({}, {}, {}, {}, {}, {ts}, {}, {seq}) ON CONFLICT (dapp_key) DO UPDATE SET settlement_mode = COALESCE(EXCLUDED.settlement_mode, dapp_runtime_state.settlement_mode), last_runtime_event = EXCLUDED.last_runtime_event, last_runtime_actor = EXCLUDED.last_runtime_actor, last_runtime_amount = EXCLUDED.last_runtime_amount, updated_at_checkpoint = EXCLUDED.updated_at_checkpoint, last_update_digest = EXCLUDED.last_update_digest, last_event_seq = EXCLUDED.last_event_seq;",
                Self::sql_string(&event.dapp_key),
                event
                    .settlement_mode
                    .map(|mode| mode.to_string())
                    .unwrap_or_else(|| "NULL".to_string()),
                Self::sql_string(&event.event_name),
                Self::sql_optional_string(event.actor.as_deref()),
                Self::sql_optional_string(event.amount.as_deref()),
                Self::sql_string(current_digest),
                ts = current_checkpoint_timestamp_ms,
                seq = event_seq,
            )),
            _ => Err(anyhow::anyhow!(
                "schema-backed store event must be converted through DubheConfig"
            )),
        }
    }
}
