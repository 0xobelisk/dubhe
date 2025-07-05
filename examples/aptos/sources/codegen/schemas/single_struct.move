module examples::single_struct_schema {
	use std::string::{Self, String};
	use std::option::none;
    use std::signer::address_of;
    use examples::events;
    use examples::world;
    
    // Systems
	friend examples::example_system;
	friend examples::deploy_hook;

	// name
	// admin
	// fee
	struct SingleStructData has key {
		name: String,
		admin: address,
		fee: u64
	}

	struct SingleStructDataEvent has drop, store {
		name: String,
		admin: address,
		fee: u64
	}

	public fun new(name: String, admin: address, fee: u64): SingleStructData {
		SingleStructData {
			name, 
			admin, 
			fee
		}
	}

	public fun register(deployer: &signer) {
		assert!(address_of(deployer) == world::deployer_address(), 0);
		let _dubhe_schema = new(string::utf8(b"dubhe"),@0x1,100);
		let resource_signer = world::resource_signer();
		move_to(&resource_signer, _dubhe_schema)
	}

	public(friend) fun set( name: String, admin: address, fee: u64) acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.name = name;
		_dubhe_schema.admin = admin;
		_dubhe_schema.fee = fee;
		events::emit_set(schema_id(), schema_type(), none(), SingleStructDataEvent {  name, admin, fee });
	}

	public(friend) fun set_name(name: String) acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.name = name;
		events::emit_set(schema_id(), schema_type(), none(), SingleStructDataEvent {  name, admin: _dubhe_schema.admin, fee: _dubhe_schema.fee });
	}

	public(friend) fun set_admin(admin: address) acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.admin = admin;
		events::emit_set(schema_id(), schema_type(), none(), SingleStructDataEvent {  name: _dubhe_schema.name, admin, fee: _dubhe_schema.fee });
	}

	public(friend) fun set_fee(fee: u64) acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.fee = fee;
		events::emit_set(schema_id(), schema_type(), none(), SingleStructDataEvent {  name: _dubhe_schema.name, admin: _dubhe_schema.admin, fee });
	}

	#[view]
	public fun get(): (String,address,u64) acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SingleStructData>(_dubhe_resource_address);
		(
			_dubhe_schema.name,
			_dubhe_schema.admin,
			_dubhe_schema.fee,
		)
	}

	#[view]
	public fun get_name(): String acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.name
	}

	#[view]
	public fun get_admin(): address acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.admin
	}

	#[view]
	public fun get_fee(): u64 acquires SingleStructData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SingleStructData>(_dubhe_resource_address);
		_dubhe_schema.fee
	}

	#[view]
	public fun schema_id(): vector<u8> {
		b"single_struct"
	}

	#[view]
	public fun schema_type(): u8 {
		1
	}

}
