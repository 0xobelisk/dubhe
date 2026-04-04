#[allow(lint(share_owned))]
module dubhe::genesis {
    use dubhe::dapp_service::DappHub;

    // The framework genesis initialises the DappHub state via deploy_hook.
    // No DappStorage is created for the framework itself — the framework is
    // infrastructure, not a DApp.
    public fun run(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
        dubhe::deploy_hook::run(dapp_hub, ctx);
    }

    // Called during framework upgrades to run any custom migration logic.
    // `dubhe upgrade` rewrites the region between the separator comments.
    public(package) fun migrate(_dapp_hub: &mut DappHub, _ctx: &mut TxContext) {
        // ==========================================
        // Add custom migration logic here.
        // ==========================================
    }
}
