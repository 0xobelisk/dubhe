#[allow(lint(share_owned))]module example::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::DappHub;

  use example::dapp_key;

  use dubhe::dapp_system;

  use std::ascii::string;

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

  use example::component15;

  use example::component16;

  use example::component17;

  use example::component18;

  use example::component19;

  use example::component20;

  use example::component21;

  use example::component22;

  use example::component23;

  use example::component24;

  use example::component25;

  use example::component26;

  use example::component27;

  use example::component28;

  use example::component29;

  use example::component30;

  use example::component31;

  use example::component32;

  use example::component33;

  use example::component34;

  use example::resource0;

  use example::resource1;

  use example::resource2;

  use example::resource3;

  use example::resource4;

  use example::resource5;

  use example::resource6;

  use example::resource7;

  use example::resource8;

  use example::resource9;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_system::create_dapp(dapp_hub, dapp_key, string(b"example"), string(b"example"), clock, ctx);
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
    component15::register_table(dapp_hub, ctx);
    component16::register_table(dapp_hub, ctx);
    component17::register_table(dapp_hub, ctx);
    component18::register_table(dapp_hub, ctx);
    component19::register_table(dapp_hub, ctx);
    component20::register_table(dapp_hub, ctx);
    component21::register_table(dapp_hub, ctx);
    component22::register_table(dapp_hub, ctx);
    component23::register_table(dapp_hub, ctx);
    component24::register_table(dapp_hub, ctx);
    component25::register_table(dapp_hub, ctx);
    component26::register_table(dapp_hub, ctx);
    component27::register_table(dapp_hub, ctx);
    component28::register_table(dapp_hub, ctx);
    component29::register_table(dapp_hub, ctx);
    component30::register_table(dapp_hub, ctx);
    component31::register_table(dapp_hub, ctx);
    component32::register_table(dapp_hub, ctx);
    component33::register_table(dapp_hub, ctx);
    component34::register_table(dapp_hub, ctx);
    resource0::register_table(dapp_hub, ctx);
    resource1::register_table(dapp_hub, ctx);
    resource2::register_table(dapp_hub, ctx);
    resource3::register_table(dapp_hub, ctx);
    resource4::register_table(dapp_hub, ctx);
    resource5::register_table(dapp_hub, ctx);
    resource6::register_table(dapp_hub, ctx);
    resource7::register_table(dapp_hub, ctx);
    resource8::register_table(dapp_hub, ctx);
    resource9::register_table(dapp_hub, ctx);
    // Logic that needs to be automated once the contract is deployed
    example::deploy_hook::run(dapp_hub, ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_system::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version, ctx);
    // Register new tables
    // ==========================================
    // ==========================================
  }
}
