module dubhe::address_system;

use std::ascii::String;
use sui::address;
use sui::hex;

#[test_only]
use sui::test_scenario;

// TX_HASH signature markers
const DUBHE_PREFIX: u8 = 0xDB;
const DUBHE_VERSION: u8 = 0x01;
const CHAIN_TYPE_EVM: u8 = 0xE1;
const CHAIN_TYPE_SOLANA: u8 = 0xE2;

// Constants
const TX_HASH_LENGTH: u64 = 32;
const SOLANA_ADDRESS_LENGTH: u64 = 32;
const EVM_ADDRESS_LENGTH: u64 = 20;

// Error codes
const E_INVALID_EVM_ADDRESS: u64 = 1;
const E_INVALID_SOLANA_ADDRESS: u64 = 2;

/// Detect chain type from tx_hash signature
/// Returns: 0 = SUI, 1 = EVM, 2 = Solana
/// Format: [0xDB][0xDB][0x01][CHAIN_TYPE][...28 bytes...]
fun detect_chain_type_from_tx_hash(tx_hash: &vector<u8>): u8 {
    if (tx_hash.length() != TX_HASH_LENGTH || 
        tx_hash[0] != DUBHE_PREFIX || 
        tx_hash[1] != DUBHE_PREFIX ||
        tx_hash[2] != DUBHE_VERSION) {
        return 0
    };
    
    let chain_type = tx_hash[3];
    if (chain_type == CHAIN_TYPE_EVM) {
        1
    } else if (chain_type == CHAIN_TYPE_SOLANA) {
        2
    } else {
        0
    }
}

fun hex_string_to_bytes(hex_str: String): vector<u8> {
    let bytes = hex_str.into_bytes();
    let hex_bytes = if (bytes.length() >= 2 && bytes[0] == 48 && (bytes[1] == 120 || bytes[1] == 88)) {
        let mut result = vector[];
        let mut i = 2;
        while (i < bytes.length()) {
            result.push_back(bytes[i]);
            i = i + 1;
        };
        result
    } else {
        bytes
    };
    hex::decode(hex_bytes)
}

fun base58_decode(input: String): vector<u8> {
    let base58_alphabet = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let input_bytes = input.as_bytes();
    let len = input_bytes.length();
    
    let mut result: vector<u8> = vector[];
    let mut j = 0;
    while (j < SOLANA_ADDRESS_LENGTH) {
        result.push_back(0u8);
        j = j + 1;
    };
    
    let mut i = 0;
    while (i < len) {
        let c = input_bytes[i];
        let mut char_value: u64 = 0;
        let mut found = false;
        let mut k = 0;
        while (k < 58) {
            if (base58_alphabet[k] == c) {
                char_value = k;
                found = true;
                break
            };
            k = k + 1;
        };
        
        assert!(found, E_INVALID_SOLANA_ADDRESS);
        
        let mut carry = char_value;
        let mut m = (SOLANA_ADDRESS_LENGTH - 1);
        while (m < SOLANA_ADDRESS_LENGTH) {
            let byte_ref = vector::borrow_mut(&mut result, m);
            let tmp = (*byte_ref as u64) * 58 + carry;
            carry = tmp / 256;
            *byte_ref = ((tmp % 256) as u8);
            if (m == 0) break;
            m = m - 1;
        };
        i = i + 1;
    };
    result
}

/// Convert EVM address to SUI address
/// Format: [12 zero bytes][20 bytes EVM address]
public fun evm_to_sui(evm_address_str: String): address {
    let evm_bytes = hex_string_to_bytes(evm_address_str);
    assert!(evm_bytes.length() == EVM_ADDRESS_LENGTH, E_INVALID_EVM_ADDRESS);
    
    let mut sui_bytes = vector[];
    let mut i = 0;
    while (i < 12) {
        sui_bytes.push_back(0u8);
        i = i + 1;
    };
    sui_bytes.append(evm_bytes);
    address::from_bytes(sui_bytes)
}

/// Convert Solana address to SUI address
/// Direct use of 32 bytes from Base58 decode
public fun solana_to_sui(solana_address_str: String): address {
    let solana_bytes = base58_decode(solana_address_str);
    assert!(solana_bytes.length() == SOLANA_ADDRESS_LENGTH, E_INVALID_SOLANA_ADDRESS);
    address::from_bytes(solana_bytes)
}

fun base58_encode(input: vector<u8>): String {
    let base58_alphabet = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let mut result = vector::empty<u8>();
    let mut num = input;
    
    let mut leading_zeros = 0;
    let mut i = 0;
    while (i < num.length()) {
        if (num[i] == 0) {
            leading_zeros = leading_zeros + 1;
            i = i + 1;
        } else {
            break
        }
    };
    
    while (!is_zero(&num)) {
        let remainder = div_mod_58(&mut num);
        result.push_back(base58_alphabet[remainder]);
    };
    
    let mut j = 0;
    while (j < leading_zeros) {
        result.push_back(49);
        j = j + 1;
    };
    
    vector::reverse(&mut result);
    result.to_ascii_string()
}

fun is_zero(num: &vector<u8>): bool {
    let mut i = 0;
    while (i < num.length()) {
        if (num[i] != 0) {
            return false
        };
        i = i + 1;
    };
    true
}

fun div_mod_58(num: &mut vector<u8>): u64 {
    let mut remainder: u64 = 0;
    let mut i = 0;
    while (i < num.length()) {
        let byte_ref = vector::borrow_mut(num, i);
        let current = (remainder * 256) + (*byte_ref as u64);
        *byte_ref = ((current / 58) as u8);
        remainder = current % 58;
        i = i + 1;
    };
    remainder
}

/// Get original address format based on tx_hash detection
/// Returns: EVM (hex without 0x), Solana (Base58), or SUI (hex without 0x) format
public fun ensure_origin(ctx: &TxContext): String { 
    let sui_address = ctx.sender();
    let address_bytes = address::to_bytes(sui_address);
    let tx_hash = ctx.digest();
    let chain_type = detect_chain_type_from_tx_hash(tx_hash);
    
    if (chain_type == 1) {
        let mut evm_bytes = vector[];
        let mut j = 12;
        while (j < TX_HASH_LENGTH) {
            evm_bytes.push_back(address_bytes[j]);
            j = j + 1;
        };
        let hex_bytes = hex::encode(evm_bytes);
        hex_bytes.to_ascii_string()
    } else if (chain_type == 2) {
        base58_encode(address_bytes)
    } else {
        let hex_bytes = hex::encode(address_bytes);
        hex_bytes.to_ascii_string()
    }
}

/// Check if transaction is from EVM chain
public fun is_evm_address(ctx: &TxContext): bool {
    let tx_hash = ctx.digest();
    detect_chain_type_from_tx_hash(tx_hash) == 1
}

/// Check if transaction is from Solana
public fun is_solana_address(ctx: &TxContext): bool {
    let tx_hash = ctx.digest();
    detect_chain_type_from_tx_hash(tx_hash) == 2
}

/// Check if transaction is native SUI
public fun is_sui_address(ctx: &TxContext): bool {
    let tx_hash = ctx.digest();
    detect_chain_type_from_tx_hash(tx_hash) == 0
}

// ========== Test Utilities ==========

#[test_only]
/// Setup test scenario with EVM context
/// Input: EVM address as byte string, e.g., b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622"
/// Format: [0xDB][0xDB][0x01][0xE1][...28 bytes...]
public fun setup_evm_scenario(scenario: &mut test_scenario::Scenario, evm_address_bytes: vector<u8>) {
    use std::ascii;
    
    // Convert EVM address string to SUI address
    let evm_address_str = ascii::string(evm_address_bytes);
    let sender = evm_to_sui(evm_address_str);
    
    // Generate EVM tx_hash with Dubhe prefix at the beginning
    let mut tx_hash = vector::empty<u8>();
    
    // Mark as EVM with Dubhe prefix, version, and chain type
    tx_hash.push_back(DUBHE_PREFIX);    // 0xDB
    tx_hash.push_back(DUBHE_PREFIX);    // 0xDB
    tx_hash.push_back(DUBHE_VERSION);   // 0x01
    tx_hash.push_back(CHAIN_TYPE_EVM);  // 0xE1
    
    // Fill remaining 28 bytes
    let mut i = 0;
    while (i < 28) {
        tx_hash.push_back((i as u8));
        i = i + 1;
    };
    
    // Set context
    let ctx = test_scenario::ctx(scenario);
    *ctx = tx_context::new(sender, tx_hash, 0, 0, 0);
}

#[test_only]
/// Setup test scenario with Solana context
/// Input: Solana address as byte string, e.g., b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L"
/// Format: [0xDB][0xDB][0x01][0xE2][...28 bytes...]
public fun setup_solana_scenario(scenario: &mut test_scenario::Scenario, solana_address_bytes: vector<u8>) {
    use std::ascii;
    
    // Convert Solana address string to SUI address
    let solana_address_str = ascii::string(solana_address_bytes);
    let sender = solana_to_sui(solana_address_str);
    
    // Generate Solana tx_hash with Dubhe prefix at the beginning
    let mut tx_hash = vector::empty<u8>();
    
    // Mark as Solana with Dubhe prefix, version, and chain type
    tx_hash.push_back(DUBHE_PREFIX);       // 0xDB
    tx_hash.push_back(DUBHE_PREFIX);       // 0xDB
    tx_hash.push_back(DUBHE_VERSION);      // 0x01
    tx_hash.push_back(CHAIN_TYPE_SOLANA);  // 0xE2
    
    // Fill remaining 28 bytes
    let mut i = 0;
    while (i < 28) {
        tx_hash.push_back(((i + 100) as u8));
        i = i + 1;
    };
    
    // Set context
    let ctx = test_scenario::ctx(scenario);
    *ctx = tx_context::new(sender, tx_hash, 0, 0, 0);
}