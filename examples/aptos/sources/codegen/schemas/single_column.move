module examples::single_column_schema {
	use std::option::some;
    use std::signer::address_of;
    use aptos_std::table::{Self, Table};
    use examples::events;
    use examples::world;

    // Systems
	friend examples::example_system;
	friend examples::deploy_hook;

	// value
	struct SingleColumnData has store  {
		value: u64
	}

	public fun new(value: u64): SingleColumnData {
		SingleColumnData {
			value
		}
	}

	struct SingleColumnDataEvent has drop, store {
		value: u64
	}

	struct SchemaData has key {
		value: Table<address, SingleColumnData>
	}

	public fun register(deployer: &signer) {
		assert!(address_of(deployer) == world::deployer_address(), 0);
		let _dubhe_schema = SchemaData { value: table::new() };
		let resource_signer = world::resource_signer();
		move_to(&resource_signer, _dubhe_schema)
	}

	public(friend) fun set(_dubhe_entity_key: address,  value: u64) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
		if(table::contains<address, SingleColumnData>(&_dubhe_schema.value, _dubhe_entity_key)) {
			let _dubhe_data = table::borrow_mut<address, SingleColumnData>(&mut _dubhe_schema.value, _dubhe_entity_key);
			_dubhe_data.value = value;
		} else {
			table::add(&mut _dubhe_schema.value, _dubhe_entity_key, new( value));
		};
		events::emit_set(schema_id(), schema_type(), some(_dubhe_entity_key), SingleColumnDataEvent{  value });
	}

	public(friend) fun remove(_dubhe_entity_key: address) acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::remove(&mut _dubhe_schema.value, _dubhe_entity_key);
		events::emit_remove(schema_id(), _dubhe_entity_key);
		let SingleColumnData { value: _value } = _dubhe_data;
	}

	#[view]
	public fun get(_dubhe_entity_key: address): u64 acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
		let _dubhe_data = table::borrow<address, SingleColumnData>(&_dubhe_schema.value, _dubhe_entity_key);
		(
			_dubhe_data.value
		)
	}

	#[view]
	public fun contains(_dubhe_entity_key: address): bool acquires SchemaData {
		let _dubhe_resource_address = world::resource_address();
		let _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
		table::contains<address, SingleColumnData>(&_dubhe_schema.value, _dubhe_entity_key)
	}

	#[view]
	public fun schema_id(): vector<u8> {
		b"single_column"
	}

	#[view]
	public fun schema_type(): u8 {
		0
	}
}
