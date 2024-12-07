module dubhe::dapps_schema {
    use std::ascii::String;
    use dubhe::storage_value;
    use sui::balance::Balance;
    use sui::sui::SUI;
    use sui::balance;
    use dubhe::storage_value::StorageValue;
    use dubhe::storage_map;
    use sui::transfer::public_share_object;
    use dubhe::dapp_metadata::DappMetadata;
    use dubhe::storage_map::StorageMap;

    public struct Dapps has key, store {
        id: UID,
        admin: StorageMap<address, address>,
        version: StorageMap<address, u32>,
        metadata: StorageMap<address, DappMetadata>,
        schemas: StorageMap<address, vector<String>>,
        safe_mode: StorageMap<address, bool>,
        verified: StorageMap<address, bool>,
        reserved: StorageValue<Balance<SUI>>,
        reserve_amount: StorageValue<u64>,
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

    public(package) fun borrow_mut_verified(self: &mut Dapps): &mut StorageMap<address, bool> {
        &mut self.verified
    }

    public(package) fun borrow_mut_reserved(self: &mut Dapps): &mut StorageValue<Balance<SUI>> {
        &mut self.reserved
    }

    public(package) fun borrow_mut_reserve_amount(self: &mut Dapps): &mut StorageValue<u64> {
        &mut self.reserve_amount
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

    public fun borrow_verified(self: &mut Dapps): &StorageMap<address, bool> {
        &self.verified
    }

    public fun borrow_reserved(self: &mut Dapps): &StorageValue<Balance<SUI>> {
        &self.reserved
    }

    public fun borrow_reserve_amount(self: &mut Dapps): &StorageValue<u64> {
        &self.reserve_amount
    }

    fun init(ctx: &mut TxContext) {
        let mut reserved = storage_value::new();
        reserved.put(balance::zero());

        let mut reserve_amount = storage_value::new();
        reserve_amount.put(1_000_000_000);
        public_share_object(Dapps {
            id: object::new(ctx),
            admin: storage_map::new(),
            version: storage_map::new(),
            metadata: storage_map::new(),
            schemas: storage_map::new(),
            safe_mode: storage_map::new(),
            verified: storage_map::new(),
            reserved,
            reserve_amount
        });
    }

    #[test_only]
    public fun init_dapps_for_testing(ctx: &mut TxContext){
        init(ctx)
    }
}