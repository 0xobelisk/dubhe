module dubhe::subject_id {
    use std::ascii::String;
    use std::ascii;

    /// Subject kinds.
    const LEGACY: u8 = 0;
    const SUI: u8 = 1;
    const EVM: u8 = 2;
    const SVM: u8 = 3;

    /// Expected raw byte lengths for typed subjects.
    const SUI_LEN: u64 = 32;
    const EVM_LEN: u64 = 20;
    const SVM_LEN: u64 = 32;

    /// Error codes.
    const EInvalidSubjectKind: u64 = 1;
    const EInvalidSubjectLength: u64 = 2;

    /// Strongly typed subject identifier for cross-chain account identity.
    ///
    /// `account_key` is the storage compatibility key used by existing
    /// resource APIs so we can migrate internals without breaking callers.
    public struct SubjectId has copy, drop, store {
        kind: u8,
        chain_id: u64,
        raw: vector<u8>,
        account_key: String,
    }

    fun assert_kind(kind: u8) {
        assert!(kind == LEGACY || kind == SUI || kind == EVM || kind == SVM, EInvalidSubjectKind);
    }

    fun assert_raw_len(raw: &vector<u8>, expected: u64) {
        assert!(vector::length(raw) == expected, EInvalidSubjectLength);
    }

    public fun kind_legacy(): u8 {
        LEGACY
    }

    public fun kind_sui(): u8 {
        SUI
    }

    public fun kind_evm(): u8 {
        EVM
    }

    public fun kind_svm(): u8 {
        SVM
    }

    public(package) fun from_account(account_key: String): SubjectId {
        SubjectId {
            kind: LEGACY,
            chain_id: 0,
            raw: ascii::into_bytes(copy account_key),
            account_key,
        }
    }

    public fun from_sui(account_key: String, chain_id: u64, raw: vector<u8>): SubjectId {
        assert_raw_len(&raw, SUI_LEN);
        SubjectId {
            kind: SUI,
            chain_id,
            raw,
            account_key,
        }
    }

    public fun from_evm(account_key: String, chain_id: u64, raw: vector<u8>): SubjectId {
        assert_raw_len(&raw, EVM_LEN);
        SubjectId {
            kind: EVM,
            chain_id,
            raw,
            account_key,
        }
    }

    public fun from_svm(account_key: String, chain_id: u64, raw: vector<u8>): SubjectId {
        assert_raw_len(&raw, SVM_LEN);
        SubjectId {
            kind: SVM,
            chain_id,
            raw,
            account_key,
        }
    }

    public(package) fun kind(subject: &SubjectId): u8 {
        assert_kind(subject.kind);
        subject.kind
    }

    public(package) fun chain_id(subject: &SubjectId): u64 {
        subject.chain_id
    }

    public(package) fun raw(subject: &SubjectId): vector<u8> {
        subject.raw
    }

    public(package) fun account_key(subject: &SubjectId): String {
        subject.account_key
    }
}
