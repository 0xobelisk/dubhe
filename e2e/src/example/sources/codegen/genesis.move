#[allow(lint(share_owned))]module example::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::DappHub;
      use example::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"example"), string(b"example"), clock, ctx);

    // Logic that needs to be automated once the contract is deployed
    example::deploy_hook::run(dapp_hub, ctx);
  }
}
