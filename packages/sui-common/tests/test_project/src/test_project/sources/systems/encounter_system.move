// module test_project::encounter_system {
//     use dubhe::dapp_hub;
//     use dubhe::dapp_hub::DappHub;
//     use test_project::encounter;
//     use test_project::position;

//     public fun move_player(
//         dapp_hub: &mut DappHub, 
//         player: address,
//         exists: bool,
//         monster: address,
//         catch_attempt: u256
//     ) {
//         if (!position::has(dapp_hub, player)) {
//             position::set(dapp_hub, player, 0, 0);
//         };
//         encounter::set(
//             dapp_hub, 
//             player, 
//             exists, 
//             monster, 
//             catch_attempt
//       );
//     }
// }