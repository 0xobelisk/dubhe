module dubhe::storage {
    use sui::dynamic_field as df;

    public fun add_field<StorageType: store>(uid: &mut UID, field_name: vector<u8>, storage_type: StorageType) {
        df::add(uid, field_name, storage_type);
    }

    public fun borrow_field<StorageType: store>(uid: &UID, field_name: vector<u8>): &StorageType {
        df::borrow(uid, field_name)
    }

    public fun borrow_mut_field<StorageType: store>(uid: &mut UID, field_name: vector<u8>): &mut StorageType {
        df::borrow_mut(uid, field_name)
    }

    public fun field_exists(uid: &UID, field_name: vector<u8>): bool {
        df::exists_(uid, field_name)
    }
}