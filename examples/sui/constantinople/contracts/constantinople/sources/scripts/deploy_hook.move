#[allow(lint(share_owned), unused_let_mut)]module constantinople::deploy_hook {

  use std::ascii::string;

  use sui::clock::Clock;

  use constantinople::dapp_system;

  use constantinople::entity_schema::Entity;

  use constantinople::map_schema::Map;

  use constantinople::encounter_schema::Encounter;
    use constantinople::map_terrain_type;

  public entry fun run(clock: &Clock, ctx: &mut TxContext) {
    // Create a dapp.
    let mut dapp = dapp_system::create(string(b"constantinople"),string(b"constantinople contract"), clock , ctx);
    // Create schemas
    let mut entity = constantinople::entity_schema::create(ctx);
    let mut map = constantinople::map_schema::create(ctx);
    let mut encounter = constantinople::encounter_schema::create(ctx);
    // Logic that needs to be automated once the contract is deployed
    {
			let  o = map_terrain_type::new_none();
            let  t = map_terrain_type::new_tall_grass();
            let  b = map_terrain_type::new_boulder();
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
        let x: u64 = 0;
        let y: u64 = 0;

        map.borrow_mut_config().set(constantinople::map_config::new(width, height, terrains));

        x.range_do!(height, |x| {
            y.range_do!(width, |y| {
                let terrain = terrains[x][y];
                if (terrain != map_terrain_type::new_none()) {
                    let entity_key = constantinople::map_system::position_to_address(x, y);
                    map.borrow_mut_position().insert(entity_key, constantinople::map_position::new(x, y));
                    if (terrain == map_terrain_type::new_tall_grass()) {
                        entity.borrow_mut_obstruction().insert(entity_key, true);
                        entity.borrow_mut_encounterable().insert(entity_key, false);
                        entity.borrow_mut_moveable().insert(entity_key, false);
                    } else if (terrain == map_terrain_type::new_boulder()) {
                        entity.borrow_mut_obstruction().insert(entity_key, false);
                        entity.borrow_mut_encounterable().insert(entity_key, true);
                        entity.borrow_mut_moveable().insert(entity_key, false);
                    }
                }
            })
        });

       //  map.do!(|v| {
       //      v.do!(|t| {
       //          if (t == map_terrain_type::new_none()) { } else {
       //              let terrain = map_system::position_to_address(t, width, height);
       //          }
       //      })
       // });
			};
    // Authorize schemas and public share objects
    dapp.add_schema<Entity>(entity, ctx);
    dapp.add_schema<Map>(map, ctx);
    dapp.add_schema<Encounter>(encounter, ctx);
    sui::transfer::public_share_object(dapp);
  }
}