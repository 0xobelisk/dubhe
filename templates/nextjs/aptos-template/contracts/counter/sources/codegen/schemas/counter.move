module counter::counter_schema {
	use std::option::none;
    use std::signer::address_of;
    use counter::events;
    use counter::world;
    
    // Systems
	friend counter::counter_system;
	friend counter::deploy_hook;

	// value
	struct CounterData has key {
		value: u64
	}

	struct CounterDataEvent has drop, store {
		value: u64
	}

	public fun new(value: u64): CounterData {
		CounterData {
			value
		}
	}

	public fun register(deployer: &signer) {
		assert!(address_of(deployer) == world::deployer_address(), 0);
		let _dubhe_schema = new(0);
		let resource_signer = world::resource_signer();
		move_to(&resource_signer, _dubhe_schema)
	}

	public(friend) fun set( value: u64) acquires CounterData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<CounterData>(_dubhe_resource_address);
		_dubhe_schema.value = value;
		events::emit_set(schema_id(), schema_type(), none(), CounterDataEvent {  value });
	}

#[view]
	public fun get(): u64 acquires CounterData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<CounterData>(_dubhe_resource_address);
		(
			_dubhe_schema.value
		)
	}

	#[view]
	public fun schema_id(): vector<u8> {
		b"counter"
	}

	#[view]
	public fun schema_type(): u8 {
		1
	}

}
