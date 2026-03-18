module example::deploy_hook {
  use dubhe::dapp_service::DappHub;

  public(package) fun run(_dapp_hub: &mut DappHub, _ctx: &mut TxContext) {
  }
}
