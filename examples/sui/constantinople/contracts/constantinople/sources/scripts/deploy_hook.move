#[allow(lint(share_owned), unused_let_mut)]module constantinople::deploy_hook {

  use std::ascii::string;

  use sui::clock::Clock;

  use constantinople::dapp_system;

    use constantinople::entity_schema::Entity;

    use constantinople::map_schema::Map;

    use constantinople::encounter_schema::Encounter;
    use constantinople::terrain_type;

    public entry fun run(clock: &Clock, ctx: &mut TxContext) {
        // Create a dapp.
        let mut dapp = dapp_system::create("constantinople", "constantinople contract", clock , ctx);
        // Create schemas
        let mut entity = constantinople::entity_schema::create(ctx);
        let mut map = constantinople::map_schema::create(ctx);
        let mut encounter = constantinople::encounter_schema::create(ctx);
        // Logic that needs to be automated once the contract is deployed
        {
            let  o = terrain_type::new_none();
            let  t = terrain_type::new_tall_grass();
            let  b = terrain_type::new_boulder();
            let terrains = vector[
                vector [o, o, o, o, o, o, t, o, o, o, o, o, o, o, o, o, o, o, o, o],
                vector [o, o, t, o, o, o, o, o, t, o, o, o, o, b, o, o, o, o, o, o],
                vector [o, t, t, t, t, o, o, o, o, o, o, o, o, o, o, t, t, o, o, o],
                vector [o, o, t, t, t, t, o, o, o, o, b, o, o, o, o, o, t, o, o, o],
                vector [o, o, o, o, t, t, o, o, o, o, o, o, o, o, o, o, o, t, o, o],
                vector [o, o, o, b, b, o, o, o, o, o, o, o, o, o, o, o, o, o, o, o],
                vector [o, t, o, o, o, b, b, o, o, o, o, t, o, o, o, o, o, b, o, o],
                vector [o, o, t, t, o, o, o, o, o, t, o, b, o, o, t, o, b, o, o, o],
                vector [o, o, t, o, o, o, o, t, t, t, o, b, b, o, o, o, o, o, o, o],
                vector [o, o, o, o, o, o, o, t, t, t, o, b, t, o, t, t, o, o, o, o],
                vector [o, b, o, o, o, b, o, o, t, t, o, b, o, o, t, t, o, o, o, o],
                vector [o, o, b, o, o, o, t, o, t, t, o, o, b, t, t, t, o, o, o, o],
                vector [o, o, b, b, o, o, o, o, t, o, o, o, b, o, t, o, o, o, o, o],
                vector [o, o, o, b, b, o, o, o, o, o, o, o, o, b, o, t, o, o, o, o],
                vector [o, o, o, o, b, o, o, o, o, o, o, o, o, o, o, o, o, o, o, o],
                vector [o, o, o, o, o, o, o, o, o, o, b, b, o, o, t, o, o, o, o, o],
                vector [o, o, o, o, t, o, o, o, t, b, o, o, o, t, t, o, b, o, o, o],
                vector [o, o, o, t, o, t, t, t, o, o, o, o, o, t, o, o, o, o, o, o],
                vector [o, o, o, t, t, t, t, o, o, o, o, t, o, o, o, t, o, o, o, o],
                vector [o, o, o, o, o, t, o, o, o, o, o, o, o, o, o, o, o, o, o, o]
            ];

            let height = terrains.length();
            let width = terrains[0].length();
            let mut x: u64 = 0;
            let mut y: u64 = 0;

            while (y < height) {
                while (x < width) {
                    let terrain = terrains[y][x];
                    let entity_key = constantinople::map_system::position_to_address(x, y);
                    let position = constantinople::position::new(x, y);
                    map.position().insert(entity_key, position);
                    // std::debug::print(&position);
                    // std::debug::print(&terrain);
                    if (terrain == terrain_type::new_none()) {
                        entity.obstruction().insert(entity_key, false);
                        entity.encounterable().insert(entity_key, false);
                        entity.moveable().insert(entity_key, false);
                        encounter.trigger().insert(entity_key, false);
                    } else if (terrain == terrain_type::new_boulder()) {
                        entity.obstruction().insert(entity_key, true);
                        entity.encounterable().insert(entity_key, false);
                        entity.moveable().insert(entity_key, false);
                        encounter.trigger().insert(entity_key, false);
                    } else if (terrain == terrain_type::new_tall_grass()) {
                        entity.obstruction().insert(entity_key, false);
                        entity.encounterable().insert(entity_key, false);
                        entity.moveable().insert(entity_key, false);
                        encounter.trigger().insert(entity_key, true);
                    };
                    x = x + 1;
                };
                y = y + 1;
            };

            map.config().set(constantinople::map_config::new(width, height, terrains));
        };
        // Authorize schemas and public share objects
        dapp.add_schema<Entity>(entity, ctx);
        dapp.add_schema<Map>(map, ctx);
        dapp.add_schema<Encounter>(encounter, ctx);
        sui::transfer::public_share_object(dapp);
    }
}
