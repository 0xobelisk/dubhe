module examples::single_value_schema {
    use std::ascii::{String, string};
    use sui::tx_context::TxContext;
    use sui::table::{Self, Table};
    use examples::entity_key;
    use examples::events;
    use examples::world::{Self, World};
  
    // Systems
	friend examples::example_system;

	/// Entity does not exist
	const EEntityDoesNotExist: u64 = 0;

	const NAME: vector<u8> = b"single_value";

	public fun id(): address {
		entity_key::from_bytes(NAME)
	}

	// value
	struct SingleValueData has copy , drop, store {
		value: u64
	}

	public fun new(value: u64): SingleValueData {
		SingleValueData {
			value
		}
	}

	struct SchemaMetadata has store {
		name: String,
		data: Table<address, SingleValueData>
	}

	public fun register(_obelisk_world: &mut World, ctx: &mut TxContext) {
		let _obelisk_schema = SchemaMetadata {
			name: string(NAME),
			data: table::new<address, SingleValueData>(ctx)
		};
		table::add(&mut _obelisk_schema.data, id(), new(1000));
		world::add_schema<SchemaMetadata>(_obelisk_world, NAME, _obelisk_schema);
		events::emit_set(string(NAME), id(), new(1000));
	}

	public(friend) fun set(_obelisk_world: &mut World,  value: u64) {
		let _obelisk_schema = world::get_mut_schema<SchemaMetadata>(_obelisk_world, id());
		let _obelisk_data = new(value);
		if(table::contains<address, SingleValueData>(&_obelisk_schema.data, id())) {
			*table::borrow_mut<address, SingleValueData>(&mut _obelisk_schema.data, id()) = _obelisk_data;
		} else {
			table::add(&mut _obelisk_schema.data, id(), _obelisk_data);
		};
		events::emit_set(string(NAME), id(), _obelisk_data)
	}


	public fun get(_obelisk_world: &World ,): u64 {
  		let _obelisk_schema = world::get_schema<SchemaMetadata>(_obelisk_world, id());
  		assert!(table::contains<address, SingleValueData>(&_obelisk_schema.data, id()), EEntityDoesNotExist);
		let _obelisk_data = table::borrow<address, SingleValueData>(&_obelisk_schema.data, id());
		(
			_obelisk_data.value
		)
	}




}
