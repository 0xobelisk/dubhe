module dubhe::bcs {
    use std::ascii::String;
    use std::ascii::string;
    use sui::bcs;
    use sui::bcs::BCS;

    public fun peel_string(bcs: &mut BCS): String {
        string(bcs::peel_vec_u8(bcs))
    }

    public fun peel_vec_string(bcs: &mut BCS): vector<String> {
        let vec_vec_u8 = bcs::peel_vec_vec_u8(bcs);
        vec_vec_u8.map!(|item| string(item))
    }
}