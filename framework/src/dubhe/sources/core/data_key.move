module dubhe::data_key;

public struct DataKey has key, store { id: UID }

public(package) fun new(ctx: &mut TxContext): DataKey {
    DataKey { id: object::new(ctx) }
}