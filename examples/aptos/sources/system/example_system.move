module examples::example_system {
    use examples::single_value_schema;
    #[test_only]
    use examples::init;
    #[test_only]
    use aptos_framework::account;
    #[test_only]
    use examples::world;
    #[test_only]
    use std::string;
    #[test_only]
    use std::features;
    #[test_only]
    use examples::single_struct_schema;
    #[test_only]
    use examples::entity_key;
    #[test_only]
    use examples::single_column_schema;
    #[test_only]
    use examples::multi_column_schema;
    #[test_only]
    use examples::ephemeral_schema;

    public entry fun increase(_caller: &signer) {
        let old_number = single_value_schema::get();
        let new_number = old_number + 10;
        single_value_schema::set(new_number);

    }

    #[test(sender=@examples)]
    public fun test_create_world(sender: &signer)  {
        account::create_account_for_test(@examples);
        init::init_world_for_test(sender);

        let (name,description,deployer,_) = world::info();

        assert!(name == string::utf8(b"examples"), 0);
        assert!(description == string::utf8(b"examples"), 0);
        assert!(deployer == @examples, 0);
    }

    #[test(deployer=@examples, fx=@std)]
    public fun test_ephemeral(deployer: &signer, fx: &signer)  {
        account::create_account_for_test(@examples);
        init::init_world_for_test(deployer);

        features::change_feature_flags(fx, vector[26], vector[]);

        ephemeral_schema::emit_ephemeral(string::utf8(b"Test"),100);
    }

    #[test(deployer=@examples, caller=@caller, fx=@std)]
    public fun test_single_value(deployer: &signer, fx: &signer, caller: &signer)  {
        account::create_account_for_test(@examples);
        init::init_world_for_test(deployer);

        features::change_feature_flags(fx, vector[26], vector[]);

        // Value == 1000
        assert!(single_value_schema::get() == 1000, 0 );

        // Update value to 1001
        single_value_schema::set(1001);
        // Value == 1001
        assert!(single_value_schema::get() == 1001, 0 );

        increase(caller);
        // Value == 1011
        assert!(single_value_schema::get() == 1011, 0 );
    }

    #[test(deployer=@examples, fx=@std)]
    public fun test_single_struct(deployer: &signer, fx: &signer)  {
        account::create_account_for_test(@examples);
        init::init_world_for_test(deployer);

        features::change_feature_flags(fx, vector[26], vector[]);

        // admin == 0x1, fee == 100
        let (name, admin, fee) = single_struct_schema::get();
        assert!(name == string::utf8(b"dubhe"), 0);
        assert!(admin == @0x1, 0);
        assert!(fee == 100, 0);

        // admin == 0x1, fee == 100
        let admin = single_struct_schema::get_admin();
        let fee = single_struct_schema::get_fee();
        assert!(admin == @0x1, 0);
        assert!(fee == 100, 0);

        // Update admin to 0x2, Update fee to 101,
        single_struct_schema::set(string::utf8(b"dubhe"),@0x2, 101);
        // admin == 0x2, fee == 101
        let (name, admin, fee) = single_struct_schema::get();
        assert!(name == string::utf8(b"dubhe"), 0);
        assert!(admin == @0x2, 0);
        assert!(fee == 101, 0);

        // admin == 0x2, fee == 101
        let admin = single_struct_schema::get_admin();
        let fee = single_struct_schema::get_fee();
        assert!(admin == @0x2, 0);
        assert!(fee == 101, 0);

        // Update admin to 0x3, Update fee to 102,
        single_struct_schema::set_admin(@0x3);
        single_struct_schema::set_fee(102);

        // admin == 0x3, fee == 102
        let (name, admin, fee) = single_struct_schema::get();
        assert!(name == string::utf8(b"dubhe"), 0);
        assert!(admin == @0x3, 0);
        assert!(fee == 102, 0);

        // admin == 0x2, fee == 101
        let admin = single_struct_schema::get_admin();
        let fee = single_struct_schema::get_fee();
        assert!(admin == @0x3, 0);
        assert!(fee == 102, 0);
    }

    #[test(deployer=@examples, fx=@std)]
    public fun test_single_column(deployer: &signer, fx: &signer)  {
        account::create_account_for_test(@examples);
        init::init_world_for_test(deployer);

        features::change_feature_flags(fx, vector[26], vector[]);

        let entity_key = entity_key::from_u256(0);
        // Add a field
        single_column_schema::set(entity_key, 10);
        // is exist
        assert!(single_column_schema::contains(entity_key) == true, 0);

        // get 10
        let level = single_column_schema::get(entity_key);
        assert!(level == 10, 0);

        // Update a field
        single_column_schema::set(entity_key, 11);
        // get 11
        let level = single_column_schema::get(entity_key);
        assert!(level == 11, 0);

        // Remove a field
        single_column_schema::remove(entity_key);
        // is not exist
        assert!(single_column_schema::contains(entity_key) == false, 0);
    }

    #[test(deployer=@examples, fx=@std)]
    public fun test_multi_column(deployer: &signer, fx: &signer)  {
        account::create_account_for_test(@examples);
        init::init_world_for_test(deployer);

        features::change_feature_flags(fx, vector[26], vector[]);

        let entity_key = entity_key::from_u256(0);

        // Add a field
        multi_column_schema::set(entity_key::from_u256(0), string::utf8(b"online"), 1000);
        multi_column_schema::set(entity_key::from_u256(1), string::utf8(b"online"), 1000);
        multi_column_schema::set(entity_key::from_u256(2), string::utf8(b"online"), 1000);

        assert!(multi_column_schema::contains(entity_key), 0);

        // get online and get 1000
        let (state, last_update_time) = multi_column_schema::get(entity_key);
        assert!(state == string::utf8(b"online"), 0);
        assert!(last_update_time == 1000, 0);

        let state = multi_column_schema::get_state(entity_key);
        let last_update_time = multi_column_schema::get_last_update_time(entity_key);
        assert!(state == string::utf8(b"online"), 0);
        assert!(last_update_time == 1000, 0);

        // Update a field
        multi_column_schema::set(entity_key, string::utf8(b"offline"), 1001);
        // get offline and get 1001
        let (state, last_update_time) = multi_column_schema::get(entity_key);
        assert!(state == string::utf8(b"offline"), 0);
        assert!(last_update_time == 1001, 0);

        // Remove a field
        multi_column_schema::remove(entity_key);
        // is not exist
        assert!(multi_column_schema::contains(entity_key) == false, 0);
    }
}

