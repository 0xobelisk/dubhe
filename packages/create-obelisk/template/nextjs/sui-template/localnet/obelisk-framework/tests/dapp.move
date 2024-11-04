#[test_only]
module obelisk::dapps_tests {
    use std::debug;
    use std::type_name;
    use sui::address;

    public struct USDT has drop {}

    #[test]
    public fun dapps_register() {
        let name = type_name::get<USDT>().get_address().into_bytes();
        let package_id = address::from_ascii_bytes(&name);
        debug::print(&package_id);
        debug::print(&type_name::get<USDT>().get_module());
    }
}