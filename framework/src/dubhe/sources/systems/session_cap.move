module dubhe::session_cap {
    use std::ascii::String;
    use dubhe::subject_id::SubjectId;
    use dubhe::session_registry::{Self, SessionRegistry};
    use dubhe::type_info;

    const SCOPE_SET_RECORD: u64 = 1;
    const SCOPE_SET_FIELD: u64 = 2;
    const SCOPE_DELETE_RECORD: u64 = 4;
    const SCOPE_SET_STORAGE: u64 = 8;
    const ALL_SCOPE_MASK: u64 = 15;
    const MAX_TTL_MS: u64 = 2_592_000_000; // 30 days

    const E_INVALID_SCOPE_MASK: u64 = 1;
    const E_INVALID_EXPIRY: u64 = 2;
    const E_ZERO_DELEGATE: u64 = 3;
    const E_NO_PERMISSION: u64 = 4;
    const E_SESSION_DENIED: u64 = 5;
    const E_INVALID_MAX_USES: u64 = 6;
    const E_INVALID_NONCE: u64 = 7;

    public struct SessionCap has key, store {
        id: UID,
        dapp_key: String,
        subject: SubjectId,
        owner: address,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        version: u64,
        revoked: bool,
        max_uses: u64,
        used_uses: u64,
        next_nonce: u64,
    }

    fun is_valid_scope_mask(scope_mask: u64): bool {
        scope_mask > 0 && scope_mask <= ALL_SCOPE_MASK
    }

    fun same_string(a: &String, b: &String): bool {
        a.as_bytes() == b.as_bytes()
    }

    fun now_ms(ctx: &TxContext): u64 {
        tx_context::epoch_timestamp_ms(ctx)
    }

    fun has_remaining_uses(cap: &SessionCap): bool {
        cap.max_uses == 0 || cap.used_uses < cap.max_uses
    }

    public fun scope_set_record(): u64 {
        SCOPE_SET_RECORD
    }

    public fun scope_set_field(): u64 {
        SCOPE_SET_FIELD
    }

    public fun scope_delete_record(): u64 {
        SCOPE_DELETE_RECORD
    }

    public fun scope_set_storage(): u64 {
        SCOPE_SET_STORAGE
    }

    public fun create_session_cap<DappKey: copy + drop>(
        registry: &SessionRegistry,
        subject: SubjectId,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        ctx: &mut TxContext
    ): SessionCap {
        create_session_cap_internal<DappKey>(
            registry,
            subject,
            delegate,
            scope_mask,
            expires_at_ms,
            0,
            ctx
        )
    }

    public fun create_session_cap_with_limits<DappKey: copy + drop>(
        registry: &SessionRegistry,
        subject: SubjectId,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        max_uses: u64,
        ctx: &mut TxContext
    ): SessionCap {
        assert!(max_uses > 0, E_INVALID_MAX_USES);
        create_session_cap_internal<DappKey>(
            registry,
            subject,
            delegate,
            scope_mask,
            expires_at_ms,
            max_uses,
            ctx
        )
    }

    fun create_session_cap_internal<DappKey: copy + drop>(
        registry: &SessionRegistry,
        subject: SubjectId,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        max_uses: u64,
        ctx: &mut TxContext
    ): SessionCap {
        assert!(is_valid_scope_mask(scope_mask), E_INVALID_SCOPE_MASK);
        assert!(delegate != @0x0, E_ZERO_DELEGATE);

        let now = now_ms(ctx);
        assert!(expires_at_ms > now, E_INVALID_EXPIRY);
        assert!(expires_at_ms - now <= MAX_TTL_MS, E_INVALID_EXPIRY);

        let dapp_key = type_info::get_type_name_string<DappKey>();
        let version = session_registry::current_version_for_subject(registry, copy dapp_key, &subject);
        SessionCap {
            id: object::new(ctx),
            dapp_key,
            subject,
            owner: ctx.sender(),
            delegate,
            scope_mask,
            expires_at_ms,
            version,
            revoked: false,
            max_uses,
            used_uses: 0,
            next_nonce: 0,
        }
    }

    public fun revoke(cap: &mut SessionCap, ctx: &TxContext) {
        let sender = ctx.sender();
        assert!(sender == cap.owner || sender == cap.delegate, E_NO_PERMISSION);
        cap.revoked = true;
    }

    public fun ensure_owner(cap: &SessionCap, ctx: &TxContext) {
        assert!(ctx.sender() == cap.owner, E_NO_PERMISSION);
    }

    public fun can_write_at<DappKey: copy + drop>(
        cap: &SessionCap,
        registry: &SessionRegistry,
        op_mask: u64,
        now: u64,
        sender: address
    ): bool {
        if (!is_valid_scope_mask(op_mask)) {
            return false
        };

        let expected_dapp_key = type_info::get_type_name_string<DappKey>();
        if (!same_string(&cap.dapp_key, &expected_dapp_key)) {
            return false
        };

        if (sender != cap.delegate) {
            return false
        };
        if (cap.revoked) {
            return false
        };
        if ((cap.scope_mask & op_mask) != op_mask) {
            return false
        };
        if (!has_remaining_uses(cap)) {
            return false
        };
        if (now > cap.expires_at_ms) {
            return false
        };
        let current_version = session_registry::current_version_for_subject(
            registry,
            copy cap.dapp_key,
            &cap.subject
        );
        current_version == cap.version
    }

    public fun can_write<DappKey: copy + drop>(
        cap: &SessionCap,
        registry: &SessionRegistry,
        op_mask: u64,
        ctx: &TxContext
    ): bool {
        can_write_at<DappKey>(cap, registry, op_mask, now_ms(ctx), ctx.sender())
    }

    public fun ensure_can_write<DappKey: copy + drop>(
        cap: &SessionCap,
        registry: &SessionRegistry,
        op_mask: u64,
        ctx: &TxContext
    ): SubjectId {
        assert!(can_write<DappKey>(cap, registry, op_mask, ctx), E_SESSION_DENIED);
        cap.subject
    }

    public fun can_write_with_nonce<DappKey: copy + drop>(
        cap: &SessionCap,
        registry: &SessionRegistry,
        op_mask: u64,
        expected_nonce: u64,
        ctx: &TxContext
    ): bool {
        can_write<DappKey>(cap, registry, op_mask, ctx) && expected_nonce == cap.next_nonce
    }

    public fun ensure_can_write_with_nonce<DappKey: copy + drop>(
        cap: &SessionCap,
        registry: &SessionRegistry,
        op_mask: u64,
        expected_nonce: u64,
        ctx: &TxContext
    ): SubjectId {
        let subject = ensure_can_write<DappKey>(cap, registry, op_mask, ctx);
        assert!(expected_nonce == cap.next_nonce, E_INVALID_NONCE);
        subject
    }

    public fun consume_write_with_nonce<DappKey: copy + drop>(
        cap: &mut SessionCap,
        registry: &SessionRegistry,
        op_mask: u64,
        expected_nonce: u64,
        ctx: &TxContext
    ): SubjectId {
        let subject = ensure_can_write_with_nonce<DappKey>(
            cap,
            registry,
            op_mask,
            expected_nonce,
            ctx
        );
        cap.next_nonce = cap.next_nonce + 1;
        if (cap.max_uses != 0) {
            cap.used_uses = cap.used_uses + 1;
        };
        subject
    }

    public fun max_uses(cap: &SessionCap): u64 {
        cap.max_uses
    }

    public fun used_uses(cap: &SessionCap): u64 {
        cap.used_uses
    }

    public fun next_nonce(cap: &SessionCap): u64 {
        cap.next_nonce
    }

    public(package) fun subject(cap: &SessionCap): SubjectId {
        cap.subject
    }

    #[test_only]
    public fun destroy_for_testing(cap: SessionCap) {
        sui::transfer::public_freeze_object(cap);
    }
}
