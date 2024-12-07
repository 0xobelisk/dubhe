#[test_only]
module dubhe::init_tests {
    public fun init_dubhe_for_testing(ctx: &mut TxContext){
        dubhe::dapps_schema::init_dapps_for_testing(ctx);
    }
}