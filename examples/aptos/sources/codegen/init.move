module examples::init {
    use std::string;
    use examples::world;
	use examples::single_column_schema;
	use examples::multi_column_schema;
	use examples::single_value_schema;
	use examples::single_struct_schema;

    fun init_module(deployer: &signer) {
        world::create(deployer, string::utf8(b"examples"), string::utf8(b"examples"));
        
        // Add Schema
		single_column_schema::register(deployer);
		multi_column_schema::register(deployer);
		single_value_schema::register(deployer);
		single_struct_schema::register(deployer);
    }

    #[test_only]
    public fun init_world_for_test(deployer: &signer){
        init_module(deployer)
    }
}
