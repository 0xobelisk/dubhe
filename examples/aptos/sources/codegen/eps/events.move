module examples::events {
    use std::option::Option;
    use aptos_framework::event;

    #[event]
    struct SchemaSetRecord<T: drop + store> has drop, store {
        _dubhe_schema_id: vector<u8>,
        _dubhe_schema_type: u8,
        _dubhe_entity_key: Option<address>,
        _dubhe_data: T
    }

    #[event]
    struct SchemaRemoveRecord has drop, store {
        _dubhe_schema_id: vector<u8>,
        _dubhe_entity_key: address
    }

    public fun emit_set<T: drop + store>(_dubhe_schema_id: vector<u8>, _dubhe_schema_type: u8, _dubhe_entity_key: Option<address>, _dubhe_data: T) {
        event::emit(SchemaSetRecord { _dubhe_schema_id, _dubhe_schema_type, _dubhe_entity_key, _dubhe_data });
    }

    public fun emit_remove(_dubhe_schema_id: vector<u8>, _dubhe_entity_key: address) {
        event::emit(SchemaRemoveRecord { _dubhe_schema_id, _dubhe_entity_key });
    }
}
