module eve_extension::extension_system {
    use std::ascii::{string, String};
    use sui::event;
    use dubhe::address_system;
    use dubhe::dapp_service::DappHub;
    use eve_extension::errors;
    use eve_extension::extension_config;
    use eve_extension::player_stats;

    const GLOBAL_ACCOUNT: vector<u8> = b"global";

    const TIER_NONE: u8 = 0;
    const TIER_BRONZE: u8 = 1;
    const TIER_SILVER: u8 = 2;
    const TIER_GOLD: u8 = 3;
    const TIER_PLATINUM: u8 = 4;

    public struct ConfigInitialized has copy, drop {
        admin: address,
        max_units_per_call: u64,
    }

    public struct ConfigUpdated has copy, drop {
        admin: address,
        paused: bool,
        max_units_per_call: u64,
    }

    public struct ActionRecorded has copy, drop {
        player: String,
        units: u64,
        total_units: u64,
        call_count: u64,
        tier: u8,
        nonce: u64,
    }

    fun global_account(): String {
        string(copy GLOBAL_ACCOUNT)
    }

    fun tier_from_total(total_units: u64): u8 {
        if (total_units >= 1_000) {
            TIER_PLATINUM
        } else if (total_units >= 500) {
            TIER_GOLD
        } else if (total_units >= 100) {
            TIER_SILVER
        } else if (total_units > 0) {
            TIER_BRONZE
        } else {
            TIER_NONE
        }
    }

    public fun initialize(
        dapp_hub: &mut DappHub,
        max_units_per_call: u64,
        ctx: &mut TxContext
    ) {
        errors::invalid_max_units_error(max_units_per_call > 0);
        let global = global_account();
        errors::already_initialized_error(!extension_config::has(dapp_hub, copy global));

        let admin = ctx.sender();
        extension_config::set(dapp_hub, global, admin, false, max_units_per_call, ctx);

        event::emit(ConfigInitialized {
            admin,
            max_units_per_call
        });
    }

    public fun update_config(
        dapp_hub: &mut DappHub,
        paused: bool,
        max_units_per_call: u64,
        ctx: &mut TxContext
    ) {
        errors::invalid_max_units_error(max_units_per_call > 0);
        let global = global_account();
        errors::not_initialized_error(extension_config::has(dapp_hub, copy global));

        let (admin, _, _) = extension_config::get(dapp_hub, copy global);
        errors::admin_only_error(ctx.sender() == admin);

        extension_config::set(dapp_hub, global, admin, paused, max_units_per_call, ctx);

        event::emit(ConfigUpdated {
            admin,
            paused,
            max_units_per_call
        });
    }

    public fun record_action(
        dapp_hub: &mut DappHub,
        units: u64,
        nonce: u64,
        ctx: &mut TxContext
    ) {
        let global = global_account();
        errors::not_initialized_error(extension_config::has(dapp_hub, copy global));

        let (_, paused, max_units_per_call) = extension_config::get(dapp_hub, copy global);
        errors::paused_error(!paused);
        errors::invalid_units_error(units > 0 && units <= max_units_per_call);

        let player = address_system::ensure_origin(ctx);
        let (prev_total, prev_count, prev_nonce, _) = if (player_stats::has(dapp_hub, copy player)) {
            player_stats::get(dapp_hub, copy player)
        } else {
            (0, 0, 0, TIER_NONE)
        };
        errors::invalid_nonce_error(nonce > prev_nonce);

        let total_units = prev_total + units;
        let call_count = prev_count + 1;
        let tier = tier_from_total(total_units);
        player_stats::set(dapp_hub, copy player, total_units, call_count, nonce, tier, ctx);

        event::emit(ActionRecorded {
            player,
            units,
            total_units,
            call_count,
            tier,
            nonce
        });
    }

    /// View helper for scripts and dashboards.
    public fun read_config(dapp_hub: &DappHub): (address, bool, u64) {
        extension_config::get(dapp_hub, global_account())
    }

    /// Returns zeroed stats when player has no data yet.
    public fun read_player_stats(dapp_hub: &DappHub, player: String): (u64, u64, u64, u8) {
        if (player_stats::has(dapp_hub, copy player)) {
            player_stats::get(dapp_hub, player)
        } else {
            (0, 0, 0, TIER_NONE)
        }
    }

    /// Backward-compatible simple health function.
    public fun ping(dapp_hub: &mut DappHub, nonce: u64, ctx: &mut TxContext) {
        record_action(dapp_hub, 1, nonce, ctx);
    }
}
