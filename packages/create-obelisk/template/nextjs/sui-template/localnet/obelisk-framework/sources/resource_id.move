module obelisk::resource_id {

    public fun encode(type_id: vector<u8>, namespace: vector<u8>, name: vector<u8>) : vector<u8> {
        let mut resource_id: vector<u8> = vector[];
        vector::append(&mut resource_id, type_id);
        vector::append(&mut resource_id, namespace);
        vector::append(&mut resource_id, name);
        resource_id
    }

    public fun offchain_schema() : vector<u8> {
        b"os"
    }

    public fun system() : vector<u8> {
        b"sy"
    }

    public fun namespace() : vector<u8> {
        b"ns"
    }
}