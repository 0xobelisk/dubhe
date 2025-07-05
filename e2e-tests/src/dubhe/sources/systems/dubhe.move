module dubhe::dubhe;
use sui::coin::{Self, TreasuryCap};
use sui::hash::keccak256;
use sui::address;
use dubhe::dapp_service::DappHub;
use dubhe::dapp_key;
use dubhe::dapp_key::DappKey;

public struct DUBHE has drop {}

fun init(witness: DUBHE, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        7,
        b"DUBHE",
        b"DUBHE Token",
        b"Dubhe engine token",
        option::none(),
        ctx
    );

    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
}

public entry fun deposit_treasury_cap(
    dapp_hub: &mut DappHub,
    treasury_cap: TreasuryCap<DUBHE>,
    ctx: &mut TxContext
) {
    dapp_hub.ensure_dapp_admin<DappKey>(ctx.sender());
    let dapp_key = dapp_key::new();
    let treasury_cap_key = get_treasury_cap_key();
    dapp_hub.get_objects(dapp_key).add<address, TreasuryCap<DUBHE>>(treasury_cap_key, treasury_cap);
}

public entry fun withdraw_treasury_cap(
    dapp_hub: &mut DappHub,
    ctx: &mut TxContext
) {
    dapp_hub.ensure_dapp_admin<DappKey>(ctx.sender());
    let dapp_key = dapp_key::new();
    let treasury_cap_key = get_treasury_cap_key();
    let treasury_cap = dapp_hub.get_objects(dapp_key).remove<address, TreasuryCap<DUBHE>>(treasury_cap_key);
    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
}

public fun get_treasury_cap_key(): address {
    let key = keccak256(&b"treasury_cap");
    address::from_bytes(key)
}
