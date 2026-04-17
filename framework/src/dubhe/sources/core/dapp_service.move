module dubhe::dapp_service {
    use std::ascii::{String, string};
    use std::type_name::{Self, TypeName};
    use sui::bcs;
    use sui::dynamic_field;
    use dubhe::dubhe_events::{
        emit_store_set_record,
        emit_store_set_field,
        emit_store_delete_record,
    };

    // ─── Error codes ─────────────────────────────────────────────────────────

    const EInvalidKey: u64 = 2;
    /// field_names and values vectors must have the same length.
    const ELengthMismatch: u64 = 3;

    // ─── UserStorage registry key ─────────────────────────────────────────────
    //
    // Stored as a dynamic field on DappStorage to track which addresses already
    // have a UserStorage for a given DApp.  Using a dedicated struct as the key
    // prevents any collision with DApp game-data dynamic fields (which use
    // vector<vector<u8>> keys).

    public struct UserStorageRegistryKey has copy, drop, store { owner: address }

    // ─── FrameworkFeeConfig ───────────────────────────────────────────────────

    const MAX_FEE_HISTORY: u64 = 20;

    /// Snapshot of a fee update stored in the rolling fee history.
    /// Both fee components are recorded together so the history is self-contained.
    public struct FeeHistoryEntry has store, copy, drop {
        base_fee:          u256,
        bytes_fee:         u256,
        effective_from_ms: u64,
    }

    public struct FrameworkFeeConfig has store, drop {
        /// Flat charge per write operation (applied to every write regardless of size).
        base_fee_per_write:     u256,
        /// Per-byte charge applied to on-chain writes (offchain writes pay base_fee only).
        bytes_fee_per_byte:     u256,
        /// Pending base_fee increase (0 when no increase is scheduled).
        pending_base_fee:       u256,
        /// Pending bytes_fee increase (0 when no increase is scheduled).
        pending_bytes_fee:      u256,
        /// When both pending fees become effective (ms). Shared across both components.
        fee_effective_at_ms:    u64,
        treasury:               address,
        /// Pending treasury address for two-step rotation. @0x0 means no pending transfer.
        pending_treasury:       address,
        fee_history:            vector<FeeHistoryEntry>,
        /// The coin type currently accepted for credit recharges.
        /// None signals "not yet initialised" (deploy_hook hasn't run).
        accepted_coin_type:          Option<TypeName>,
        /// Pending coin type after a propose_coin_type call. None = no change in flight.
        pending_coin_type:           Option<TypeName>,
        /// Epoch-ms timestamp when pending_coin_type becomes committable (0 = no pending).
        coin_type_effective_at_ms:   u64,
    }

    // ─── FrameworkConfig — operational params managed by framework admin ──────
    //
    // Kept separate from FrameworkFeeConfig so that financial controls (treasury)
    // and operational controls (admin) can be managed independently and rotated
    // separately.

    public struct FrameworkConfig has store, drop {
        /// Default virtual free credit (MIST) automatically granted to every new DApp
        /// at creation time. 25 SUI = 25_000_000_000 MIST. 0 disables auto-grant.
        default_free_credit:             u256,
        /// Duration (ms) for which the default free credit is valid.
        /// 0 = never expires. 6 months ≈ 15_778_800_000 ms.
        default_free_credit_duration_ms: u64,
        /// Framework admin address (manages operational params).
        /// Distinct from treasury which manages financial operations.
        admin:                           address,
        /// Pending admin for two-step rotation. @0x0 means no pending transfer.
        pending_admin:                   address,
    }

    // ─── DappHub — global registry ────────────────────────────────────────────

    public struct DappHub has key, store {
        id:         UID,
        fee_config: FrameworkFeeConfig,
        config:     FrameworkConfig,
        /// Framework version used for upgrade version gating.
        /// After a framework upgrade, call bump_framework_version to
        /// increment this value; all version-gated functions using the
        /// old FRAMEWORK_VERSION constant will then abort.
        version:    u64,
    }

    // ─── DappStorage — per-DApp shared object ─────────────────────────────────

    public struct DappStorage has key, store {
        id:                      UID,
        dapp_key:                String,
        // ─── Metadata (stored directly, no dynamic field overhead) ──────────
        name:                    String,
        description:             String,
        website_url:             String,
        cover_url:               vector<String>,
        partners:                vector<String>,
        package_ids:             vector<address>,
        created_at:              u64,
        admin:                   address,
        pending_admin:           address,
        version:                 u32,
        paused:                  bool,
        // ─── Fee / credit ────────────────────────────────────────────────────
        /// Virtual free credit granted by framework admin (MIST, no SUI backing).
        /// Consumed before credit_pool during settlement (free-first priority).
        /// Set to 0 when exhausted or revoked.
        free_credit:             u256,
        /// Expiry timestamp (epoch ms) for free_credit. 0 = never expires.
        /// Expired free credit is treated as 0 in settlement and unsuspend checks.
        free_credit_expires_at:  u64,
        credit_pool:             u256,
        /// Minimum credit required to unsuspend this DApp.
        /// 0 means any positive effective credit is sufficient.
        min_credit_to_unsuspend: u256,
        suspended:               bool,
        total_settled:           u256,
        // ─── Per-DApp fee rates ───────────────────────────────────────────────
        /// Flat charge per write operation (MIST). Copied from DappHub defaults
        /// at creation time; updated by framework admin via set_dapp_fee or
        /// synced from DappHub via sync_dapp_fee.
        base_fee_per_write:      u256,
        /// Per-byte charge for on-chain writes (MIST). Same lifecycle as above.
        bytes_fee_per_byte:      u256,
    }

    // ─── UserStorage — per-user shared key object ─────────────────────────────
    //
    // UserStorage is a shared object so that:
    //   1. Canonical owner can write to it directly from their wallet.
    //   2. An authorized session key (ephemeral frontend wallet) can write on
    //      their behalf without any object transfer.
    //   3. Canonical owner can revoke or update the session key at any time
    //      because the shared object is always reachable by both parties.
    //
    // session_key == @0x0  → no active session (canonical owner only).
    // session_expires_at   → expiry deadline in epoch-clock ms (≈24h granularity
    //                        on mainnet/testnet, ≈1h on devnet). In production,
    //                        this is always >0 because activate_session enforces
    //                        a minimum duration. The value 0 only appears in test
    //                        helpers and means "no active session" when combined
    //                        with session_key == @0x0.

    public struct UserStorage has key {
        id:                 UID,
        dapp_key:           String,
        canonical_owner:    address,
        session_key:        address,
        session_expires_at: u64,
        /// Total number of write operations (offchain + onchain). Incremented on
        /// every set_record / set_field call regardless of offchain flag.
        write_count:        u64,
        settled_count:      u64,
        /// Cumulative bytes of on-chain data written (offchain writes contribute 0).
        /// Used together with write_count to compute the total settlement charge:
        ///   cost = base_fee × unsettled_writes + bytes_fee × unsettled_bytes
        write_bytes:        u256,
        settled_bytes:      u256,
    }

    // ─── Constructors ─────────────────────────────────────────────────────────

    public(package) fun new(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            fee_config: FrameworkFeeConfig {
                base_fee_per_write:  0,
                bytes_fee_per_byte:  0,
                pending_base_fee:    0,
                pending_bytes_fee:   0,
                fee_effective_at_ms: 0,
                // @0x0 signals "not yet initialised"; deploy_hook::run sets the real
                // treasury address via initialize_framework_fee on first genesis::run.
                treasury:            @0x0,
                pending_treasury:    @0x0,
                fee_history:         vector::empty(),
                accepted_coin_type:          option::none(),
                pending_coin_type:           option::none(),
                coin_type_effective_at_ms:   0,
            },
            config: FrameworkConfig {
                // New DApps automatically receive 25 SUI of free credit valid for 6 months.
                // 25 SUI = 25_000_000_000 MIST; 6 months ≈ 15_778_800_000 ms.
                default_free_credit:             25_000_000_000,
                default_free_credit_duration_ms: 15_778_800_000,
                admin:                           ctx.sender(),
                pending_admin:                   @0x0,
            },
            version: 1,
        }
    }

    public(package) fun new_dapp_storage<DappKey: copy + drop>(
        name:                   String,
        description:            String,
        package_ids:            vector<address>,
        created_at:             u64,
        admin:                  address,
        free_credit:            u256,
        free_credit_expires_at: u64,
        base_fee_per_write:     u256,
        bytes_fee_per_byte:     u256,
        ctx:                    &mut TxContext,
    ): DappStorage {
        DappStorage {
            id:                      object::new(ctx),
            dapp_key:                type_name::get<DappKey>().into_string(),
            name,
            description,
            website_url:             string(b""),
            cover_url:               vector::empty(),
            partners:                vector::empty(),
            package_ids,
            created_at,
            admin,
            pending_admin:           @0x0,
            version:                 1,
            paused:                  false,
            free_credit,
            free_credit_expires_at,
            credit_pool:             0,
            min_credit_to_unsuspend: 0,
            suspended:               false,
            total_settled:           0,
            base_fee_per_write,
            bytes_fee_per_byte,
        }
    }

    public(package) fun new_user_storage<DappKey: copy + drop>(
        owner: address,
        ctx:   &mut TxContext,
    ): UserStorage {
        UserStorage {
            id:                 object::new(ctx),
            dapp_key:           type_name::get<DappKey>().into_string(),
            canonical_owner:    owner,
            session_key:        @0x0,
            session_expires_at: 0,
            write_count:        0,
            settled_count:      0,
            write_bytes:        0,
            settled_bytes:      0,
        }
    }

    // ─── DappHub: fee config accessors ────────────────────────────────────────

    public fun get_fee_config(dh: &DappHub): &FrameworkFeeConfig {
        &dh.fee_config
    }

    public(package) fun get_fee_config_mut(dh: &mut DappHub): &mut FrameworkFeeConfig {
        &mut dh.fee_config
    }

    public fun base_fee_per_write(cfg: &FrameworkFeeConfig): u256  { cfg.base_fee_per_write }
    public fun bytes_fee_per_byte(cfg: &FrameworkFeeConfig): u256  { cfg.bytes_fee_per_byte }
    public fun pending_base_fee(cfg: &FrameworkFeeConfig): u256    { cfg.pending_base_fee }
    public fun pending_bytes_fee(cfg: &FrameworkFeeConfig): u256   { cfg.pending_bytes_fee }
    public fun fee_effective_at_ms(cfg: &FrameworkFeeConfig): u64  { cfg.fee_effective_at_ms }
    public fun treasury(cfg: &FrameworkFeeConfig): address         { cfg.treasury }
    public fun pending_treasury(cfg: &FrameworkFeeConfig): address { cfg.pending_treasury }

    public fun accepted_coin_type(cfg: &FrameworkFeeConfig): &Option<TypeName> {
        &cfg.accepted_coin_type
    }
    public fun pending_coin_type(cfg: &FrameworkFeeConfig): &Option<TypeName> {
        &cfg.pending_coin_type
    }
    public fun coin_type_effective_at_ms(cfg: &FrameworkFeeConfig): u64 {
        cfg.coin_type_effective_at_ms
    }

    public(package) fun set_base_fee_per_write(cfg: &mut FrameworkFeeConfig, fee: u256) {
        cfg.base_fee_per_write = fee;
    }
    public(package) fun set_bytes_fee_per_byte(cfg: &mut FrameworkFeeConfig, fee: u256) {
        cfg.bytes_fee_per_byte = fee;
    }
    public(package) fun set_pending_base_fee(cfg: &mut FrameworkFeeConfig, fee: u256) {
        cfg.pending_base_fee = fee;
    }
    public(package) fun set_pending_bytes_fee(cfg: &mut FrameworkFeeConfig, fee: u256) {
        cfg.pending_bytes_fee = fee;
    }
    public(package) fun set_fee_effective_at_ms(cfg: &mut FrameworkFeeConfig, ts: u64) {
        cfg.fee_effective_at_ms = ts;
    }
    public(package) fun set_treasury(cfg: &mut FrameworkFeeConfig, addr: address) {
        cfg.treasury = addr;
    }
    public(package) fun set_pending_treasury(cfg: &mut FrameworkFeeConfig, addr: address) {
        cfg.pending_treasury = addr;
    }

    public(package) fun set_accepted_coin_type(cfg: &mut FrameworkFeeConfig, t: TypeName) {
        cfg.accepted_coin_type = option::some(t);
    }
    public(package) fun set_pending_coin_type(cfg: &mut FrameworkFeeConfig, t: Option<TypeName>) {
        cfg.pending_coin_type = t;
    }
    public(package) fun set_coin_type_effective_at_ms(cfg: &mut FrameworkFeeConfig, ms: u64) {
        cfg.coin_type_effective_at_ms = ms;
    }

    public(package) fun push_fee_history(
        cfg:      &mut FrameworkFeeConfig,
        base_fee: u256,
        bytes_fee: u256,
        ts:       u64,
    ) {
        cfg.fee_history.push_back(FeeHistoryEntry {
            base_fee,
            bytes_fee,
            effective_from_ms: ts,
        });
        if (cfg.fee_history.length() > MAX_FEE_HISTORY) {
            cfg.fee_history.remove(0);
        };
    }

    public fun is_fee_config_initialized(dh: &DappHub): bool {
        dh.fee_config.treasury != @0x0
    }

    // ─── DappHub: framework config accessors ─────────────────────────────────

    public fun get_config(dh: &DappHub): &FrameworkConfig {
        &dh.config
    }

    public(package) fun get_config_mut(dh: &mut DappHub): &mut FrameworkConfig {
        &mut dh.config
    }

    public fun default_free_credit(cfg: &FrameworkConfig): u256             { cfg.default_free_credit }
    public fun default_free_credit_duration_ms(cfg: &FrameworkConfig): u64  { cfg.default_free_credit_duration_ms }
    public fun framework_admin(cfg: &FrameworkConfig): address              { cfg.admin }
    public fun pending_framework_admin(cfg: &FrameworkConfig): address      { cfg.pending_admin }

    public(package) fun set_default_free_credit(cfg: &mut FrameworkConfig, amount: u256, duration_ms: u64) {
        cfg.default_free_credit             = amount;
        cfg.default_free_credit_duration_ms = duration_ms;
    }
    public(package) fun set_framework_admin(cfg: &mut FrameworkConfig, addr: address) {
        cfg.admin = addr;
    }
    public(package) fun set_pending_framework_admin(cfg: &mut FrameworkConfig, addr: address) {
        cfg.pending_admin = addr;
    }

    // ─── DappHub: version accessors ──────────────────────────────────────────

    public fun framework_version(dh: &DappHub): u64 { dh.version }

    public(package) fun set_framework_version(dh: &mut DappHub, v: u64) {
        dh.version = v;
    }

    // ─── DappStorage: metadata accessors ─────────────────────────────────────

    public fun dapp_storage_dapp_key(ds: &DappStorage): String       { ds.dapp_key }
    public fun dapp_name(ds: &DappStorage): String                   { ds.name }
    public fun dapp_description(ds: &DappStorage): String            { ds.description }
    public fun dapp_website_url(ds: &DappStorage): String            { ds.website_url }
    public fun dapp_cover_url(ds: &DappStorage): vector<String>      { ds.cover_url }
    public fun dapp_partners(ds: &DappStorage): vector<String>       { ds.partners }
    public fun dapp_package_ids(ds: &DappStorage): vector<address>   { ds.package_ids }
    public fun dapp_created_at(ds: &DappStorage): u64                { ds.created_at }
    public fun dapp_admin(ds: &DappStorage): address                 { ds.admin }
    public fun dapp_pending_admin(ds: &DappStorage): address         { ds.pending_admin }
    public fun dapp_version(ds: &DappStorage): u32                   { ds.version }
    public fun dapp_paused(ds: &DappStorage): bool                   { ds.paused }

    public(package) fun set_dapp_name(ds: &mut DappStorage, v: String)                { ds.name = v; }
    public(package) fun set_dapp_description(ds: &mut DappStorage, v: String)         { ds.description = v; }
    public(package) fun set_dapp_website_url(ds: &mut DappStorage, v: String)         { ds.website_url = v; }
    public(package) fun set_dapp_cover_url(ds: &mut DappStorage, v: vector<String>)   { ds.cover_url = v; }
    public(package) fun set_dapp_partners(ds: &mut DappStorage, v: vector<String>)    { ds.partners = v; }
    public(package) fun set_dapp_package_ids(ds: &mut DappStorage, v: vector<address>) { ds.package_ids = v; }
    public(package) fun set_dapp_admin(ds: &mut DappStorage, v: address)              { ds.admin = v; }
    public(package) fun set_dapp_pending_admin(ds: &mut DappStorage, v: address)      { ds.pending_admin = v; }
    public(package) fun set_dapp_version(ds: &mut DappStorage, v: u32)               { ds.version = v; }
    public(package) fun set_dapp_paused(ds: &mut DappStorage, v: bool)               { ds.paused = v; }

    // ─── DappStorage: fee/credit accessors ───────────────────────────────────

    public fun free_credit(ds: &DappStorage): u256              { ds.free_credit }
    public fun free_credit_expires_at(ds: &DappStorage): u64    { ds.free_credit_expires_at }
    public fun credit_pool(ds: &DappStorage): u256              { ds.credit_pool }
    public fun min_credit_to_unsuspend(ds: &DappStorage): u256  { ds.min_credit_to_unsuspend }
    public fun is_suspended(ds: &DappStorage): bool             { ds.suspended }
    public fun total_settled(ds: &DappStorage): u256            { ds.total_settled }

    /// Returns the usable free credit at the given timestamp.
    /// Returns 0 if the free credit has expired (expires_at != 0 and now >= expires_at).
    public fun effective_free_credit(ds: &DappStorage, now_ms: u64): u256 {
        let expires = ds.free_credit_expires_at;
        if (expires == 0 || now_ms < expires) { ds.free_credit } else { 0 }
    }

    /// Returns the total effective credit available: non-expired free credit + paid credit.
    /// Used by unsuspend_dapp to check whether the DApp has sufficient capacity.
    public fun effective_total_credit(ds: &DappStorage, now_ms: u64): u256 {
        effective_free_credit(ds, now_ms) + ds.credit_pool
    }

    public(package) fun set_free_credit(ds: &mut DappStorage, amount: u256, expires_at: u64) {
        ds.free_credit            = amount;
        ds.free_credit_expires_at = expires_at;
    }

    public(package) fun deduct_free_credit(ds: &mut DappStorage, amount: u256) {
        ds.free_credit = ds.free_credit - amount;
    }

    public(package) fun add_credit(ds: &mut DappStorage, amount: u256) {
        ds.credit_pool = ds.credit_pool + amount;
    }

    public(package) fun deduct_credit(ds: &mut DappStorage, amount: u256) {
        ds.credit_pool = ds.credit_pool - amount;
    }

    public(package) fun set_suspended(ds: &mut DappStorage, val: bool) {
        ds.suspended = val;
    }

    public(package) fun add_total_settled(ds: &mut DappStorage, count: u256) {
        ds.total_settled = ds.total_settled + count;
    }

    public(package) fun set_min_credit_to_unsuspend(ds: &mut DappStorage, val: u256) {
        ds.min_credit_to_unsuspend = val;
    }

    // ─── DappStorage: per-DApp fee rate accessors ─────────────────────────────

    public fun dapp_base_fee_per_write(ds: &DappStorage): u256 { ds.base_fee_per_write }
    public fun dapp_bytes_fee_per_byte(ds: &DappStorage): u256 { ds.bytes_fee_per_byte }

    public(package) fun set_dapp_base_fee_per_write(ds: &mut DappStorage, fee: u256) {
        ds.base_fee_per_write = fee;
    }
    public(package) fun set_dapp_bytes_fee_per_byte(ds: &mut DappStorage, fee: u256) {
        ds.bytes_fee_per_byte = fee;
    }

    // ─── UserStorage: accessors ───────────────────────────────────────────────

    public fun user_storage_dapp_key(us: &UserStorage): String { us.dapp_key }
    public fun canonical_owner(us: &UserStorage): address { us.canonical_owner }
    public fun session_key(us: &UserStorage): address { us.session_key }
    public fun session_expires_at(us: &UserStorage): u64 { us.session_expires_at }
    public fun write_count(us: &UserStorage): u64    { us.write_count }
    public fun settled_count(us: &UserStorage): u64  { us.settled_count }
    public fun write_bytes(us: &UserStorage): u256   { us.write_bytes }
    public fun settled_bytes(us: &UserStorage): u256 { us.settled_bytes }
    public fun unsettled_count(us: &UserStorage): u64  { us.write_count - us.settled_count }
    public fun unsettled_bytes(us: &UserStorage): u256 { us.write_bytes - us.settled_bytes }

    /// Compute the monetary value of unsettled writes using the provided fee rates.
    /// Useful for off-chain monitoring tools and explorers.
    /// Note: the framework write-limit guard uses a write count (MAX_UNSETTLED_WRITES),
    /// not this monetary value. This function is informational only.
    public fun compute_unsettled_charge(
        us:         &UserStorage,
        base_fee:   u256,
        bytes_fee:  u256,
    ): u256 {
        base_fee * ((us.write_count - us.settled_count) as u256)
            + bytes_fee * (us.write_bytes - us.settled_bytes)
    }

    /// Returns true if `sender` is allowed to write to this UserStorage right now.
    ///
    /// Authorised callers:
    ///   - canonical_owner: always allowed.
    ///   - session_key: allowed when session_key != @0x0, sender matches, and
    ///     the session has not yet expired.
    ///
    /// `now_ms` should be ctx.epoch_timestamp_ms() (≈24h granularity on mainnet/
    /// testnet, ≈1h on devnet).  Session expiry is therefore a soft deadline with
    /// up to one epoch of tolerance.  The canonical owner can always revoke early
    /// via deactivate_session.
    ///
    /// NOTE: In normal usage, session_expires_at is always > 0 because
    /// activate_session enforces a minimum duration (MIN_SESSION_DURATION_MS).
    /// The only way to reach session_expires_at == 0 with a non-zero session_key
    /// is via test helpers, which represents a "never expires" state used only in
    /// tests.
    public fun is_write_authorized(us: &UserStorage, sender: address, now_ms: u64): bool {
        if (sender == us.canonical_owner) { return true };
        if (us.session_key == @0x0)       { return false };
        if (sender != us.session_key)     { return false };
        if (us.session_expires_at > 0 && now_ms >= us.session_expires_at) { return false };
        true
    }

    public(package) fun set_session_key(us: &mut UserStorage, key: address) {
        us.session_key = key;
    }

    public(package) fun set_session_expires_at(us: &mut UserStorage, ts: u64) {
        us.session_expires_at = ts;
    }

    /// Clear the active session (set key to @0x0 and expiry to 0).
    public(package) fun clear_session(us: &mut UserStorage) {
        us.session_key        = @0x0;
        us.session_expires_at = 0;
    }

    public(package) fun increment_write_count(us: &mut UserStorage) {
        us.write_count = us.write_count + 1;
    }

    /// Accumulate `bytes` into write_bytes (called for on-chain writes only).
    public(package) fun add_write_bytes(us: &mut UserStorage, bytes: u256) {
        us.write_bytes = us.write_bytes + bytes;
    }

    public(package) fun add_settled_count(us: &mut UserStorage, count: u64) {
        us.settled_count = us.settled_count + count;
    }

    public(package) fun add_settled_bytes(us: &mut UserStorage, bytes: u256) {
        us.settled_bytes = us.settled_bytes + bytes;
    }

    public(package) fun set_settled_to_write(us: &mut UserStorage) {
        us.settled_count = us.write_count;
        us.settled_bytes = us.write_bytes;
    }

    // Keep old name as alias so existing call sites compile during transition.
    public(package) fun set_settled_count_to_write_count(us: &mut UserStorage) {
        set_settled_to_write(us);
    }

    // ─── Global record operations (stored on DappStorage dynamic fields) ──────
    //
    // Storage layout — per-field model:
    //   sentinel   dynamic_field  key = record_key               value type = bool
    //   field data dynamic_field  key = [record_key, field_name]  value type = vector<u8>
    //
    // record_key = [TABLE_NAME, key_field0, key_field1, ...]
    //
    // This makes field access order-independent: reordering fields in
    // dubhe.config.ts has zero effect on stored data.

    public(package) fun set_global_record<DappKey: copy + drop>(
        ds:          &mut DappStorage,
        mut key:     vector<vector<u8>>,
        field_names: vector<vector<u8>>,
        values:      vector<vector<u8>>,
        offchain:    bool,
        _ctx:        &mut TxContext,
    ) {
        let len = field_names.length();
        assert!(len == values.length(), ELengthMismatch);
        let dapp_key_str = type_name::get<DappKey>().into_string();
        if (offchain) {
            emit_store_set_record(dapp_key_str, dapp_key_str, key, values);
            return
        };
        // Write sentinel to mark record as existing.
        if (!dynamic_field::exists_(&ds.id, key)) {
            dynamic_field::add(&mut ds.id, key, true);
        };
        // Write each field at [key..., field_name]. Mutate key in-place to avoid
        // allocating a separate field_key vector on every iteration.
        let mut i = 0u64;
        while (i < len) {
            let fv = *values.borrow(i);
            key.push_back(*field_names.borrow(i));
            if (dynamic_field::exists_(&ds.id, key)) {
                *dynamic_field::borrow_mut<vector<vector<u8>>, vector<u8>>(&mut ds.id, key) = fv;
            } else {
                dynamic_field::add(&mut ds.id, key, fv);
            };
            key.pop_back();
            i = i + 1;
        };
        emit_store_set_record(dapp_key_str, dapp_key_str, key, values);
    }

    /// Update a single named field within an existing record.
    /// Aborts with EInvalidKey if the sentinel (record) does not exist — callers
    /// must call set_global_record first to create the record.
    public(package) fun set_global_field<DappKey: copy + drop>(
        ds:          &mut DappStorage,
        mut key:     vector<vector<u8>>,
        field_name:  vector<u8>,
        field_value: vector<u8>,
    ) {
        // Require sentinel to exist: prevent ghost fields that have no parent record.
        assert!(dynamic_field::exists_(&ds.id, key), EInvalidKey);
        let dapp_key_str = type_name::get<DappKey>().into_string();
        key.push_back(field_name);
        if (dynamic_field::exists_(&ds.id, key)) {
            *dynamic_field::borrow_mut<vector<vector<u8>>, vector<u8>>(&mut ds.id, key) = field_value;
        } else {
            dynamic_field::add(&mut ds.id, key, field_value);
        };
        key.pop_back();
        emit_store_set_field(dapp_key_str, dapp_key_str, key, field_name, field_value);
    }

    public fun get_global_field<DappKey: copy + drop>(
        ds:         &DappStorage,
        mut key:    vector<vector<u8>>,
        field_name: vector<u8>,
    ): vector<u8> {
        key.push_back(field_name);
        assert!(dynamic_field::exists_(&ds.id, key), EInvalidKey);
        *dynamic_field::borrow<vector<vector<u8>>, vector<u8>>(&ds.id, key)
    }

    public fun has_global_record<DappKey: copy + drop>(
        ds:  &DappStorage,
        key: vector<vector<u8>>,
    ): bool {
        dynamic_field::exists_(&ds.id, key)
    }

    public fun ensure_has_global_record<DappKey: copy + drop>(
        ds:  &DappStorage,
        key: vector<vector<u8>>,
    ) {
        assert!(has_global_record<DappKey>(ds, key), EInvalidKey);
    }

    public fun ensure_has_not_global_record<DappKey: copy + drop>(
        ds:  &DappStorage,
        key: vector<vector<u8>>,
    ) {
        assert!(!has_global_record<DappKey>(ds, key), EInvalidKey);
    }

    /// Delete a record and all its named fields in a single call.
    /// Emits DeleteRecord, then removes each field dynamic field followed by the sentinel.
    ///
    /// IMPORTANT — orphaned-field warning:
    /// `field_names` must enumerate EVERY field name ever stored in this record across
    /// all schema versions. Missing field names leave orphaned dynamic fields.
    /// Always regenerate delete functions after a schema upgrade.
    public(package) fun delete_global_record<DappKey: copy + drop>(
        ds:          &mut DappStorage,
        mut key:     vector<vector<u8>>,
        field_names: vector<vector<u8>>,
    ) {
        let dapp_key_str = type_name::get<DappKey>().into_string();
        assert!(dynamic_field::exists_(&ds.id, key), EInvalidKey);
        emit_store_delete_record(dapp_key_str, dapp_key_str, key);
        // Remove each per-field dynamic field before the sentinel.
        let len = field_names.length();
        let mut i = 0u64;
        while (i < len) {
            key.push_back(*field_names.borrow(i));
            if (dynamic_field::exists_(&ds.id, key)) {
                let _: vector<u8> = dynamic_field::remove(&mut ds.id, key);
            };
            key.pop_back();
            i = i + 1;
        };
        let _: bool = dynamic_field::remove(&mut ds.id, key);
    }

    /// Delete a single named field. Silently skips if the field does not exist.
    public(package) fun delete_global_field<DappKey: copy + drop>(
        ds:         &mut DappStorage,
        mut key:    vector<vector<u8>>,
        field_name: vector<u8>,
    ) {
        key.push_back(field_name);
        if (dynamic_field::exists_(&ds.id, key)) {
            let _: vector<u8> = dynamic_field::remove(&mut ds.id, key);
        };
    }

    // ─── User record operations (stored on UserStorage dynamic fields) ─────────
    //
    // Same per-field layout as global records, but stored on UserStorage.id.

    public(package) fun set_user_record<DappKey: copy + drop>(
        us:          &mut UserStorage,
        mut key:     vector<vector<u8>>,
        field_names: vector<vector<u8>>,
        values:      vector<vector<u8>>,
        offchain:    bool,
    ) {
        let len = field_names.length();
        assert!(len == values.length(), ELengthMismatch);
        let dapp_key_str = type_name::get<DappKey>().into_string();
        let account = us.canonical_owner.to_ascii_string();
        if (offchain) {
            emit_store_set_record(dapp_key_str, account, key, values);
            return
        };
        if (!dynamic_field::exists_(&us.id, key)) {
            dynamic_field::add(&mut us.id, key, true);
        };
        let mut i = 0u64;
        while (i < len) {
            let fv = *values.borrow(i);
            key.push_back(*field_names.borrow(i));
            if (dynamic_field::exists_(&us.id, key)) {
                *dynamic_field::borrow_mut<vector<vector<u8>>, vector<u8>>(&mut us.id, key) = fv;
            } else {
                dynamic_field::add(&mut us.id, key, fv);
            };
            key.pop_back();
            i = i + 1;
        };
        emit_store_set_record(dapp_key_str, account, key, values);
    }

    /// Update a single named field within an existing record.
    /// Aborts with EInvalidKey if the sentinel (record) does not exist.
    public(package) fun set_user_field<DappKey: copy + drop>(
        us:          &mut UserStorage,
        mut key:     vector<vector<u8>>,
        field_name:  vector<u8>,
        field_value: vector<u8>,
    ) {
        // Require sentinel to exist: prevent ghost fields that have no parent record.
        assert!(dynamic_field::exists_(&us.id, key), EInvalidKey);
        let dapp_key_str = type_name::get<DappKey>().into_string();
        let account = us.canonical_owner.to_ascii_string();
        key.push_back(field_name);
        if (dynamic_field::exists_(&us.id, key)) {
            *dynamic_field::borrow_mut<vector<vector<u8>>, vector<u8>>(&mut us.id, key) = field_value;
        } else {
            dynamic_field::add(&mut us.id, key, field_value);
        };
        key.pop_back();
        emit_store_set_field(dapp_key_str, account, key, field_name, field_value);
    }

    public fun get_user_field<DappKey: copy + drop>(
        us:         &UserStorage,
        mut key:    vector<vector<u8>>,
        field_name: vector<u8>,
    ): vector<u8> {
        key.push_back(field_name);
        assert!(dynamic_field::exists_(&us.id, key), EInvalidKey);
        *dynamic_field::borrow<vector<vector<u8>>, vector<u8>>(&us.id, key)
    }

    public fun has_user_record<DappKey: copy + drop>(
        us:  &UserStorage,
        key: vector<vector<u8>>,
    ): bool {
        dynamic_field::exists_(&us.id, key)
    }

    public fun ensure_has_user_record<DappKey: copy + drop>(
        us:  &UserStorage,
        key: vector<vector<u8>>,
    ) {
        assert!(has_user_record<DappKey>(us, key), EInvalidKey);
    }

    public fun ensure_has_not_user_record<DappKey: copy + drop>(
        us:  &UserStorage,
        key: vector<vector<u8>>,
    ) {
        assert!(!has_user_record<DappKey>(us, key), EInvalidKey);
    }

    /// Delete a user record and all its named fields in a single call.
    ///
    /// IMPORTANT — orphaned-field warning:
    /// `field_names` must enumerate EVERY field name that was ever stored in this
    /// record across all schema versions. Fields not listed here are silently skipped
    /// and left as orphaned dynamic fields on the object, wasting storage and
    /// making future record recreation inconsistent.
    /// Always regenerate delete functions after a schema upgrade (new fields added).
    public(package) fun delete_user_record<DappKey: copy + drop>(
        us:          &mut UserStorage,
        mut key:     vector<vector<u8>>,
        field_names: vector<vector<u8>>,
    ) {
        let dapp_key_str = type_name::get<DappKey>().into_string();
        let account = us.canonical_owner.to_ascii_string();
        assert!(dynamic_field::exists_(&us.id, key), EInvalidKey);
        emit_store_delete_record(dapp_key_str, account, key);
        let len = field_names.length();
        let mut i = 0u64;
        while (i < len) {
            key.push_back(*field_names.borrow(i));
            if (dynamic_field::exists_(&us.id, key)) {
                let _: vector<u8> = dynamic_field::remove(&mut us.id, key);
            };
            key.pop_back();
            i = i + 1;
        };
        let _: bool = dynamic_field::remove(&mut us.id, key);
    }

    /// Delete a single named field. Silently skips if the field does not exist.
    public(package) fun delete_user_field<DappKey: copy + drop>(
        us:         &mut UserStorage,
        mut key:    vector<vector<u8>>,
        field_name: vector<u8>,
    ) {
        key.push_back(field_name);
        if (dynamic_field::exists_(&us.id, key)) {
            let _: vector<u8> = dynamic_field::remove(&mut us.id, key);
        };
    }

    // ─── Genesis registry (one-shot guard per DApp) ───────────────────────────
    //
    // Stored as a dynamic field on DappHub keyed by the phantom DappKey type.
    // Using a phantom type parameter (rather than a String) avoids the type-name
    // conversion and is checked at compile time.
    //
    // Prevents genesis::run → create_dapp from being called more than once per
    // DApp, even if someone rewrites genesis.move to drop the guard.

    public struct DappGenesisKey<phantom DappKey> has copy, drop, store {}

    /// Mark that genesis has been executed for the given DApp type.
    public(package) fun set_dapp_genesis_done<DappKey: copy + drop>(dh: &mut DappHub) {
        dynamic_field::add(&mut dh.id, DappGenesisKey<DappKey> {}, true);
    }

    /// Returns true iff genesis has already been executed for the given DApp type.
    public fun is_dapp_genesis_done<DappKey: copy + drop>(dh: &DappHub): bool {
        dynamic_field::exists_(&dh.id, DappGenesisKey<DappKey> {})
    }

    // ─── UserStorage registry (one-per-address enforcement) ──────────────────

    /// Mark that `owner` has a UserStorage for this DApp.
    /// Called exactly once per address, inside create_user_storage.
    public(package) fun register_user_storage(ds: &mut DappStorage, owner: address) {
        dynamic_field::add(&mut ds.id, UserStorageRegistryKey { owner }, true);
    }

    /// Returns true iff `owner` already has a registered UserStorage for this DApp.
    public fun has_registered_user_storage(ds: &DappStorage, owner: address): bool {
        dynamic_field::exists_(&ds.id, UserStorageRegistryKey { owner })
    }

    // ─── Share helper ─────────────────────────────────────────────────────────

    /// Publish UserStorage as a shared object.
    /// Must be called from the defining module since UserStorage lacks `store`.
    /// After sharing, any transaction can reference the object; write access is
    /// controlled by is_write_authorized.
    public(package) fun share_user_storage(us: UserStorage) {
        sui::transfer::share_object(us);
    }

    // ─── Fee state snapshot ───────────────────────────────────────────────────

    /// Emit a SetRecord event that snapshots the current fee-related fields of
    /// DappStorage so the off-chain indexer can update store_dapp_fee_state.
    /// The event carries the user DApp's dapp_key, so original_package_id in
    /// the indexer config matches naturally — no special-casing required.
    /// Called by dapp_system after every operation that mutates fee state.
    public(package) fun emit_fee_state_record<DappKey: copy + drop>(ds: &DappStorage) {
        let dapp_key_str = type_name::get<DappKey>().into_string();
        let key = vector[b"dapp_fee_state"];
        let values = vector[
            bcs::to_bytes(&ds.base_fee_per_write),
            bcs::to_bytes(&ds.bytes_fee_per_byte),
            bcs::to_bytes(&ds.free_credit),
            bcs::to_bytes(&ds.credit_pool),
            bcs::to_bytes(&ds.total_settled),
            bcs::to_bytes(&ds.suspended),
        ];
        emit_store_set_record(dapp_key_str, dapp_key_str, key, values);
    }

    // ─── Module init ─────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        sui::transfer::public_share_object(new(ctx));
    }

    // ─── Test helpers ─────────────────────────────────────────────────────────

    #[test_only]
    use sui::sui::SUI;

    #[test_only]
    public(package) fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            fee_config: FrameworkFeeConfig {
                base_fee_per_write:  1000,
                bytes_fee_per_byte:  10,
                pending_base_fee:    0,
                pending_bytes_fee:   0,
                fee_effective_at_ms: 0,
                treasury:            ctx.sender(),
                pending_treasury:    @0x0,
                fee_history:         vector::empty(),
                accepted_coin_type:          option::some(type_name::get<SUI>()),
                pending_coin_type:           option::none(),
                coin_type_effective_at_ms:   0,
            },
            config: FrameworkConfig {
                default_free_credit:             0,
                default_free_credit_duration_ms: 0,
                admin:                           ctx.sender(),
                pending_admin:                   @0x0,
            },
            version: 1,
        }
    }

    #[test_only]
    public fun destroy_dapp_hub(dh: DappHub) {
        let DappHub { id, fee_config: _, config: _, version: _ } = dh;
        object::delete(id);
    }

    // Alias for backwards-compat with existing tests
    #[test_only]
    public fun destroy(dh: DappHub) {
        destroy_dapp_hub(dh);
    }

    /// Free-tier DappHub (both fees = 0) — for storage tests that do not test fee logic.
    #[test_only]
    public(package) fun create_free_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            fee_config: FrameworkFeeConfig {
                base_fee_per_write:  0,
                bytes_fee_per_byte:  0,
                pending_base_fee:    0,
                pending_bytes_fee:   0,
                fee_effective_at_ms: 0,
                treasury:            ctx.sender(),
                pending_treasury:    @0x0,
                fee_history:         vector::empty(),
                accepted_coin_type:          option::some(type_name::get<SUI>()),
                pending_coin_type:           option::none(),
                coin_type_effective_at_ms:   0,
            },
            config: FrameworkConfig {
                default_free_credit:             0,
                default_free_credit_duration_ms: 0,
                admin:                           ctx.sender(),
                pending_admin:                   @0x0,
            },
            version: 1,
        }
    }

    #[test_only]
    public fun create_dapp_storage_for_testing<DappKey: copy + drop>(ctx: &mut TxContext): DappStorage {
        new_dapp_storage<DappKey>(
            string(b"Test DApp"),
            string(b""),
            vector::empty(),
            0,
            ctx.sender(),
            0,
            0,
            0,
            0,
            ctx,
        )
    }

    #[test_only]
    public fun destroy_dapp_storage(ds: DappStorage) {
        let DappStorage { id, .. } = ds;
        object::delete(id);
    }

    #[test_only]
    public fun create_user_storage_for_testing<DappKey: copy + drop>(
        owner: address,
        ctx:   &mut TxContext,
    ): UserStorage {
        new_user_storage<DappKey>(owner, ctx)
    }

    #[test_only]
    public fun set_session_key_for_testing(us: &mut UserStorage, key: address, expires_at: u64) {
        us.session_key        = key;
        us.session_expires_at = expires_at;
    }

    #[test_only]
    public fun destroy_user_storage(us: UserStorage) {
        let UserStorage { id, .. } = us;
        object::delete(id);
    }
}
