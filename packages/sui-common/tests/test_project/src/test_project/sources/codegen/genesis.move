#[allow(lint(share_owned))]module test_project::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::{Self, DappHub};

  use test_project::dapp_key;

  use test_project::component0;

  use test_project::component1;

  use test_project::component2;

  use test_project::component3;

  use test_project::component4;

  use test_project::component5;

  use test_project::component6;

  use test_project::component7;

  use test_project::component8;

  use test_project::component9;

  use test_project::component10;

  use test_project::component11;

  use test_project::component12;

  use test_project::component13;

  use test_project::component14;

  use test_project::test_component;

  use test_project::resource0;

  use test_project::resource1;

  use test_project::resource2;

  use test_project::resource3;

  use test_project::resource4;

  use test_project::resource5;

  use test_project::resource6;

  use test_project::resource7;

  use test_project::test_resource;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"test_project", b"Test project for schema generation", clock, ctx);
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
    test_component::register_table(dapp_hub, ctx);
    resource0::register_table(dapp_hub, ctx);
    resource1::register_table(dapp_hub, ctx);
    resource2::register_table(dapp_hub, ctx);
    resource3::register_table(dapp_hub, ctx);
    resource4::register_table(dapp_hub, ctx);
    resource5::register_table(dapp_hub, ctx);
    resource6::register_table(dapp_hub, ctx);
    resource7::register_table(dapp_hub, ctx);
    test_resource::register_table(dapp_hub, ctx);
    // Logic that needs to be automated once the contract is deployed
    test_project::deploy_hook::run(dapp_hub, ctx);
  }
}
