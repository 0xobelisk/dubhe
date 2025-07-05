#[allow(lint(share_owned))]module dms::dms_genesis {

  use std::ascii::string;

  use sui::clock::Clock;

  use dms::dms_dapp_system;

  public entry fun run(clock: &Clock, ctx: &mut TxContext) {
    // Create a dapp.
    let mut dapp = dms_dapp_system::create(string(b"dms"),string(b"Distributed Messaging"), clock , ctx);
    // Create schemas
    let mut schema = dms::dms_schema::create(ctx);
    // Logic that needs to be automated once the contract is deployed
    dms::dms_deploy_hook::run(&mut schema, ctx);
    // Authorize schemas and public share objects
    dapp.add_schema(schema);
    sui::transfer::public_share_object(dapp);
  }
}
