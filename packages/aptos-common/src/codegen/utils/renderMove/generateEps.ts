import { formatAndWriteMove } from '../formatAndWrite';
import { DubheConfig } from '../../types';
import { getFriendSchema } from './common';

export function generateEps(config: DubheConfig, srcPrefix: string, version?: number) {
  generateWorld(config, srcPrefix, version);
  generateEvents(config.name, srcPrefix);
}

function generateWorld(config: DubheConfig, srcPrefix: string, version?: number) {
  if (version === undefined) {
    version = 1;
  }

  let code = `module ${config.name}::world {
    use std::string::String;
    use aptos_framework::account::{SignerCapability, create_signer_with_capability, get_signer_capability_address};
    use aptos_framework::account;
    use std::signer;
    
    friend ${config.name}::init;
${getFriendSchema(config.name, config.schemas)}

    struct World has key {
        /// Deployer
        deployer: address,
        /// Name of the world
        name: String,
        /// Description of the world
        description: String,
        /// Resource Capability  of the world
        resource_cap: SignerCapability
    }

    public(friend) fun create(deployer_signer: &signer, name: String, description: String) {
        let deployer = signer::address_of(deployer_signer);
        let (_, resource_cap) = account::create_resource_account(deployer_signer, b"${
          config.name
        }");
        move_to(deployer_signer, World { deployer, name, description, resource_cap });
    }

    public(friend) fun resource_signer(): signer acquires World {
        let _dubhe_world = borrow_global_mut<World>(@${config.name});
        create_signer_with_capability(&_dubhe_world.resource_cap)
    }

    // ============================= View Function =============================

    #[view]
    public fun resource_address(): address acquires World {
        let _dubhe_world = borrow_global_mut<World>(@${config.name});
        get_signer_capability_address(&_dubhe_world.resource_cap)
    }

    #[view]
    public fun deployer_address(): address acquires World {
        let _dubhe_world = borrow_global_mut<World>(@${config.name});
        _dubhe_world.deployer
    }

    #[view]
    public fun info(): (String, String, address, address) acquires World {
        let _dubhe_world = borrow_global_mut<World>(@${config.name});
        (_dubhe_world.name, _dubhe_world.description, _dubhe_world.deployer, get_signer_capability_address(&_dubhe_world.resource_cap))
    }
}
`;
  formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${config.name}/sources/codegen/eps/world.move`,
    'formatAndWriteMove'
  );
}

function generateEvents(projectName: string, srcPrefix: string) {
  let code = `module ${projectName}::events {
    use std::option::Option;
    use aptos_framework::event;

    #[event]
    struct SchemaSetRecord<T: drop + store> has drop, store {
        _dubhe_schema_id: vector<u8>,
        _dubhe_schema_type: u8,
        _dubhe_entity_key: Option<address>,
        _dubhe_data: T
    }

    #[event]
    struct SchemaRemoveRecord has drop, store {
        _dubhe_schema_id: vector<u8>,
        _dubhe_entity_key: address
    }

    public fun emit_set<T: drop + store>(_dubhe_schema_id: vector<u8>, _dubhe_schema_type: u8, _dubhe_entity_key: Option<address>, _dubhe_data: T) {
        event::emit(SchemaSetRecord { _dubhe_schema_id, _dubhe_schema_type, _dubhe_entity_key, _dubhe_data });
    }

    public fun emit_remove(_dubhe_schema_id: vector<u8>, _dubhe_entity_key: address) {
        event::emit(SchemaRemoveRecord { _dubhe_schema_id, _dubhe_entity_key });
    }
}
`;
  formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${projectName}/sources/codegen/eps/events.move`,
    'formatAndWriteMove'
  );
}
