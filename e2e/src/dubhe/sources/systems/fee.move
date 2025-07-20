module dubhe::fee_system;
use dubhe::dapp_service::DappHub;
use dubhe::assets_system;
use dubhe::dubhe_asset_id;
use dubhe::dubhe_config;
use std::type_name;

public entry fun recharge<DappKey: drop + copy>(dapp_hub: &mut DappHub, amount: u256, ctx: &mut TxContext) {
    let dubhe_asset_id = dubhe_asset_id::get(dapp_hub);
    let receiver = dubhe_config::get_fee_to(dapp_hub);
    assets_system::transfer(dapp_hub, dubhe_asset_id, receiver, amount, ctx);

    let dapp_key = type_name::get<DappKey>().into_string();
    dapp_hub.get_dapp_store(dapp_key).recharge(amount);
}

