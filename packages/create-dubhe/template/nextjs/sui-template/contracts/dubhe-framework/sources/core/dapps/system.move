module dubhe::dapps_system {
    use std::ascii::String;
    use std::ascii;
    use dubhe::root_schema::Root;
    use dubhe::dapp_metadata;
    use sui::clock::Clock;
    use sui::coin;
    use sui::coin::Coin;
    use sui::sui::SUI;
    use dubhe::dapps_schema::Dapps;
    use dubhe::root_system;

    public entry fun register<UpgradeCap: key>(
        dapps: &mut Dapps,
        upgrade_cap: &UpgradeCap,
        name: String,
        description: String,
        clock: &Clock,
        coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let dapp_id = object::id_address<UpgradeCap>(upgrade_cap);
        assert!(!dapps.borrow_metadata().contains_key(dapp_id), 0);

        dapps.borrow_mut_metadata().set(
            dapp_id,
            dapp_metadata::new(
                name,
                description,
                ascii::string(b""),
                ascii::string(b""),
                clock.timestamp_ms(),
                vector[]
            )
        );
        dapps.borrow_mut_admin().set(dapp_id, ctx.sender());
        dapps.borrow_mut_version().set(dapp_id, 1);
        dapps.borrow_mut_safe_mode().set(dapp_id, false);

        let reserve_amount = dapps.borrow_reserve_amount().get();
        assert!(coin.value() == reserve_amount, 0);
        dapps.borrow_mut_reserved().borrow_mut().join(coin.into_balance());
    }

    public entry fun unregister<UpgradeCap: key>(
        dapps: &mut Dapps,
        upgrade_cap: &UpgradeCap,
        ctx: &mut TxContext
    ) {
        let dapp_id = object::id_address<UpgradeCap>(upgrade_cap);
        assert!(dapps.borrow_metadata().contains_key(dapp_id), 0);

        dapps.borrow_mut_metadata().remove(dapp_id);
        dapps.borrow_mut_admin().remove(dapp_id);
        dapps.borrow_mut_version().remove(dapp_id);
        dapps.borrow_mut_safe_mode().remove(dapp_id);

        let reserve_amount = dapps.borrow_reserve_amount().get();
        let reserve_amount = dapps.borrow_mut_reserved().borrow_mut().split(reserve_amount);
        let reserve_amount = coin::from_balance(reserve_amount, ctx);
        transfer::public_transfer(reserve_amount, ctx.sender());
    }

    public entry fun set_metadata<UpgradeCap: key>(
        dapps: &mut Dapps,
        upgrade_cap: &UpgradeCap,
        name: String,
        description: String,
        icon_url: String,
        website_url: String,
        partners: vector<String>
    ) {
        let dapp_id = object::id_address<UpgradeCap>(upgrade_cap);
        assert!(dapps.borrow_metadata().contains_key(dapp_id), 0);
        let created_at = dapps.borrow_mut_metadata().take(dapp_id).get_created_at();
        dapps.borrow_mut_metadata().set(dapp_id, dapp_metadata::new(name, description, icon_url, website_url, created_at, partners));
    }

    public entry fun transfer_ownership<UpgradeCap: key>(
        dapps: &mut Dapps,
        upgrade_cap: &UpgradeCap,
        new_admin: address,
        ctx: &mut TxContext
    ) {
        let dapp_id = object::id_address<UpgradeCap>(upgrade_cap);
        assert!(dapps.borrow_admin().get(dapp_id) == ctx.sender(), 0);
        dapps.borrow_mut_admin().set(dapp_id, new_admin);
    }

    public entry fun add_verification(dapps: &mut Dapps, root: &Root, dapp_id: address, ctx: &mut TxContext) {
        root_system::ensure_root(root, ctx);
        assert!(dapps.borrow_metadata().contains_key(dapp_id), 0);
        dapps.borrow_mut_verified().set(dapp_id, true);
    }

    public entry fun remove_verification(dapps: &mut Dapps, root: &Root, dapp_id: address, ctx: &mut TxContext) {
        root_system::ensure_root(root, ctx);
        assert!(dapps.borrow_metadata().contains_key(dapp_id), 0);
        dapps.borrow_mut_verified().remove(dapp_id);
    }
}
