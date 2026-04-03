module example::deploy_hook {
  use dubhe::dapp_service::DappStorage;

  public(package) fun run(_dapp_storage: &mut DappStorage, _ctx: &mut TxContext) {
  }
}
