module dubhe::type_info {
    use std::ascii::String;
    use std::ascii::string;
    use std::type_name;
    use sui::address;
    use std::type_name::TypeName;

    public fun parse_type_name(type_name: TypeName): (address, String, String, String) {
        let pending_parse_str = type_name.into_string();
        let delimiter = string(b"::");

        // TBD: this can probably be hard-coded as all hex addrs are 64 bytes
        let package_delimiter_index = pending_parse_str.index_of(&delimiter);
        let package_addr = pending_parse_str.substring(0, package_delimiter_index);
        let package_id = address::from_ascii_bytes(package_addr.as_bytes());

        let tail = pending_parse_str.substring(package_delimiter_index + 2, pending_parse_str.length());

        let module_delimiter_index = tail.index_of(&delimiter);
        let module_name = tail.substring(0, module_delimiter_index);

        let struct_name_with_type = tail.substring(module_delimiter_index + 2, tail.length());

        let delimiter = string(b"<");
        let struct_name_delimiter_index = struct_name_with_type.index_of(&delimiter);
        let struct_name = struct_name_with_type.substring(0, struct_name_delimiter_index);

        (package_id, module_name, struct_name, struct_name_with_type)
    }

    public fun get_package_id<T>(): address {
        let type_name = type_name::get<T>().get_address();
        address::from_ascii_bytes(type_name.as_bytes())
    }

    public fun get_package_id_string<T>(): String {
        type_name::get<T>().into_string()
    }
}