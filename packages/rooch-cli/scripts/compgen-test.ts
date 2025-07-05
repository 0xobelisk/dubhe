import { formatAndWriteMove } from '@0xobelisk/sui-common';

type SchemaMapType = Record<string, string>;
type SchemaValueType = string;

type ConfigDataType = Record<string, string>;

type DubheConfig = {
	name: string;
	systems: string[];
	schemas: Record<string, SchemaMapType | SchemaValueType>;
	// genesis_config: {
	//   admin: {
	//     type: "address",
	//     value: "0x1"
	//   },
	//   world_info: {
	//     type: {
	//       name: "String",
	//       description: "String",
	//       birth_time: "u64",
	//     },
	//     value: {
	//       name: "Crypto Pet",
	//       description: "Crypto Pet",
	//       birth_time: "auto",
	//     }
	//   },
	//   fee: {
	//     type: "Table<vector<u8>,u64>",
	//     value: [
	//       {
	//         clean: "1000000"
	//       },
	//       {
	//         paly: "1000000"
	//       },
	//     ]
	//   },
	// }
};

async function init() {
	let config = {
		name: 'withinfinity',
		systems: ['fee_system', 'home_system', 'pet_system', 'state_system'],
		schemas: {
			// Key - Struct value
			level: {
				hunger: 'u64',
				cleanliness: 'u64',
				mood: 'u64',
				level: 'u64',
			},
			// Key - Struct value
			state: {
				state: 'vector<u8>',
				last_update_time: 'u64',
			},
			// Key - Single value
			suifren: 'bool',
		},
	} as DubheConfig;

	let output = `module eps::entity {
    use sui::bag::Bag;
    use sui::bag;
    use sui::tx_context::TxContext;

    struct Entity has store  {
        schemas: Bag
    }

    public fun create_entity(ctx: &mut TxContext): Entity {
        Entity {
            schemas: bag::new(ctx)
        }
    }

    public fun add_schema<T: store>(entity: &mut Entity, schema_id: vector<u8>, schema:T){
        let schemas = get_mut_schemas(entity);
        bag::add(schemas, schema_id, schema);
    }

    public fun remove_schema<T: drop + store>(entity: &mut Entity, schema_id: vector<u8>){
        let schemas= get_mut_schemas(entity);
        bag::remove<vector<u8>,T>(schemas, schema_id);
    }

    public fun get_mut_schemas(entity: &mut Entity): &mut Bag {
        &mut entity.schemas
    }

    public fun get_schema<T: store>(entity: &Entity, schema_id: vector<u8>): &T {
        assert!(bag::contains(&entity.schemas, schema_id),0);
        bag::borrow<vector<u8>,T>(&entity.schemas, schema_id)
    }

    public fun get_mut_schema<T: store>(entity: &mut Entity, schema_id: vector<u8>): &mut T {
        assert!(bag::contains(&entity.schemas, schema_id),0);
        bag::borrow_mut<vector<u8>,T>(&mut entity.schemas,schema_id)
    }

    public fun schemas_length(entity: &mut Entity) : u64 {
        bag::length(get_mut_schemas(entity))
    }
}`;
	let a = formatAndWriteMove(
		output,
		`/packages/rooch-cli`,
		'formatAndWriteMove'
	);
	// console.log(output)
}

init();
