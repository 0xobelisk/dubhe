#[test_only]
module obelisk::init_tests {
    public fun init_obelisk_for_testing(ctx: &mut TxContext){
        obelisk::dapps_schema::init_dapps_for_testing(ctx);
    }
}