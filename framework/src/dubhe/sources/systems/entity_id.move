module dubhe::entity_id {
    use sui::hash::blake2b256;
    use sui::address;
    use std::ascii::{String};

    public fun asset_to_entity_id(name: String, asset_id: u256): address {
        let mut raw_bytes = vector::empty();
        raw_bytes.append(name.into_bytes());
        let asset_id_bytes = asset_id.to_string().into_bytes();
        raw_bytes.append(asset_id_bytes);
        let entity_id_bytes = blake2b256(&raw_bytes);
        address::from_bytes(entity_id_bytes)
    }
}