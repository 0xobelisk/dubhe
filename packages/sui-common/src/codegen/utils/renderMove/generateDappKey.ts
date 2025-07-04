import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export async function generateDappKey(config: DubheConfig, path: string) {
  let code = `module ${config.name}::dapp_key {
use std::type_name;
  use sui::address;
  use std::ascii::String;

  /// Authorization token for the app.

  public struct DappKey has copy, drop {}

  public(package) fun new(): DappKey {
    DappKey {  }
  }

  public fun to_string(): String {
    type_name::get<DappKey>().into_string()
  }

  public fun package_id(): address {
    let package_id_str = type_name::get<DappKey>().get_address();
    address::from_ascii_bytes(package_id_str.as_bytes())
  }
}
`;
  await formatAndWriteMove(
    code,
    path,
    'formatAndWriteMove'
  );
}
