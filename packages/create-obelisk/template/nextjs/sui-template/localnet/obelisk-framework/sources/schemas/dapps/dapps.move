module obelisk::dapps_schema {
    use std::ascii::String;
    use obelisk::storage_map;
    use sui::transfer::public_share_object;
    use obelisk::dapp_metadata::DappMetadata;
    use obelisk::storage_map::StorageMap;

    public struct Dapps has key, store {
        id: UID,
        admin: StorageMap<address, address>,
        version: StorageMap<address, u32>,
        metadata: StorageMap<address, DappMetadata>,
        schemas: StorageMap<address, vector<String>>,
        safe_mode: StorageMap<address, bool>
    }


    public(package) fun borrow_mut_version(self: &mut Dapps): &mut StorageMap<address, u32> {
        &mut self.version
    }

    public(package) fun borrow_mut_admin(self: &mut Dapps): &mut StorageMap<address, address> {
        &mut self.admin
    }

    public(package) fun borrow_mut_metadata(self: &mut Dapps): &mut StorageMap<address, DappMetadata> {
        &mut self.metadata
    }

    public(package) fun borrow_mut_schemas(self: &mut Dapps): &mut StorageMap<address, vector<String>> {
        &mut self.schemas
    }

    public(package) fun borrow_mut_safe_mode(self: &mut Dapps): &mut StorageMap<address, bool> {
        &mut self.safe_mode
    }

    public fun borrow_admin(self: &Dapps): &StorageMap<address, address> {
        &self.admin
    }

    public fun borrow_version(self: &Dapps): &StorageMap<address, u32> {
        &self.version
    }

    public fun borrow_metadata(self: &Dapps): &StorageMap<address, DappMetadata> {
        &self.metadata
    }

    public fun borrow_schemas(self: &Dapps): &StorageMap<address, vector<String>> {
        &self.schemas
    }

    public fun borrow_safe_mode(self: &Dapps): &StorageMap<address, bool> {
        &self.safe_mode
    }

    fun init(ctx: &mut TxContext) {
        public_share_object(Dapps {
            id: object::new(ctx),
            admin: storage_map::new(),
            version: storage_map::new(),
            metadata: storage_map::new(),
            schemas: storage_map::new(),
            safe_mode: storage_map::new()
        });
    }

    #[test_only]
    public fun init_dapps_for_testing(ctx: &mut TxContext){
        init(ctx)
    }
}