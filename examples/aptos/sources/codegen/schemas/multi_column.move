module examples::multi_column_schema {
	use std::string::String;
	use std::option::some;
    use std::signer::address_of;
    use aptos_std::table::{Self, Table};
    use examples::events;
    use examples::world;

    // Systems
	friend examples::example_system;
	friend examples::deploy_hook;

	// state
	// last_update_time
	struct MultiColumnData has store  {
		state: String,
		last_update_time: u64
	}

	public fun new(state: String, last_update_time: u64): MultiColumnData {
		MultiColumnData {
			state, 
			last_update_time
		}
	}

	struct MultiColumnDataEvent has drop, store {
		state: String,
		last_update_time: u64
	}

	struct SchemaData has key {
		value: Table<address, MultiColumnData>
	}

	public fun register(deployer: &signer) {
		assert!(address_of(deployer) == world::deployer_address(), 0);
		let _dubhe_schema = SchemaData { value: table::new() };
		let resource_signer = world::resource_signer();
		move_to(&resource_signer, _dubhe_schema)
	}

	public(friend) fun set(_dubhe_entity_key: address,  state: String, last_update_time: u64) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
		if(table::contains<address, MultiColumnData>(&_dubhe_schema.value, _dubhe_entity_key)) {
			let _dubhe_data = table::borrow_mut<address, MultiColumnData>(&mut _dubhe_schema.value, _dubhe_entity_key);
			_dubhe_data.state = state;
			_dubhe_data.last_update_time = last_update_time;
		} else {
			table::add(&mut _dubhe_schema.value, _dubhe_entity_key, new( state, last_update_time));
		};
		events::emit_set(schema_id(), schema_type(), some(_dubhe_entity_key), MultiColumnDataEvent{  state, last_update_time });
	}

	public(friend) fun set_state(_dubhe_entity_key: address, state: String) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::borrow_mut<address, MultiColumnData>(&mut _dubhe_schema.value, _dubhe_entity_key);
		_dubhe_data.state = state;
		events::emit_set(schema_id(), schema_type(), some(_dubhe_entity_key), MultiColumnDataEvent{  state, last_update_time: _dubhe_data.last_update_time });
	}

	public(friend) fun set_last_update_time(_dubhe_entity_key: address, last_update_time: u64) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::borrow_mut<address, MultiColumnData>(&mut _dubhe_schema.value, _dubhe_entity_key);
		_dubhe_data.last_update_time = last_update_time;
		events::emit_set(schema_id(), schema_type(), some(_dubhe_entity_key), MultiColumnDataEvent{  state: _dubhe_data.state, last_update_time });
	}

	public(friend) fun remove(_dubhe_entity_key: address) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::remove(&mut _dubhe_schema.value, _dubhe_entity_key);
		events::emit_remove(schema_id(), _dubhe_entity_key);
		let MultiColumnData { state: _state,last_update_time: _last_update_time } = _dubhe_data;
	}

	#[view]
	public fun get(_dubhe_entity_key: address): (String,u64) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::borrow<address, MultiColumnData>(&_dubhe_schema.value, _dubhe_entity_key);
		(
			_dubhe_data.state,
			_dubhe_data.last_update_time
		)
	}

	#[view]
	public fun get_state(_dubhe_entity_key: address): String acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::borrow<address, MultiColumnData>(&_dubhe_schema.value, _dubhe_entity_key);
		_dubhe_data.state
	}

	#[view]
	public fun get_last_update_time(_dubhe_entity_key: address): u64 acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::borrow<address, MultiColumnData>(&_dubhe_schema.value, _dubhe_entity_key);
		_dubhe_data.last_update_time
	}

	#[view]
	public fun contains(_dubhe_entity_key: address): bool acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
		table::contains<address, MultiColumnData>(&_dubhe_schema.value, _dubhe_entity_key)
	}

	#[view]
	public fun schema_id(): vector<u8> {
		b"multi_column"
	}

	#[view]
	public fun schema_type(): u8 {
		0
	}
}
