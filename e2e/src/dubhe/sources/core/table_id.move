module dubhe::table_id;

const ONCHAIN_TABLE: vector<u8> = b"ont";
const OFFCHAIN_TABLE: vector<u8> = b"oft";


public fun onchain_table_type(): vector<u8> {
    ONCHAIN_TABLE
}

public fun offchain_table_type(): vector<u8> {
    OFFCHAIN_TABLE
}

public fun encode(table_type: vector<u8>, name: vector<u8>): vector<u8> { 
      let mut table_id = table_type;
      table_id.append(name);
      table_id
}

public fun table_type(table_id: &vector<u8>): vector<u8> {
    let mut table_type = vector::empty();
    table_type.push_back(table_id[0]);
    table_type.push_back(table_id[1]);
    table_type.push_back(table_id[2]);
    table_type
}

public fun table_name(table_id: &vector<u8>): vector<u8> {
    let mut table_name = vector::empty<u8>();
    let mut i = 3;
    while (i < table_id.length()) {
        table_name.push_back(table_id[i]);
        i = i + 1;
    };
    table_name
}
