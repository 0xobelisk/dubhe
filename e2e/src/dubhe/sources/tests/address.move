// #[test_only]
// module dubhe::address_test;

// use dubhe::address_system;
// use sui::test_scenario;
// use std::ascii::string;

// #[test]
// public fun test_address_conversion() {
//         let sui_sender = @0x1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217;
//         let sui_origin_string = string(b"0x1462cab50fe5998f8161378e5265f7920bfd9fbce604d602619962f608837217");
//         let evm_origin_string = string(b"0x9168765ee952de7c6f8fc6fad5ec209b960b7622");
//         let solana_origin_string = string(b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L");
//         let mut scenario = test_scenario::begin(sui_sender);
        
//         // Test EVM address conversion
//         std::debug::print(&string(b"EVM address:"));
//         std::debug::print(&evm_origin_string);
//         let evm_sui_address = address_system::evm_to_sui(evm_origin_string);
//         std::debug::print(&string(b"EVM->SUI:"));
//         std::debug::print(&evm_sui_address.to_ascii_string());

//         // Test Solana address conversion
//         let solana_address_str = string(b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L");
//         let solana_sui_address = address_system::solana_to_sui(solana_address_str);
//         std::debug::print(&string(b"Solana->SUI:"));
//         std::debug::print(&solana_sui_address.to_ascii_string());

//         // Test SUI address detection
//         {
//             let ctx = test_scenario::ctx(&mut scenario);
//             assert!(address_system::is_sui_address(ctx));
//             assert!(address_system::ensure_origin(ctx) == sui_origin_string);
//         };

//         // Test EVM address detection
//         address_system::setup_evm_scenario(&mut scenario, b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622");
//         {
//             let ctx = test_scenario::ctx(&mut scenario);
//             assert!(address_system::is_evm_address(ctx));
//             std::debug::print(&string(b"evm_origin_string:"));
//             std::debug::print(&address_system::ensure_origin(ctx));
//             assert!(address_system::ensure_origin(ctx) == evm_origin_string);
//         };

//         // Test Solana address detection
//         address_system::setup_solana_scenario(&mut scenario, b"3vy8k1NAc3Q9EPvqrAuS4DG4qwbgVqfxznEdtcrL743L");
//         {
//             let ctx = test_scenario::ctx(&mut scenario);
//             assert!(address_system::is_solana_address(ctx));
//             assert!(address_system::ensure_origin(ctx) == solana_origin_string);
//         };
        
//         scenario.end();
// }
