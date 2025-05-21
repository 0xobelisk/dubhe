#[allow(lint(share_owned))]module dubhe::dubhe_genesis {

  use std::ascii::string;

  use sui::clock::Clock;

  public entry fun run(clock: &Clock, ctx: &mut TxContext) {
    // Create schemas
    let mut schema = dubhe::dubhe_schema::create(ctx);
    // Setup default storage
    dubhe::dubhe_dapp_system::create_dapp(
      &mut schema, 
      dubhe::dubhe_dapp_key::new(), 
      dubhe::dubhe_dapp_metadata::new(string(b"dubhe"), string(b"Dubhe Protocol"), vector[], string(b""), clock.timestamp_ms(), vector[]), 
      ctx
    );
    // Logic that needs to be automated once the contract is deployed
    dubhe::dubhe_deploy_hook::run(&mut schema, ctx);
    // Authorize schemas and public share objects
    sui::transfer::public_share_object(schema);
  }
}
