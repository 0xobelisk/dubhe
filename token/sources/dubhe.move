module token::dubhe;
use std::ascii::string;
use sui::coin;
use sui::url;

public struct DUBHE has drop {}

fun init(witness: DUBHE, ctx: &mut TxContext) {
    let (treasury_cap, deny_cap, metadata) = coin::create_regulated_currency_v2(
        witness,
        7,
        b"DUBHE",
        b"DUBHE Token",
        b"Dubhe engine token",
        option::some(url::new_unsafe(string(b"https://raw.githubusercontent.com/0xobelisk/dubhe/refs/heads/main/assets/logo.jpg"))),
        true,
        ctx
    );

    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    transfer::public_transfer(deny_cap, tx_context::sender(ctx));
    transfer::public_transfer(metadata, tx_context::sender(ctx));
}
