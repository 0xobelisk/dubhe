module examples::single_value_schema {
	use std::option::none;
    use std::signer::address_of;
    use examples::events;
    use examples::world;
    
    // Systems
	friend examples::example_system;
	friend examples::deploy_hook;

	// value
	struct SingleValueData has key {
		value: u64
	}

	struct SingleValueDataEvent has drop, store {
		value: u64
	}

	public fun new(value: u64): SingleValueData {
		SingleValueData {
			value
		}
	}

	public fun register(deployer: &signer) {
		assert!(address_of(deployer) == world::deployer_address(), 0);
		let _dubhe_schema = new(1000);
		let resource_signer = world::resource_signer();
		move_to(&resource_signer, _dubhe_schema)
	}

	public(friend) fun set( value: u64) acquires SingleValueData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SingleValueData>(_dubhe_resource_address);
		_dubhe_schema.value = value;
		events::emit_set(schema_id(), schema_type(), none(), SingleValueDataEvent {  value });
	}

	#[view]
	public fun get(): u64 acquires SingleValueData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SingleValueData>(_dubhe_resource_address);
		(
			_dubhe_schema.value
		)
	}

	#[view]
	public fun schema_id(): vector<u8> {
		b"single_value"
	}

	#[view]
	public fun schema_type(): u8 {
		1
	}

}
