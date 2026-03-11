module counter::deploy_hook {
  use dubhe::dapp_service::DappHub;
  use counter::value;

  public(package) fun run(_dapp_hub: &mut DappHub, _ctx: &mut TxContext) {
    value::set(_dapp_hub, 0, _ctx);
  }
}
