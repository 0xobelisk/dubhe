module example::example_system;

use dubhe::dapp_service::UserStorage;
use example::{
    resource0, resource1, resource2, resource3, resource4, resource5, resource6, resource8, resource9
};
use example::{
    component0, component3, component4, component5, component6, component8, component9,
    component10, component11, component17, component18, component19, component20, component21,
    component22, component25, component26, component27, component28, component29, component30,
    component32, component33
};
use example::direction;
use std::ascii::{string, String};

/// Demonstrate resource operations using UserStorage.
public entry fun resources(user_storage: &mut UserStorage, ctx: &mut TxContext) {
    resource0::set(user_storage, 42u32, ctx);

    let player = @0xA;
    let dir = direction::new_east();

    // multi-field, no extra keys
    resource1::set(user_storage, player, 42u32, ctx);
    resource2::set(user_storage, player, 42u32, dir, ctx);
    resource3::set(user_storage, dir, ctx);

    // keyed resources: explicit key(s) after user_storage
    resource4::set(user_storage, player, 42u32, ctx);
    resource5::set(user_storage, player, 1u32, 42u32, ctx);
    resource6::set(user_storage, player, 1u32, 2u32, 42u32, 100u32, ctx);

    // multi-field resources with string values
    let name = string(b"Hello World");
    resource8::set(user_storage, player, name, ctx);
    resource9::set(user_storage, player, vector[name], 42u32, ctx);
}

/// Demonstrate component-style resources using UserStorage.
public entry fun components(user_storage: &mut UserStorage, ctx: &mut TxContext) {
    // presence flag component
    component0::set(user_storage, true, ctx);

    // single-value components
    component3::set(user_storage, 42u32, ctx);
    component5::set(user_storage, 42u32, ctx);

    // multi-field components (no extra keys)
    component6::set(user_storage, 10u32, 100u32, ctx);

    // enum components
    component8::set(user_storage, direction::new_east(), ctx);
    component9::set(user_storage, direction::new_north(), ctx);

    // keyed components
    component4::set(user_storage, @0xA, 42u32, ctx);
    component10::set(user_storage, @0xA, direction::new_north(), ctx);
    component11::set(user_storage, @0xA, 42u32, direction::new_east(), ctx);

    // numeric type coverage
    component17::set(user_storage, 42u32, ctx);
    component18::set(user_storage, 42u64, ctx);
    component19::set(user_storage, 42u128, ctx);
    component20::set(user_storage, 42u256, ctx);
    component21::set(user_storage, @0xA, ctx);
    component22::set(user_storage, true, ctx);

    // vector type coverage
    component25::set(user_storage, vector[42u32], ctx);
    component26::set(user_storage, vector[42u64], ctx);
    component27::set(user_storage, vector[42u128], ctx);
    component28::set(user_storage, vector[42u256], ctx);
    component29::set(user_storage, vector[@0xA], ctx);
    component30::set(user_storage, vector[true], ctx);

    // string and vector<String> components
    component32::set(user_storage, string(b"Hello"), ctx);
    component33::set(user_storage, vector[string(b"Hello")], ctx);
}
