module dubhe::dubhe {
    use sui::coin::{Self, TreasuryCap};

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

    public entry fun mint(
        treasury_cap: &mut TreasuryCap<DUBHE>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }
}