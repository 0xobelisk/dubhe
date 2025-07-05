#[test_only]
module constantinople::map_test {
    use std::debug;
    use constantinople::position;
    use sui::random::Random;
    use sui::random;
    use sui::test_scenario;
    use constantinople::map_system;
    use constantinople::entity_schema::Entity;
    use constantinople::map_schema::Map;
    use constantinople::direction;
    use constantinople::encounter_schema::Encounter;
    use constantinople::init_test;

    #[test]
    public fun register(){
       let (mut scenario, dapp) = init_test::deploy_dapp_for_testing(@0xA);
        let mut map = test_scenario::take_shared<Map>(&scenario);
        let mut entity = test_scenario::take_shared<Entity>(&scenario);
        let encounter = test_scenario::take_shared<Encounter>(&scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        map_system::register(&mut map, &mut entity, 0, 0, ctx);

        assert!(entity.player().contains_key(ctx.sender()));
        assert!(entity.moveable().contains_key(ctx.sender()));
        assert!(entity.borrow_encounterable().contains_key(ctx.sender()));
        assert!(map.position().contains_key(ctx.sender()));

        test_scenario::return_shared(encounter);
        test_scenario::return_shared(entity);
        test_scenario::return_shared(map);
        dapp.distroy_dapp_for_testing();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = constantinople::cannot_move_error::CannotMove)]
    public fun move_position1(){
        let (mut scenario, dapp) = init_test::deploy_dapp_for_testing(@0x0);
        {
            random::create_for_testing(scenario.ctx());
            scenario.next_tx(@0xA);
        };

        let mut map = test_scenario::take_shared<Map>(&scenario);
        let mut entity = test_scenario::take_shared<Entity>(&scenario);
        let mut encounter = test_scenario::take_shared<Encounter>(&scenario);
        let random = test_scenario::take_shared<Random>(&scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        map_system::register(&mut map, &mut entity, 0, 0, ctx);

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(1, 0));

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(1, 1));

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(2, 1));

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(2, 4));

        // Cannot move during an encounter
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);

        test_scenario::return_shared(random);
        test_scenario::return_shared(encounter);
        test_scenario::return_shared(entity);
        test_scenario::return_shared(map);

        dapp.distroy_dapp_for_testing();
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = constantinople::space_obstructed_error::SpaceObstructed)]
    public fun move_position2(){
        let (mut scenario, dapp) = init_test::deploy_dapp_for_testing(@0x0);
        {
            random::create_for_testing(scenario.ctx());
            scenario.next_tx(@0xA);
        };

        let mut map = test_scenario::take_shared<Map>(&scenario);
        let mut entity = test_scenario::take_shared<Entity>(&scenario);
        let mut encounter = test_scenario::take_shared<Encounter>(&scenario);
        let random = test_scenario::take_shared<Random>(&scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        map_system::register(&mut map, &mut entity, 0, 0, ctx);

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(0, 5));

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(2, 5));

        // // Cannot move during an encounter
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        assert!(map.position().get(ctx.sender()) == position::new(3, 5));

        let terrains = map.config().get().get_terrain();
        debug::print(&terrains[3][5]);

        test_scenario::return_shared(random);
        test_scenario::return_shared(encounter);
        test_scenario::return_shared(entity);
        test_scenario::return_shared(map);

        dapp.distroy_dapp_for_testing();
        scenario.end();
    }
}