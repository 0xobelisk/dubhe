module dubhe::entity_id {
    use sui::hash::{blake2b256, keccak256};
    use sui::address;
    use std::ascii::{String};
    use std::vector;
    use std::bcs;
    use sui::object::{Self};

    public fun asset_to_entity_id(name: String, asset_id: u256): address {
        let mut raw_bytes = vector::empty();
        raw_bytes.append(name.into_bytes());
        let asset_id_bytes = asset_id.to_string().into_bytes();
        raw_bytes.append(asset_id_bytes);
        let entity_id_bytes = blake2b256(&raw_bytes);
        address::from_bytes(entity_id_bytes)
    }

    /// Generate entity key from an object
    public fun object_address<T:key>(obj: &T): address {
        object::id_address(obj)
    }

    /// Generate entity key from bytes using keccak256 hash
    public fun entity_key_from_bytes(bytes: vector<u8>): address {
        let hash_bytes = keccak256(&bytes);
        address::from_bytes(hash_bytes)
    }

    /// Generate entity key from address concatenated with seed string
    public fun entity_key_from_address_with_seed(object_id: address, seed: String): address {
        let mut combined_bytes = vector::empty();
        combined_bytes.append(address::to_bytes(object_id));
        combined_bytes.append(seed.into_bytes());
        entity_key_from_bytes(combined_bytes)
    }

    /// Generate entity key from address concatenated with u256 value
    public fun entity_key_from_address_with_u256(object_id: address, x: u256): address {
        let mut combined_bytes = vector::empty();
        combined_bytes.append(address::to_bytes(object_id));
        let x_bytes = bcs::to_bytes(&x);
        combined_bytes.append(x_bytes);
        entity_key_from_bytes(combined_bytes)
    }

    /// Generate entity key from u256 value (converts to address format)
    /// This uses BCS serialization to convert u256 to bytes, then hashes
    public fun entity_key_from_u256(x: u256): address {
        let mut bytes = bcs::to_bytes(&x);
        // Add a suffix to make it more unique, similar to the Aptos example
        vector::append(&mut bytes, b"u256");
        entity_key_from_bytes(bytes)
    }
}