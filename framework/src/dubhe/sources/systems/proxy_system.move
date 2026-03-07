module dubhe::proxy_system;
use sui::ed25519;
use std::ascii::String;
use dubhe::address_system;
use dubhe::dapp_service::DappHub;
use dubhe::proxy_config;
use dubhe::dapp_key;
use std::type_name;
use sui::tx_context::TxContext;
use dubhe::errors::no_permission_error;

// Ed25519 requirements: public key 32 bytes, signature 64 bytes
const E_INVALID_SIGNATURE: u64 = 1;
const E_INVALID_PUBLIC_KEY_LEN: u64 = 2;
const E_INVALID_SIGNATURE_LEN: u64 = 3;
const E_PROXY_NOT_FOUND: u64 = 4;
const ED25519_PUBLIC_KEY_LEN: u64 = 32;
const ED25519_SIGNATURE_LEN: u64 = 64;

/// Register proxy address: only when a valid signature corresponding to the proxy public key is provided, the proxy can be bound to the current transaction initiator.
/// This ensures that the "proxy address" is indeed controlled by the current owner.
///
/// Parameters:
/// - account: proxy identity display string (suggested to use the hex of the public key, consistent with public_key), will be written to storage
/// - public_key: Ed25519 public key, 32 bytes (used for verification)
/// - message: client signed original text, suggested to include "dubhe proxy" + owner address + dapp_key, to prevent replay
/// - signature: Ed25519 signature of message, 64 bytes (used to sign with the corresponding private key of the public key)
public fun create_proxy<DappKey: copy + drop>(
      dapp_hub: &mut DappHub,
      account: String,
      public_key: vector<u8>,
      message: vector<u8>,
      signature: vector<u8>,
      ctx: &mut TxContext
) {
  let sender = ctx.sender();
  let dapp_key = type_name::get<DappKey>().into_string();

  assert!(vector::length(&public_key) == ED25519_PUBLIC_KEY_LEN, E_INVALID_PUBLIC_KEY_LEN);
  assert!(vector::length(&signature) == ED25519_SIGNATURE_LEN, E_INVALID_SIGNATURE_LEN);

  let verified = ed25519::ed25519_verify(&signature,  &public_key, &message);
  assert!(verified, E_INVALID_SIGNATURE);

  proxy_config::set(dapp_hub, dapp_key, account, sender.to_ascii_string(), ctx);
}


public fun remove_proxy<DappKey: copy + drop>(
      dapp_hub: &mut DappHub,
      account: String,
      ctx: &mut TxContext
) {
  let sender = ctx.sender();
  let dapp_key = type_name::get<DappKey>().into_string();
  assert!(proxy_config::has(dapp_hub, dapp_key, account), E_PROXY_NOT_FOUND);
  no_permission_error(proxy_config::get(dapp_hub, dapp_key, account) == sender.to_ascii_string());
  proxy_config::delete(dapp_hub, dapp_key, account);
}