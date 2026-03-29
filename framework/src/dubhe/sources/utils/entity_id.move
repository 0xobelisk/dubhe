module dubhe::entity_id {
    use sui::hash::keccak256;
    use sui::address;
    use std::ascii::{String};
    use std::bcs;

    /// Generate entity id from an object
    public fun from_object<T: key>(obj: &T): address {
        object::id_address(obj)
    }

    /// Generate entity id from bytes using keccak256 hash
    public fun from_bytes(bytes: vector<u8>): address {
        let hash_bytes = keccak256(&bytes);
        address::from_bytes(hash_bytes)
    }

    /// Generate entity id from address concatenated with seed string
    public fun from_address_with_seed(object_id: address, seed: String): address {
        let mut combined_bytes = vector::empty();
        combined_bytes.append(address::to_bytes(object_id));
        combined_bytes.append(seed.into_bytes());
        from_bytes(combined_bytes)
    }

    /// Generate entity id from address concatenated with u256 value
    public fun from_address_with_u256(object_id: address, x: u256): address {
        let mut combined_bytes = vector::empty();
        combined_bytes.append(address::to_bytes(object_id));
        let x_bytes = bcs::to_bytes(&x);
        combined_bytes.append(x_bytes);
        from_bytes(combined_bytes)
    }

    /// Generate entity id from u256 value (converts to address format)
    /// This uses BCS serialization to convert u256 to bytes, then hashes
    public fun from_u256(x: u256): address {
        let mut bytes = bcs::to_bytes(&x);
        // Add a suffix to make it more unique, similar to the Aptos example
        vector::append(&mut bytes, b"u256");
        from_bytes(bytes)
    }
}