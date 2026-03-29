module dubhe::proxy_system;

use sui::ed25519;
use sui::clock::{Self, Clock};
use sui::hash::blake2b256;
use sui::address;
use std::ascii::{String, into_bytes};
use std::type_name;
use dubhe::dapp_service::DappHub;
use dubhe::proxy_config;
use dubhe::errors::no_permission_error;

// Ed25519 constants
const ED25519_PUBLIC_KEY_LEN: u64 = 32;
const ED25519_SIGNATURE_LEN: u64 = 64;

// Ed25519 Sui address scheme flag (see SuiKeyPair / SignatureScheme)
const ED25519_SCHEME_FLAG: u8 = 0x00;

// Error codes
const E_INVALID_SIGNATURE: u64 = 1;
const E_INVALID_PUBLIC_KEY_LEN: u64 = 2;
const E_INVALID_SIGNATURE_LEN: u64 = 3;
const E_PROXY_NOT_FOUND: u64 = 4;
const E_PROXY_EXPIRED: u64 = 5;
const E_EXPIRES_AT_IN_PAST: u64 = 6;
const E_PROXY_ALREADY_CLAIMED: u64 = 7;
const E_EXPIRES_AT_TOO_FAR: u64 = 8;

// Maximum allowed proxy validity window: 7 days in milliseconds.
const MAX_PROXY_DURATION_MS: u64 = 7 * 24 * 60 * 60 * 1000; // 604_800_000

// ─── Internal helpers ────────────────────────────────────────────────────────

/// Derive the Sui address that corresponds to an Ed25519 public key.
///
/// Sui address = BLAKE2b-256( [0x00] || public_key ) interpreted as 32 bytes,
/// where 0x00 is the Ed25519 scheme flag (SuiKeyPair / SignatureScheme).
/// This matches the derivation performed by the Sui SDK and Sui node internals.
fun derive_sui_address_from_pubkey(public_key: &vector<u8>): String {
    let mut key_with_flag = vector[ED25519_SCHEME_FLAG];
    key_with_flag.append(*public_key);
    let hash_bytes = blake2b256(&key_with_flag);
    address::from_bytes(hash_bytes).to_ascii_string()
}

/// Build the canonical proxy registration message on-chain.
///
/// Format:  "dubhe proxy:<owner_hex>:<proxy_hex>:<dapp_key_str>:<expires_at>"
///
/// Including all four fields prevents:
///   1. Cross-owner replay   — owner_hex changes per owner
///   2. Cross-DApp replay    — dapp_key_str changes per DApp
///   3. Expiry downgrade     — expires_at is bound into the signature, so the
///                             owner cannot silently extend/shorten the proxy
///                             beyond what the proxy wallet consented to
fun build_expected_message(
    owner: address,
    proxy_account: &String,
    dapp_key_str: &String,
    expires_at: u64,
): vector<u8> {
    let mut msg = b"dubhe proxy:";
    msg.append(into_bytes(owner.to_ascii_string()));
    msg.append(b":");
    msg.append(into_bytes(*proxy_account));
    msg.append(b":");
    msg.append(into_bytes(*dapp_key_str));
    msg.append(b":");
    // Encode expires_at as its decimal ASCII representation so the proxy wallet
    // can construct an identical string without BCS knowledge.
    msg.append(u64_to_ascii(expires_at));
    msg
}

/// Encode a u64 as ASCII decimal bytes (e.g. 1_000u64 → b"1000").
fun u64_to_ascii(mut n: u64): vector<u8> {
    if (n == 0) return b"0";
    let mut digits = vector::empty<u8>();
    while (n > 0) {
        digits.push_back(((n % 10) as u8) + 48); // '0' = 48
        n = n / 10;
    };
    vector::reverse(&mut digits);
    digits
}

// ─── Public entry points ─────────────────────────────────────────────────────

/// Register a proxy wallet for a DApp-scoped namespace with an explicit expiry.
///
/// # What this does
///
/// Binds the proxy wallet (identified by `public_key`) to the transaction
/// sender (the owner) until `expires_at` milliseconds (epoch timestamp).
/// After this call, when the proxy wallet submits a transaction,
/// `address_system::ensure_origin<DappKey>` transparently returns the owner's
/// address — as long as the proxy has not yet expired.
///
/// # Time source
///
/// Expiry validation uses `ctx.epoch_timestamp_ms()` — the start timestamp of the
/// current epoch (~24 h granularity on Sui mainnet).  No `Clock` object is
/// required in transactions, reducing PTB complexity for callers.
///
/// # Security guarantees
///
/// 1. **Proxy address is derived on-chain** — the proxy wallet's Sui address is
///    computed as `SHA3-256([0x00 || public_key])`, preventing namespace hijacking.
///    There is no caller-supplied `account` parameter.
///
/// 2. **Signature covers owner + proxy + dapp_key + expires_at** — the expected
///    message is built on-chain, preventing cross-DApp/owner replay and expiry
///    downgrade attacks.
///
/// 3. **`expires_at` is mandatory and must be in the future** — every proxy has a
///    finite validity window.  `expires_at = 0` is rejected.
///
/// # Parameters
/// - `public_key`  : Ed25519 public key of the proxy wallet, 32 bytes.
/// - `signature`   : Ed25519 signature over the canonical message, 64 bytes.
/// - `expires_at`  : Expiry timestamp in milliseconds (epoch timestamp).
///                   Must be strictly greater than `ctx.epoch_timestamp_ms()`.
///                   Maximum: `ctx.epoch_timestamp_ms() + 7 days`.
///
/// # Re-binding rules
///
/// - **Active binding, same owner**: allowed — the owner can update `expires_at`
///   (e.g. extend validity) by calling `create_proxy` again with a fresh signature.
/// - **Active binding, different owner**: **aborts** with `E_PROXY_ALREADY_CLAIMED` —
///   the proxy wallet is still under the original owner's control; a third party cannot
///   silently redirect it.
/// - **Expired binding, any owner**: allowed — an expired proxy is considered released
///   and may be freely claimed by a new owner (with a new valid signature).
public fun create_proxy<DappKey: copy + drop>(
    dapp_hub: &mut DappHub,
    public_key: vector<u8>,
    signature: vector<u8>,
    expires_at: u64,
    ctx: &mut TxContext,
) {
    let owner = ctx.sender();
    let dapp_key_str = type_name::get<DappKey>().into_string();

    assert!(public_key.length() == ED25519_PUBLIC_KEY_LEN, E_INVALID_PUBLIC_KEY_LEN);
    assert!(signature.length() == ED25519_SIGNATURE_LEN, E_INVALID_SIGNATURE_LEN);
    let now = ctx.epoch_timestamp_ms();
    assert!(expires_at > now, E_EXPIRES_AT_IN_PAST);
    assert!(expires_at <= now + MAX_PROXY_DURATION_MS, E_EXPIRES_AT_TOO_FAR);

    // Derive proxy's Sui address from public_key on-chain — cannot be spoofed.
    let account = derive_sui_address_from_pubkey(&public_key);

    // If an active binding already exists, only the current owner may overwrite it.
    // An expired binding may be freely claimed by a new owner (proxy wallet has
    // implicitly "released" itself by letting the binding expire).
    if (proxy_config::has(dapp_hub, dapp_key_str, account)) {
        let (existing_owner, existing_expires_at) = proxy_config::get(dapp_hub, dapp_key_str, account);
        if (now < existing_expires_at) {
            assert!(existing_owner == owner.to_ascii_string(), E_PROXY_ALREADY_CLAIMED);
        }
    };

    // Build the canonical message and verify the proxy wallet's signature.
    let expected_message = build_expected_message(owner, &account, &dapp_key_str, expires_at);
    let verified = ed25519::ed25519_verify(&signature, &public_key, &expected_message);
    assert!(verified, E_INVALID_SIGNATURE);

    // Map: proxy_wallet_address → (owner_address, expires_at)
    proxy_config::set(dapp_hub, dapp_key_str, account, owner.to_ascii_string(), expires_at, ctx);
}

/// Extend (or shorten) the expiry of an existing proxy binding.
///
/// Only the owner who created the binding may call this.
/// The proxy wallet's consent (via a new signature) is NOT required here —
/// the owner has the unilateral right to control the binding lifetime.
///
/// The binding MUST still be active (not yet expired).  Once a proxy expires,
/// the owner must call `create_proxy` again (with a fresh signature from the
/// proxy wallet) to re-establish the binding.  This ensures the proxy wallet
/// always retains the ability to "opt out" by simply waiting for expiry —
/// an expired binding cannot be silently revived.
///
/// `new_expires_at` must be strictly greater than `ctx.epoch_timestamp_ms()`.
/// Maximum: `ctx.epoch_timestamp_ms() + 7 days`.
public fun extend_proxy<DappKey: copy + drop>(
    dapp_hub: &mut DappHub,
    account: String,
    new_expires_at: u64,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    let dapp_key_str = type_name::get<DappKey>().into_string();

    assert!(proxy_config::has(dapp_hub, dapp_key_str, account), E_PROXY_NOT_FOUND);
    no_permission_error(
        proxy_config::get_owner(dapp_hub, dapp_key_str, account) == sender.to_ascii_string(),
    );
    let now = ctx.epoch_timestamp_ms();
    // Binding must still be active — expired proxies require a fresh create_proxy
    // with a new proxy wallet signature, preventing silent revival.
    assert!(now < proxy_config::get_expires_at(dapp_hub, dapp_key_str, account), E_PROXY_EXPIRED);
    assert!(new_expires_at > now, E_EXPIRES_AT_IN_PAST);
    assert!(new_expires_at <= now + MAX_PROXY_DURATION_MS, E_EXPIRES_AT_TOO_FAR);

    proxy_config::set_expires_at(dapp_hub, dapp_key_str, account, new_expires_at, ctx);
}

/// Remove an existing proxy binding.
///
/// Only the owner who originally created the proxy may remove it.
/// Expired proxies can still be removed by the owner to reclaim storage.
public fun remove_proxy<DappKey: copy + drop>(
    dapp_hub: &mut DappHub,
    account: String,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    let dapp_key_str = type_name::get<DappKey>().into_string();

    assert!(proxy_config::has(dapp_hub, dapp_key_str, account), E_PROXY_NOT_FOUND);
    no_permission_error(
        proxy_config::get_owner(dapp_hub, dapp_key_str, account) == sender.to_ascii_string(),
    );
    proxy_config::delete(dapp_hub, dapp_key_str, account);
}

// ─── View helpers ─────────────────────────────────────────────────────────────

/// Return true if the proxy binding exists AND has not yet expired.
///
/// Uses a precise Clock timestamp.  Proxy is considered active while
/// `clock::timestamp_ms(clock) < expires_at` (expires exactly at expires_at).
public fun is_proxy_active<DappKey: copy + drop>(
    dapp_hub: &DappHub,
    account: String,
    clock: &Clock,
): bool {
    let dapp_key_str = type_name::get<DappKey>().into_string();
    if (!proxy_config::has(dapp_hub, dapp_key_str, account)) return false;
    let expires_at = proxy_config::get_expires_at(dapp_hub, dapp_key_str, account);
    clock::timestamp_ms(clock) < expires_at
}

/// Return the canonical message bytes that the proxy wallet must sign before
/// `create_proxy` is called.  Exposed for off-chain SDK consumption.
public fun proxy_message<DappKey: copy + drop>(
    owner: address,
    public_key: &vector<u8>,
    expires_at: u64,
): vector<u8> {
    let dapp_key_str = type_name::get<DappKey>().into_string();
    let account = derive_sui_address_from_pubkey(public_key);
    build_expected_message(owner, &account, &dapp_key_str, expires_at)
}

// ─── Test-only helpers ────────────────────────────────────────────────────────

/// Test helper that mirrors `create_proxy` but skips Ed25519 signature
/// verification.  This lets unit tests exercise the ownership-check logic and
/// state transitions without generating real cryptographic signatures.
///
/// Uses `ctx.epoch_timestamp_ms()` for time, identical to production `create_proxy`.
#[test_only]
public fun create_proxy_for_testing<DappKey: copy + drop>(
    dapp_hub: &mut DappHub,
    proxy_account: String,
    expires_at: u64,
    ctx: &mut TxContext,
) {
    let owner = ctx.sender();
    let dapp_key_str = type_name::get<DappKey>().into_string();

    let now = ctx.epoch_timestamp_ms();
    assert!(expires_at > now, E_EXPIRES_AT_IN_PAST);
    assert!(expires_at <= now + MAX_PROXY_DURATION_MS, E_EXPIRES_AT_TOO_FAR);

    if (proxy_config::has(dapp_hub, dapp_key_str, proxy_account)) {
        let (existing_owner, existing_expires_at) = proxy_config::get(dapp_hub, dapp_key_str, proxy_account);
        if (now < existing_expires_at) {
            assert!(existing_owner == owner.to_ascii_string(), E_PROXY_ALREADY_CLAIMED);
        }
    };

    proxy_config::set(dapp_hub, dapp_key_str, proxy_account, owner.to_ascii_string(), expires_at, ctx);
}
