module dubhe::dapp_service {
    use std::ascii::String;
    use sui::object_table;
    use sui::object_table::ObjectTable;
    use sui::dynamic_field;
    use dubhe::data_key::DataKey;
    use std::type_name;
    use dubhe::dubhe_events::{emit_store_set_record, emit_store_delete_record};

        /// Error codes
    const EInvalidKey: u64 = 2;
    const ENoPermissionPackageId: u64 = 6;


    public struct AccountData has key, store { id: UID }

    public struct AccountKey has copy, drop, store {
        account: String,
        dapp_key: String,
    }

    public(package) fun new_account_key<DappKey: copy + drop>(account: String): AccountKey {
        AccountKey {
            account,
            dapp_key: type_name::get<DappKey>().into_string(),
        }
    }

    public(package) fun new_account_data(ctx: &mut TxContext): AccountData {
        AccountData { id: object::new(ctx) }
    }

    /// Storage structure
    public struct DappHub has key, store {
        /// The unique identifier of the DappStore instance
        id: UID,
        /// Accounts 
        accounts: ObjectTable<AccountKey, AccountData>,
    }

    /// Create a new storage instance
    public(package) fun new(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            accounts: object_table::new(ctx),
        }
    }

    public(package) fun set_record<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        key: vector<vector<u8>>,
        value: vector<vector<u8>>,
        account: String,
        offchain: bool,
        ctx: &mut TxContext,
    ) {
        let dapp_key = type_name::get<DappKey>().into_string();
        if (offchain) {
            emit_store_set_record(dapp_key, account, key, value);
            return
        };
        let account_key = new_account_key<DappKey>(account);
        if (!self.accounts.contains(account_key)) {
            let mut account_data = new_account_data(ctx);
            dynamic_field::add(&mut account_data.id, key, value);
            self.accounts.add(account_key, account_data);
        } else {
            let account_data = self.accounts.borrow_mut(account_key);
            if (dynamic_field::exists_(&account_data.id, key)) {
                *dynamic_field::borrow_mut(&mut account_data.id, key) = value;
            } else {
                dynamic_field::add(&mut account_data.id, key, value);
            };
        };
        std::debug::print(&std::ascii::string(b"set_record"));
        std::debug::print(&key);
        std::debug::print(&value);
        emit_store_set_record(dapp_key, account, key, value);
    }

    /// Set a field
    public(package) fun set_field<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        key: vector<vector<u8>>,
        field_index: u8,
        field_value: vector<u8>,
        account: String,
    ) {
       let dapp_key = type_name::get<DappKey>().into_string();
       let account_key = new_account_key<DappKey>(account);
       let account_data = self.accounts.borrow_mut(account_key);
       let value = dynamic_field::borrow_mut<vector<vector<u8>>, vector<vector<u8>>>(&mut account_data.id, key);
       *value.borrow_mut(field_index as u64) = field_value;
       emit_store_set_record(dapp_key, account, key, *value)
    }

    /// Get a record
    public fun get_record<DappKey: copy + drop>(
        self: &DappHub,
        account: String,
        key: vector<vector<u8>>
    ): vector<u8> {
        let account_key = new_account_key<DappKey>(account);
        assert!(self.accounts.contains(account_key), EInvalidKey);
        let account_data = self.accounts.borrow(account_key);
        assert!(dynamic_field::exists_(&account_data.id, key), EInvalidKey);
        let value = dynamic_field::borrow(&account_data.id, key);
        std::debug::print(&key);
        std::debug::print(value);
        let mut result = vector::empty();
        let mut i = 0;
        while (i < vector::length(value)) {
            let value = vector::borrow(value, i);
            std::debug::print(value);
            std::debug::print(&account);
            vector::append(&mut result, *value);
            i = i + 1;
        };
        result
    }

    /// Get a field
    public fun get_field<DappKey: copy + drop>(
        self: &DappHub,
        account: String,
        key: vector<vector<u8>>,
        field_index: u8
    ): vector<u8> {
        let account_key = new_account_key<DappKey>(account);
        assert!(self.accounts.contains(account_key), EInvalidKey);
        let account_data = self.accounts.borrow(account_key);
        assert!(dynamic_field::exists_(&account_data.id, key), EInvalidKey);
        let value = dynamic_field::borrow(&account_data.id, key);
        let field = vector::borrow(value, field_index as u64);
        *field
    }

    public fun has_record<DappKey: copy + drop>(
        self: &DappHub,
        account: String,
        key: vector<vector<u8>>
    ): bool {
        let account_key = new_account_key<DappKey>(account);
        if (!self.accounts.contains(account_key)) {
            return false
        };
        let account_data = self.accounts.borrow(account_key);
        dynamic_field::exists_(&account_data.id, key)
    }

    public(package) fun delete_record<DappKey: copy + drop>(
        self: &mut DappHub,
        _: DappKey,
        key: vector<vector<u8>>,
        account: String,
    ): vector<vector<u8>> {
        let dapp_key = type_name::get<DappKey>().into_string();
        let account_key = new_account_key<DappKey>(account);
        assert!(self.accounts.contains(account_key), EInvalidKey);
        let account_data = self.accounts.borrow_mut(account_key);
        emit_store_delete_record(dapp_key, account, key);
        dynamic_field::remove(&mut account_data.id, key)
    }

    public fun ensure_has_record<DappKey: copy + drop>(
        self: &DappHub,
        account: String,
        key: vector<vector<u8>>
    ) {
        assert!(has_record<DappKey>(self, account, key), EInvalidKey);
    }

    public fun ensure_has_not_record<DappKey: copy + drop>(
        self: &DappHub,
        account: String,
        key: vector<vector<u8>>
    ) {
        assert!(!has_record<DappKey>(self, account, key), EInvalidKey);
    }

    fun init(ctx: &mut TxContext) {
        sui::transfer::public_share_object(
            new(ctx)
        );
    }

    #[test_only]
    public(package) fun create_dapp_hub_for_testing(ctx: &mut TxContext): DappHub {
        DappHub {
            id: object::new(ctx),
            accounts: object_table::new(ctx),
        }
    }

    #[test_only]
    public fun destroy(self: DappHub) {
        let DappHub { id, accounts } = self;
        object::delete(id);
        sui::transfer::public_freeze_object(accounts);
    }
}