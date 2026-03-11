// module dubhe::session_system;
// use dubhe::dapp_service::DappHub;
// use dubhe::session;
// use std::type_name;
// use dubhe::dapp_metadata;
// use dubhe::errors::no_permission_error;
// use dubhe::address_system;
// use std::ascii::String;
// use dubhe::dapp_system;

// public fun create_session<DappKey: copy + drop>(
//       dapp_hub: &mut DappHub, 
//       account: address, 
//       ctx: &mut TxContext
// ) {
//   let owner = address_system::ensure_origin(ctx);
//   let dapp_key = type_name::get<DappKey>().into_string();
//   dapp_metadata::ensure_has(dapp_hub, dapp_key);
//   session::set(dapp_hub, dapp_key, account, owner)
// }

// public fun delete_session<DappKey: copy + drop>(
//       dapp_hub: &mut DappHub, 
//       account: address, 
//       ctx: &mut TxContext
// ) {
//   let sender = address_system::ensure_origin(ctx);
//   let dapp_key = dapp_system::dapp_key<DappKey>();
//   dapp_metadata::ensure_has(dapp_hub, dapp_key);
//   session::ensure_has(dapp_hub, dapp_key, account);
//   let owner = session::get(dapp_hub, dapp_key, account);
//   no_permission_error(owner == sender);
//   session::delete(dapp_hub, dapp_key, account);
// }

// public fun ensure_session<DappKey: copy + drop>(
//       dapp_hub: &DappHub, 
//       ctx: &mut TxContext
// ): String {
//   let dapp_key = dapp_system::dapp_key<DappKey>();
//   dapp_metadata::ensure_has(dapp_hub, dapp_key);
//   session::ensure_has(dapp_hub, dapp_key, ctx.sender());
//   session::get(dapp_hub, dapp_key, ctx.sender())
// }