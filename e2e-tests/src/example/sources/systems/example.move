module example::example_system;

use dubhe::dapp_service::DappHub;
use example::{resource0, resource1, resource2, resource3, resource4, resource5, resource6, resource7};
use example::{component0, component1, component2, component3, component4, component5, component6, component7, component8, component9, component10, component11, component12, component13, component14};
use sui::address;
use example::direction;


public entry fun resources(dh: &mut DappHub) {
    let resource0 = resource0::get(dh);
    let value = resource0 + 1;
    let player = address::from_u256(value as u256);
    resource0::set(dh, value);

    resource1::set(dh, player, value);
    let direction = if (value % 2 == 0) {
        direction::new_east()
    } else if (value % 3 == 0) {
        direction::new_west()
    } else {
        direction::new_north()      
    };
    resource2::set(dh, player, value, direction);
    resource3::set(dh, direction);
    resource4::set(dh, player, value);
    resource5::set(dh, player, value, value);
    resource6::set(dh, player, value, value, value, value);
    resource7::set(dh, player, value);
}

public entry fun components(dh: &mut DappHub) {
    let resource0 = resource0::get(dh);
    let value = resource0 + 1;
    let player = address::from_u256(value as u256);
    component0::set(dh, player);
    component1::set(dh, player);
    component2::set(dh, value);
    component3::set(dh, player, value);
    component4::set(dh, player, value);
    component5::set(dh, player, value);
    component6::set(dh, player, value, value);
    component7::set(dh, player, value, value);
     let direction = if (value % 2 == 0) {
        direction::new_east()
    } else if (value % 3 == 0) {
        direction::new_west()
    } else {
        direction::new_north()      
    };
    component8::set(dh, player, direction);
    component9::set(dh, player, direction);
    component10::set(dh, player, direction);
    component11::set(dh, player, value, direction);
    component12::set(dh, direction, player, value);
    component13::set(dh, player, value);
    component14::set(dh, player, direction);
}




