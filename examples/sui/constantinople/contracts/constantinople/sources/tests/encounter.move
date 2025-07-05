#[test_only]
module constantinople::encounter_test {
    use std::debug;
    use sui::random::Random;
    use sui::random;
    use sui::test_scenario;
    use constantinople::map_system;
    use constantinople::encounter_system;
    use constantinople::entity_schema::Entity;
    use constantinople::map_schema::Map;
    use constantinople::direction;
    use constantinople::encounter_schema::Encounter;
    use constantinople::init_test;

    #[test]
    public fun throw_ball(){
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
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);

        // Cannot move during an encounter
        let monster_info = encounter.monster_info().get(ctx.sender());
        assert!(encounter.monster_info().get(ctx.sender()).get_catch_attempts() == 0);
        encounter_system::throw_ball(&mut entity, &mut encounter, &random, ctx);
        assert!(encounter.monster_info().get(ctx.sender()).get_catch_attempts() == 1);
        encounter_system::throw_ball(&mut entity, &mut encounter, &random, ctx);
        assert!(encounter.monster_info().get(ctx.sender()).get_catch_attempts() == 2);
        encounter_system::throw_ball(&mut entity, &mut encounter, &random, ctx);

        assert!(encounter.monster_info().contains_key(ctx.sender()) == false);
        assert!(entity.owned_by().get(ctx.sender()) == vector[monster_info.get_monster()]);

        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_west(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_west(), ctx);

        // let monster_info = encounter.monster_info().get(ctx.sender());
        encounter_system::throw_ball(&mut entity, &mut encounter, &random, ctx);
        let monsters = entity.owned_by().get(ctx.sender());
        debug::print(&entity.monster().get(monsters[0]));
        debug::print(&entity.monster().get(monsters[1]));

        test_scenario::return_shared(random);
        test_scenario::return_shared(encounter);
        test_scenario::return_shared(entity);
        test_scenario::return_shared(map);

        dapp.distroy_dapp_for_testing();
        scenario.end();
    }

    #[test]
    public fun flee(){
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
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_east(), ctx);
        map_system::move_position(&mut map, &mut entity, &mut encounter, &random, direction::new_south(), ctx);

        // Cannot move during an encounter
        let monster_info = encounter.monster_info().get(ctx.sender());
        assert!(encounter.monster_info().get(ctx.sender()).get_catch_attempts() == 0);
        encounter_system::throw_ball(&mut entity, &mut encounter, &random, ctx);
        assert!(encounter.monster_info().get(ctx.sender()).get_catch_attempts() == 1);
        debug::print(&entity.owned_by().get(ctx.sender()));

        encounter_system::flee(&mut entity, &mut encounter, ctx);

        assert!(encounter.monster_info().contains_key(ctx.sender()) == false);
        assert!(entity.owned_by().get(ctx.sender()) == vector[]);
        assert!(entity.monster().contains_key(monster_info.get_monster()) == false);

        test_scenario::return_shared(random);
        test_scenario::return_shared(encounter);
        test_scenario::return_shared(entity);
        test_scenario::return_shared(map);

        dapp.distroy_dapp_for_testing();
        scenario.end();
    }
}