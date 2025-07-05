module counter::world {
    use std::string::String;
    use aptos_framework::account::{SignerCapability, create_signer_with_capability, get_signer_capability_address};
    use aptos_framework::account;
    use std::signer;
    
    friend counter::init;
    	friend counter::counter_schema;
	friend counter::deploy_hook;
    
    const VERSION: u64 = 1;

    /// Schema does not exist
    const ESchemaDoesNotExist: u64 = 0;
    /// Schema already exists
    const ESchemaAlreadyExists: u64 = 1;
    /// Not the right admin for this world
    const ENotAdmin: u64 = 2;
    /// Migration is not an upgrade
    const ENotUpgrade: u64 = 3;
    /// Calling functions from the wrong package version
    const EWrongVersion: u64 = 4;

    struct World has key {
        /// Deployer
        deployer: address,
        /// Name of the world
        name: String,
        /// Description of the world
        description: String,
        /// Resource Capability  of the world
        resource_cap: SignerCapability
    }

    public(friend) fun create(deployer_signer: &signer, name: String, description: String) {
        let deployer = signer::address_of(deployer_signer);
        let (_, resource_cap) = account::create_resource_account(deployer_signer, b"Examples");
        move_to(deployer_signer, World { deployer, name, description, resource_cap });
    }

    public(friend) fun resource_signer(): signer acquires World {
        let _dubhe_world = borrow_global_mut<World>(@counter);
        create_signer_with_capability(&_dubhe_world.resource_cap)
    }

    // ============================= View Function =============================

    #[view]
    public fun resource_address(): address acquires World {
        let _dubhe_world = borrow_global_mut<World>(@counter);
        get_signer_capability_address(&_dubhe_world.resource_cap)
    }

    #[view]
    public fun deployer_address(): address acquires World {
        let _dubhe_world = borrow_global_mut<World>(@counter);
        _dubhe_world.deployer
    }

    #[view]
    public fun info(): (String, String, address) acquires World {
        let _dubhe_world = borrow_global_mut<World>(@counter);
        (_dubhe_world.name, _dubhe_world.description, _dubhe_world.deployer)
    }
}
