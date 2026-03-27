module dubhe::session_registry {
    use std::ascii::String;
    use sui::dynamic_field;
    use dubhe::subject_id::{Self, SubjectId};

    public struct SessionRegistry has key, store {
        id: UID,
    }

    public struct SessionScopeKey has copy, drop, store {
        dapp_key: String,
        subject_kind: u8,
        subject_chain_id: u64,
        subject_raw: vector<u8>,
    }

    fun new_scope_key(dapp_key: String, subject: &SubjectId): SessionScopeKey {
        SessionScopeKey {
            dapp_key,
            subject_kind: subject_id::kind(subject),
            subject_chain_id: subject_id::chain_id(subject),
            subject_raw: subject_id::raw(subject),
        }
    }

    public fun current_version_for_subject(
        registry: &SessionRegistry,
        dapp_key: String,
        subject: &SubjectId
    ): u64 {
        let key = new_scope_key(dapp_key, subject);
        if (!dynamic_field::exists_(&registry.id, key)) {
            return 0
        };
        *dynamic_field::borrow(&registry.id, key)
    }

    public fun bump_version_for_subject(
        registry: &mut SessionRegistry,
        dapp_key: String,
        subject: &SubjectId
    ): u64 {
        let key = new_scope_key(dapp_key, subject);
        if (!dynamic_field::exists_(&registry.id, key)) {
            dynamic_field::add(&mut registry.id, key, 1u64);
            return 1
        };
        let next = *dynamic_field::borrow(&registry.id, key) + 1;
        *dynamic_field::borrow_mut(&mut registry.id, key) = next;
        next
    }

    fun init(ctx: &mut TxContext) {
        sui::transfer::public_share_object(SessionRegistry { id: object::new(ctx) });
    }

    #[test_only]
    public fun create_registry_for_testing(ctx: &mut TxContext): SessionRegistry {
        SessionRegistry { id: object::new(ctx) }
    }

    #[test_only]
    public fun destroy_for_testing(registry: SessionRegistry) {
        sui::transfer::public_freeze_object(registry);
    }
}
