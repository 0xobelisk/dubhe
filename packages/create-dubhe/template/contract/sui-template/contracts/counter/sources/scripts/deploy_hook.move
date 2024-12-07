#[allow(lint(share_owned))]

module counter::deploy_hook {

  use dubhe::dapps_schema::Dapps;

  use dubhe::dapps_system;

  use counter::schema_hub::SchemaHub;

  use std::ascii::string;

  use sui::clock::Clock;

  use sui::sui::SUI;

  use sui::coin::Coin;

  use sui::package::UpgradeCap;

  use sui::transfer::public_share_object;

  use counter::counter_schema::Counter;

  #[test_only]

  use sui::clock;

  #[test_only]

  use sui::coin;

  #[test_only]

  use sui::test_scenario;

  #[test_only]

  use sui::package;

  #[test_only]

  use counter::schema_hub;

  #[test_only]

  use dubhe::dapps_schema;

  #[test_only]

  use sui::test_scenario::Scenario;

  public entry fun run(
    schema_hub: &mut SchemaHub,
    dapps: &mut Dapps,
    cap: &UpgradeCap,
    clock: &Clock,
    coin: Coin<SUI>,
    ctx: &mut TxContext,
  ) {
    // Register the dapp to dubhe.
    dapps_system::register(dapps,cap,string(b"counter"),string(b"counter"),clock,coin,ctx);
    // Create schemas
    let mut counter = counter::counter_schema::create(ctx);
    // Logic that needs to be automated once the contract is deployed

    counter.borrow_mut_value().set(0);

    // Authorize schemas and public share objects
    schema_hub.authorize_schema<Counter>();
    public_share_object(counter);
  }

  #[test_only]

  public fun deploy_hook_for_testing(): (Scenario, SchemaHub, Dapps) {
    let mut scenario = test_scenario::begin(@0xA);
    {
      let ctx = test_scenario::ctx(&mut scenario);
      dapps_schema::init_dapps_for_testing(ctx);
      schema_hub::init_schema_hub_for_testing(ctx);
      test_scenario::next_tx(&mut scenario,@0xA);
    };
    let mut dapps = test_scenario::take_shared<Dapps>(&scenario);
    let mut schema_hub = test_scenario::take_shared<SchemaHub>(&scenario);
    let ctx = test_scenario::ctx(&mut scenario);
    let clock = clock::create_for_testing(ctx);
    let upgrade_cap = package::test_publish(@0x42.to_id(), ctx);
    let coin  = coin::mint_for_testing<SUI>(1_000_000_000, ctx);
    run(&mut schema_hub, &mut dapps, &upgrade_cap, &clock, coin, ctx);
    clock::destroy_for_testing(clock);
    upgrade_cap.make_immutable();
    test_scenario::next_tx(&mut scenario,@0xA);
    (scenario, schema_hub, dapps)
  }
}
