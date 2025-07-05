// #[test_only]
// module test_project::test_project_encounter_test;

// use test_project::encounter_system;
// use test_project::init_test;
// use sui::test_scenario;
// use test_project::encounter;
// use dubhe::dapp_hub;
// use test_project::position;
// use test_project::movable;
// use test_project::status;
// use test_project::direction;
// use test_project::position2;
// use test_project::counter2;

// #[test]
// public fun test_encounter() {
//       let mut scenario = test_scenario::begin(@0x1);
//       let mut dapp_hub = init_test::deploy_dapp_for_testing(&mut scenario);

//       let player = @0x1;
//       let exists = true;
//       let monster = @0x2;
//       let catch_attempt = 0;

//       encounter_system::move_player(&mut dapp_hub, player, exists, monster, catch_attempt);

//       let (stored_exists, stored_monster, stored_catch_attempt) = encounter::get(&dapp_hub, player);
//       assert!(stored_exists == exists);
//       assert!(stored_monster == monster);
//       assert!(stored_catch_attempt == catch_attempt);

//       let (stored_x, stored_y) = position::get(&dapp_hub, player);
//       assert!(stored_x == 0);
//       assert!(stored_y == 0);

//       assert!(position::has(&dapp_hub, player));
//       assert!(position::has_x(&dapp_hub, player));
//       assert!(position::has_y(&dapp_hub, player));

//       assert!(!position::has(&dapp_hub, @0x2));
//       assert!(!position::has_x(&dapp_hub, @0x2));
//       assert!(!position::has_y(&dapp_hub, @0x2));

//       position::set_x(&mut dapp_hub, @0x2, 100);
//       assert!(!position::has(&dapp_hub, @0x2));
//       assert!(position::has_x(&dapp_hub, @0x2));
//       assert!(!position::has_y(&dapp_hub, @0x2));

//       position::delete(&mut dapp_hub, player);
//       assert!(!position::has(&dapp_hub, player));
//       assert!(!position::has_x(&dapp_hub, player));
//       assert!(!position::has_y(&dapp_hub, player));

//       assert!(!movable::has(&dapp_hub, player));
//       movable::set(&mut dapp_hub, player);
//       assert!(movable::has(&dapp_hub, player));
//       movable::delete(&mut dapp_hub, player);
//       assert!(!movable::has(&dapp_hub, player));

//       // let mut i = 0;
//       // while(i < 900) {
//       //   movable::set(&mut dapp_hub, player);
//       //   position::set(&mut dapp_hub, player, 100, 100);
//       //   i = i + 1;
//       // };

//       let caught = status::new_caught();
//       std::debug::print(&caught.encode());

//       let mut bcs_type = sui::bcs::new(caught.encode());
//       let decoded = status::decode(&mut bcs_type);
//       assert!(decoded == caught);
//       std::debug::print(&decoded);

//       let direction = direction::new_east();
//       position2::set(&mut dapp_hub, player, 100, 100, direction);
//       let (stored_x, stored_y, stored_direction) = position2::get(&dapp_hub, player);
//       assert!(stored_x == 100);
//       assert!(stored_y == 100);
//       assert!(stored_direction == direction);

//       position2::ensure_has(&dapp_hub, player);
//       // position2::ensure_has(&dapp_hub, @0x2);


//       counter2::set(&mut dapp_hub, player, 100);
//       let stored_counter = counter2::get(&dapp_hub, player);
//       assert!(stored_counter == 100);

//       dapp_hub::destroy(dapp_hub);
//       test_scenario::end(scenario);
// }