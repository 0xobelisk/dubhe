module examples::ephemeral_schema {
	use std::string::String;
	use std::option::none;
    use examples::events;
    
	// state
	// level
	struct EphemeralData has store , drop {
		state: String,
		level: u64
	}
 
	public fun new(state: String, level: u64): EphemeralData {
		EphemeralData {
			state, 
			level
		}
	}
 
	public fun emit_ephemeral( state: String, level: u64) {
		events::emit_set(schema_id(), schema_type(), none(), new( state, level))
	}

	#[view]
	public fun schema_id(): vector<u8> {
		b"ephemeral"
	}

	#[view]
	public fun schema_type(): u8 {
		2
	}
}