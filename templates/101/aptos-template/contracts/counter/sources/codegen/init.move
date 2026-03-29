module counter::init {
    use std::string;
    use counter::world;
	use counter::counter_schema;

    fun init_module(deployer: &signer) {
        world::create(deployer, string::utf8(b"Examples"), string::utf8(b"Examples"));
        
        // Add Schema
		counter_schema::register(deployer);
    }

    #[test_only]
    public fun init_world_for_test(deployer: &signer){
        init_module(deployer)
    }
}
