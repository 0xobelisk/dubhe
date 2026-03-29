module dubhe::dubhe_events;

use sui::event;
use std::ascii::String;


public struct Dubhe_Store_SetRecord has copy, drop {
      dapp_key: String,
      account: String,
      key: vector<vector<u8>>,
      value: vector<vector<u8>>
}

public struct Dubhe_Store_SetRecord_Subject has copy, drop {
      dapp_key: String,
      account: String,
      subject_kind: u8,
      subject_chain_id: u64,
      subject_raw: vector<u8>,
      key: vector<vector<u8>>,
      value: vector<vector<u8>>
}

public(package) fun new_store_set_record(dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>>): Dubhe_Store_SetRecord {
      Dubhe_Store_SetRecord {
            dapp_key,
            account,
            key,
            value
      }
}

/// Only dapp_service (same package) may emit storage events.
/// Making this package-internal prevents any external module from forging
/// arbitrary SetRecord events to poison the off-chain indexer.
public(package) fun emit_store_set_record(dapp_key: String, account: String, key: vector<vector<u8>>, value: vector<vector<u8>>) {
      event::emit(new_store_set_record(dapp_key, account, key, value));
}

public fun new_store_set_record_subject(
      dapp_key: String,
      account: String,
      subject_kind: u8,
      subject_chain_id: u64,
      subject_raw: vector<u8>,
      key: vector<vector<u8>>,
      value: vector<vector<u8>>
): Dubhe_Store_SetRecord_Subject {
      Dubhe_Store_SetRecord_Subject {
            dapp_key,
            account,
            subject_kind,
            subject_chain_id,
            subject_raw,
            key,
            value
      }
}

public fun emit_store_set_record_subject(
      dapp_key: String,
      account: String,
      subject_kind: u8,
      subject_chain_id: u64,
      subject_raw: vector<u8>,
      key: vector<vector<u8>>,
      value: vector<vector<u8>>
) {
      event::emit(new_store_set_record_subject(
            dapp_key,
            account,
            subject_kind,
            subject_chain_id,
            subject_raw,
            key,
            value
      ));
}

public struct Dubhe_Store_DeleteRecord has copy, drop {
      dapp_key: String,
      account: String,
      key: vector<vector<u8>>
}

public struct Dubhe_Store_DeleteRecord_Subject has copy, drop {
      dapp_key: String,
      account: String,
      subject_kind: u8,
      subject_chain_id: u64,
      subject_raw: vector<u8>,
      key: vector<vector<u8>>
}

public(package) fun new_store_delete_record(dapp_key: String, account: String, key: vector<vector<u8>>): Dubhe_Store_DeleteRecord {
      Dubhe_Store_DeleteRecord {
            dapp_key,
            account,
            key
      }
}

/// Only dapp_service (same package) may emit storage events.
public(package) fun emit_store_delete_record(dapp_key: String, account: String, key: vector<vector<u8>>) {
      event::emit(new_store_delete_record(dapp_key, account, key));
}

public fun new_store_delete_record_subject(
      dapp_key: String,
      account: String,
      subject_kind: u8,
      subject_chain_id: u64,
      subject_raw: vector<u8>,
      key: vector<vector<u8>>
): Dubhe_Store_DeleteRecord_Subject {
      Dubhe_Store_DeleteRecord_Subject {
            dapp_key,
            account,
            subject_kind,
            subject_chain_id,
            subject_raw,
            key
      }
}

public fun emit_store_delete_record_subject(
      dapp_key: String,
      account: String,
      subject_kind: u8,
      subject_chain_id: u64,
      subject_raw: vector<u8>,
      key: vector<vector<u8>>
) {
      event::emit(new_store_delete_record_subject(
            dapp_key,
            account,
            subject_kind,
            subject_chain_id,
            subject_raw,
            key
      ));
}
