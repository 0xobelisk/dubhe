#[allow(lint(share_owned))]module example::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::{Self, DappHub};

  use example::dapp_key;

  use example::component0;

  use example::component1;

  use example::component2;

  use example::component3;

  use example::component4;

  use example::component5;

  use example::component6;

  use example::component7;

  use example::component8;

  use example::component9;

  use example::component10;

  use example::component11;

  use example::component12;

  use example::component13;

  use example::component14;

  use example::resource0;

  use example::resource1;

  use example::resource2;

  use example::resource3;

  use example::resource4;

  use example::resource5;

  use example::resource6;

  use example::resource7;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"example", b"example", clock, ctx);
    // Register tables
    component0::register_table(dapp_hub, ctx);
    component1::register_table(dapp_hub, ctx);
    component2::register_table(dapp_hub, ctx);
    component3::register_table(dapp_hub, ctx);
    component4::register_table(dapp_hub, ctx);
    component5::register_table(dapp_hub, ctx);
    component6::register_table(dapp_hub, ctx);
    component7::register_table(dapp_hub, ctx);
    component8::register_table(dapp_hub, ctx);
    component9::register_table(dapp_hub, ctx);
    component10::register_table(dapp_hub, ctx);
    component11::register_table(dapp_hub, ctx);
    component12::register_table(dapp_hub, ctx);
    component13::register_table(dapp_hub, ctx);
    component14::register_table(dapp_hub, ctx);
    resource0::register_table(dapp_hub, ctx);
    resource1::register_table(dapp_hub, ctx);
    resource2::register_table(dapp_hub, ctx);
    resource3::register_table(dapp_hub, ctx);
    resource4::register_table(dapp_hub, ctx);
    resource5::register_table(dapp_hub, ctx);
    resource6::register_table(dapp_hub, ctx);
    resource7::register_table(dapp_hub, ctx);
    // Logic that needs to be automated once the contract is deployed
    example::deploy_hook::run(dapp_hub, ctx);
  }
}
