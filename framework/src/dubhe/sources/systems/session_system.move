module dubhe::session_system {
    use std::ascii::String;
    use dubhe::subject_id;
    use dubhe::subject_id::SubjectId;
    use dubhe::session_cap::{Self, SessionCap};
    use dubhe::session_registry::{Self, SessionRegistry};
    use dubhe::dapp_system;

    public entry fun create_session_cap<DappKey: copy + drop>(
        registry: &SessionRegistry,
        subject: SubjectId,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        ctx: &mut TxContext
    ): SessionCap {
        session_cap::create_session_cap<DappKey>(
            registry,
            subject,
            delegate,
            scope_mask,
            expires_at_ms,
            ctx
        )
    }

    public entry fun create_session_cap_with_limits<DappKey: copy + drop>(
        registry: &SessionRegistry,
        subject: SubjectId,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        max_uses: u64,
        ctx: &mut TxContext
    ): SessionCap {
        session_cap::create_session_cap_with_limits<DappKey>(
            registry,
            subject,
            delegate,
            scope_mask,
            expires_at_ms,
            max_uses,
            ctx
        )
    }

    public entry fun create_session_cap_for_account<DappKey: copy + drop>(
        registry: &SessionRegistry,
        account_key: String,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        ctx: &mut TxContext
    ): SessionCap {
        let subject = subject_id::from_account(account_key);
        create_session_cap<DappKey>(registry, subject, delegate, scope_mask, expires_at_ms, ctx)
    }

    public entry fun create_session_cap_with_limits_for_account<DappKey: copy + drop>(
        registry: &SessionRegistry,
        account_key: String,
        delegate: address,
        scope_mask: u64,
        expires_at_ms: u64,
        max_uses: u64,
        ctx: &mut TxContext
    ): SessionCap {
        let subject = subject_id::from_account(account_key);
        create_session_cap_with_limits<DappKey>(
            registry,
            subject,
            delegate,
            scope_mask,
            expires_at_ms,
            max_uses,
            ctx
        )
    }

    public entry fun revoke_session_cap(cap: &mut SessionCap, ctx: &TxContext) {
        session_cap::revoke(cap, ctx)
    }

    public entry fun revoke_subject_sessions<DappKey: copy + drop>(
        registry: &mut SessionRegistry,
        cap: &SessionCap,
        ctx: &TxContext
    ) {
        session_cap::ensure_owner(cap, ctx);
        let subject = session_cap::subject(cap);
        let dapp_key = dapp_system::dapp_key<DappKey>();
        session_registry::bump_version_for_subject(registry, dapp_key, &subject);
    }

    public fun ensure_can_write<DappKey: copy + drop>(
        registry: &SessionRegistry,
        cap: &SessionCap,
        op_mask: u64,
        ctx: &TxContext
    ): SubjectId {
        session_cap::ensure_can_write<DappKey>(cap, registry, op_mask, ctx)
    }

    public fun consume_write_with_nonce<DappKey: copy + drop>(
        registry: &SessionRegistry,
        cap: &mut SessionCap,
        op_mask: u64,
        expected_nonce: u64,
        ctx: &TxContext
    ): SubjectId {
        session_cap::consume_write_with_nonce<DappKey>(
            cap,
            registry,
            op_mask,
            expected_nonce,
            ctx
        )
    }
}
