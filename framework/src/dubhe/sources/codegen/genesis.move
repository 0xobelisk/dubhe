#[allow(lint(share_owned))]module dubhe::genesis {
      use sui::clock::Clock;
      use dubhe::dapp_service::DappHub;
      use dubhe::dapp_key;
      use dubhe::dapp_system;
      use std::ascii::string;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"dubhe"), string(b"Dubhe Protocol"), clock, ctx);

    // Logic that needs to be automated once the contract is deployed
    dubhe::deploy_hook::run(dapp_hub, ctx);
  }
}
