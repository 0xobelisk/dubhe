module example::example_system;

use dubhe::dapp_service::DappHub;
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

/// Demonstrate global and keyed resource operations.
/// resource_account is the entity-id (account key) for non-global resources.
public entry fun resources(dh: &mut DappHub, resource_account: String, ctx: &mut TxContext) {
    // global resource: no resource_account needed
    resource0::set(dh, resource_account, 42u32, ctx);

    let player = @0xA;
    let dir = direction::new_east();

    // multi-field, no extra keys: resource_account is the sole entity-id
    resource1::set(dh, resource_account, player, 42u32, ctx);
    resource2::set(dh, resource_account, player, 42u32, dir, ctx);
    resource3::set(dh, resource_account, dir, ctx);

    // keyed resources: resource_account + explicit key(s)
    resource4::set(dh, resource_account, player, 42u32, ctx);
    resource5::set(dh, resource_account, player, 1u32, 42u32, ctx);
    resource6::set(dh, resource_account, player, 1u32, 2u32, 42u32, 100u32, ctx);

    // multi-field resources with string values
    let name = string(b"Hello World");
    resource8::set(dh, resource_account, player, name, ctx);
    resource9::set(dh, resource_account, player, vector[name], 42u32, ctx);
}

/// Demonstrate component-style resources (no explicit keys → resource_account as entity-id).
public entry fun components(dh: &mut DappHub, resource_account: String, ctx: &mut TxContext) {
    // presence flag component
    component0::set(dh, resource_account, true, ctx);

    // single-value components
    component3::set(dh, resource_account, 42u32, ctx);
    component5::set(dh, resource_account, 42u32, ctx);

    // multi-field components (no extra keys)
    component6::set(dh, resource_account, 10u32, 100u32, ctx);

    // enum components
    component8::set(dh, resource_account, direction::new_east(), ctx);
    component9::set(dh, resource_account, direction::new_north(), ctx);

    // keyed components
    component4::set(dh, resource_account, @0xA, 42u32, ctx);
    component10::set(dh, resource_account, @0xA, direction::new_north(), ctx);
    component11::set(dh, resource_account, @0xA, 42u32, direction::new_east(), ctx);

    // numeric type coverage
    component17::set(dh, resource_account, 42u32, ctx);
    component18::set(dh, resource_account, 42u64, ctx);
    component19::set(dh, resource_account, 42u128, ctx);
    component20::set(dh, resource_account, 42u256, ctx);
    component21::set(dh, resource_account, @0xA, ctx);
    component22::set(dh, resource_account, true, ctx);

    // vector type coverage
    component25::set(dh, resource_account, vector[42u32], ctx);
    component26::set(dh, resource_account, vector[42u64], ctx);
    component27::set(dh, resource_account, vector[42u128], ctx);
    component28::set(dh, resource_account, vector[42u256], ctx);
    component29::set(dh, resource_account, vector[@0xA], ctx);
    component30::set(dh, resource_account, vector[true], ctx);

    // string and vector<String> components
    component32::set(dh, resource_account, string(b"Hello"), ctx);
    component33::set(dh, resource_account, vector[string(b"Hello")], ctx);
}
