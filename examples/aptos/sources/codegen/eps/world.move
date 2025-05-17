module examples::world {
    use std::string::String;
    use aptos_framework::account::{SignerCapability, create_signer_with_capability, get_signer_capability_address};
    use aptos_framework::account;
    use std::signer;
    
    friend examples::init;
	friend examples::single_column_schema;
	friend examples::multi_column_schema;
	friend examples::single_value_schema;
	friend examples::single_struct_schema;
	friend examples::deploy_hook;

    struct World has key {
        /// Deployer
        deployer: address,
        /// Name of the world
        name: String,
        /// Description of the world
        description: String,
        /// Resource Capability of the world
        resource_cap: SignerCapability
    }

    public(friend) fun create(deployer_signer: &signer, name: String, description: String) {
        let deployer = signer::address_of(deployer_signer);
        let (_, resource_cap) = account::create_resource_account(deployer_signer, b"examples");
        move_to(deployer_signer, World { deployer, name, description, resource_cap });
    }

    public(friend) fun resource_signer(): signer acquires World {
        let _dubhe_world = borrow_global_mut<World>(@examples);
        create_signer_with_capability(&_dubhe_world.resource_cap)
    }

    // ============================= View Function =============================

    #[view]
    public fun resource_address(): address acquires World {
        let _dubhe_world = borrow_global_mut<World>(@examples);
        get_signer_capability_address(&_dubhe_world.resource_cap)
    }

    #[view]
    public fun deployer_address(): address acquires World {
        let _dubhe_world = borrow_global_mut<World>(@examples);
        _dubhe_world.deployer
    }

    #[view]
    public fun info(): (String, String, address, address) acquires World {
        let _dubhe_world = borrow_global_mut<World>(@examples);
        (_dubhe_world.name, _dubhe_world.description, _dubhe_world.deployer, get_signer_capability_address(&_dubhe_world.resource_cap))
    }
}
