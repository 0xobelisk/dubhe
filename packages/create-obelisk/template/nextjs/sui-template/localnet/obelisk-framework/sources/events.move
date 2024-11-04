module obelisk::events {
    use sui::event;

    public struct SchemaSetRecord<T: copy + drop> has copy, drop {
        _obelisk_schema_id: vector<u8>,
        _obelisk_schema_type: u8,
        _obelisk_entity_key: Option<address>,
        data: T
    }

    public struct SchemaRemoveRecord has copy, drop {
        _obelisk_schema_id: vector<u8>,
        _obelisk_entity_key: address
    }

    public fun emit_set<T: copy + drop>(_obelisk_schema_id: vector<u8>, _obelisk_schema_type: u8, _obelisk_entity_key: Option<address>, data: T) {
        event::emit(SchemaSetRecord { _obelisk_schema_id, _obelisk_schema_type, _obelisk_entity_key, data})
    }

    public fun emit_remove(_obelisk_schema_id: vector<u8>, _obelisk_entity_key: address) {
        event::emit(SchemaRemoveRecord { _obelisk_schema_id, _obelisk_entity_key })
    }
}
