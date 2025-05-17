#[test_only]
module dubhe::bridge_tests {
    use std::ascii::{string};
    use sui::transfer::public_share_object;
    use dubhe::dubhe_bridge_system;
    use dubhe::dubhe_wrapper_system;
    use dubhe::dubhe::DUBHE;
    use dubhe::dubhe_init_test::deploy_dapp_for_testing;
    use dubhe::dubhe_assets_system;
    use dubhe::dubhe_schema::Schema;
    use sui::test_scenario;
    use sui::coin;

    #[test]
    public fun bridge() {
        let sender = @0xA;
        let mut scenario = test_scenario::begin(sender);
        let mut schema = deploy_dapp_for_testing(&mut scenario);
        schema.fee_to().set(@0xB);

        let ctx = test_scenario::ctx(&mut scenario);
        let amount = 100 * 10000000;
        let dubhe = coin::mint_for_testing<DUBHE>(amount, ctx);

        dubhe_wrapper_system::wrap(&mut schema, dubhe, ctx.sender());
        assert!(dubhe_assets_system::balance_of(&mut schema, 1, ctx.sender()) as u64 == amount);

        let to = @0x1;
        let amount = 10 * 10000000;
        dubhe_bridge_system::withdraw(&mut schema, 1, to, string(b"Dubhe OS"), amount, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, 1, ctx.sender()) as u64 == 90 * 10000000);

        let amount = 10 * 10000000;
        let mut treasury_cap = coin::create_treasury_cap_for_testing<DUBHE>(ctx);
        dubhe_bridge_system::deposit(&mut schema,  &mut treasury_cap, 1,@0x1, @0xA, string(b"Dubhe OS"), amount, ctx);
        assert!(dubhe_assets_system::balance_of(&mut schema, 1, ctx.sender()) as u64 == 100 * 10000000);

        public_share_object(treasury_cap);
        test_scenario::return_shared<Schema>(schema);
        scenario.end();
    }
}