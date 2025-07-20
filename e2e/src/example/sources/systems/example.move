module example::example_system;

use dubhe::dapp_service::DappHub;
use example::{resource0, resource1, resource2, resource3, resource4, resource5, resource6, resource7};
use example::{component0, component1, component2, component3, component4, component5, 
component6, component7, component8, component9, component10, component11, component12, component13, component14,
component15, component16, component17, component18, component19, component20, component21, component22, 
component23, 
component24, component25, component26, component27, component28, component29, component30, 
component31, 
// component32, component33, component34, component35, component36, component37, component38
};
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

    component6::set_hp(dh, player, value);

     let direction = if (value % 2 == 0) {
        direction::new_east()
    } else if (value % 3 == 0) {
        component5::delete(dh, player);
        direction::new_west()
    } else {
        direction::new_north()      
    };
    component8::set(dh, player, direction);
    component9::set(dh, player, direction);
    component10::set(dh, player, direction);
    component11::set(dh, player, value, direction);
    component11::set_direction(dh, player, direction);
    component12::set(dh, direction, player, value);
    component13::set(dh, player, value);
    component14::set(dh, player, direction);

    component15::set(dh, player, value as u8);
    component16::set(dh, player, value as u16);
    component17::set(dh, player, value as u32);
    component18::set(dh, player, value as u64);
    component19::set(dh, player, value as u128);
    component20::set(dh, player, value as u256);
    component21::set(dh, player, address::from_u256(value as u256));
    component22::set(dh, player, value % 2 == 0);
    component23::set(dh, player, vector[value as u8]);
    component24::set(dh, player, vector[value as u16]);
    component25::set(dh, player, vector[value as u32]);
    component26::set(dh, player, vector[value as u64]);
    component27::set(dh, player, vector[value as u128]);
    component28::set(dh, player, vector[value as u256]);
    component29::set(dh, player, vector[address::from_u256(value as u256)]);
    component30::set(dh, player, vector[value % 2 == 0]);
    component31::set(dh, player, vector[vector[value as u8]]);
    // component32::set(dh, player, vector[vector[value as u16]]);
    // component33::set(dh, player, vector[vector[value as u32]]);
    // component34::set(dh, player, vector[vector[value as u64]]);
    // component35::set(dh, player, vector[vector[value as u128]]);
    // component36::set(dh, player, vector[vector[value as u256]]);
    // component37::set(dh, player, vector[vector[address::from_u256(value as u256)]]);
    // component38::set(dh, player, vector[vector[value % 2 == 0]]);
}




