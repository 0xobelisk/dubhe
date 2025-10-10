module dubhe::utils {
    use sui::hash::{blake2b256, keccak256};
    use sui::address;
    use std::ascii::{String};
    use std::type_name;
    use sui::coin::TreasuryCap;

    public fun asset_to_entity_id(name: String, asset_id: u256): address {
        let mut raw_bytes = vector::empty();
        raw_bytes.append(name.into_bytes());
        let asset_id_bytes = asset_id.to_string().into_bytes();
        raw_bytes.append(asset_id_bytes);
        let entity_id_bytes = blake2b256(&raw_bytes);
        address::from_bytes(entity_id_bytes)
    }

    public fun get_treasury_cap_key_address<CoinType>(): address {
        let cap_str = type_name::get<TreasuryCap<CoinType>>().into_string();
        let key = keccak256(&cap_str.into_bytes());
        address::from_bytes(key)
    }
}