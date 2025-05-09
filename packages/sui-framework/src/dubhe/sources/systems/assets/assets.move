module dubhe::dubhe_assets_system {
    use std::ascii::String;
    use std::ascii::string;
    use dubhe::dubhe_errors::{
        asset_not_found_error, no_permission_error, not_mintable_error, not_burnable_error, account_not_found_error, asset_not_liquid_error, asset_not_frozen_error
    };
    use dubhe::dubhe_schema::Schema;
    use dubhe::dubhe_account_status;
    use dubhe::dubhe_asset_status;
    use dubhe::dubhe_assets_functions;
    use dubhe::dubhe_asset_type;
    use dubhe::dubhe_errors::not_freezable_error;
    use dubhe::dubhe_errors::invalid_metadata_error;

    /// Set the metadata of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to set the metadata in.
    /// * `asset_id`: The ID of the asset to set the metadata of.
    /// * `name`: The name of the asset.
    /// * `symbol`: The symbol of the asset.
    /// * `description`: The description of the asset.
    /// * `icon_url`: The URL of the asset's icon.
    public entry fun set_metadata(schema: &mut Schema, asset_id: u256, name: String, symbol: String, description: String, icon_url: String, ctx: &mut TxContext) {
        let admin = ctx.sender();
        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let mut asset_metadata = schema.asset_metadata()[asset_id];
        no_permission_error(asset_metadata.get_owner() == admin);

        invalid_metadata_error(!name.is_empty() && !symbol.is_empty() && !description.is_empty() && !icon_url.is_empty());

        asset_metadata.set_name(name);
        asset_metadata.set_symbol(symbol);
        asset_metadata.set_description(description);
        asset_metadata.set_icon_url(icon_url);
        schema.asset_metadata().set(asset_id, asset_metadata);
    }

    /// Mint `amount` of asset `id` to `who`. Sender must be the admin of the asset.
    /// Asset must be a mintable asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to mint the asset in.
    /// * `asset_id`: The ID of the asset to mint.
    /// * `to`: The address to mint the asset to.
    /// * `amount`: The amount of the asset to mint.
    public entry fun mint(schema: &mut Schema, asset_id: u256, to: address, amount: u256, ctx: &mut TxContext) {
        let issuer = ctx.sender();
        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let asset_metadata = schema.asset_metadata().get(asset_id);
        no_permission_error(asset_metadata.get_owner() == issuer);
        not_mintable_error(asset_metadata.get_is_mintable());

        dubhe_assets_functions::do_mint(schema, asset_id, to, amount);
    }

    /// Burn `amount` of asset `id` from `who`. Sender must be the admin of the asset.
    /// Asset must be a burnable asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to burn the asset in.
    /// * `asset_id`: The ID of the asset to burn.
    /// * `from`: The address to burn the asset from.
    /// * `amount`: The amount of the asset to burn.
    public entry fun burn(schema: &mut Schema, asset_id: u256, from: address, amount: u256, ctx: &mut TxContext) {
        let burner = ctx.sender();
        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let asset_metadata = schema.asset_metadata().get(asset_id);
        no_permission_error(asset_metadata.get_owner() == burner);
        not_burnable_error(asset_metadata.get_is_burnable());

        dubhe_assets_functions::do_burn(schema, asset_id, from, amount);
    }

    /// Disallow further unprivileged transfers of an asset `id` from an account `who`.
    /// Sender must be the admin of the asset.
    /// `who` must already exist as an entry in `Account`s of the asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to freeze the asset in.
    /// * `asset_id`: The ID of the asset to freeze.
    /// * `who`: The address to freeze the asset from.
    public entry fun freeze_address(schema: &mut Schema, asset_id: u256, who: address, ctx: &mut TxContext) {
        let freezer = ctx.sender();

        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let asset_metadata = schema.asset_metadata().get(asset_id);
        no_permission_error(asset_metadata.get_owner() == freezer);
        not_freezable_error(asset_metadata.get_is_freezable());
        account_not_found_error(schema.account().contains(asset_id, who));
        
        let mut account = schema.account()[asset_id, who];
        account.set_status(dubhe_account_status::new_frozen());
        schema.account().set(asset_id, who, account);
    }

    /// Disallow further unprivileged transfers of an asset `id` to and from an account `who`.
    /// Sender must be the admin of the asset.
    /// `who` must already exist as an entry in `Account`s of the asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to block the asset in.
    /// * `asset_id`: The ID of the asset to block.
    /// * `who`: The address to block the asset from.
    public entry fun block_address(schema: &mut Schema, asset_id: u256, who: address, ctx: &mut TxContext) {
        let blocker = ctx.sender();

        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let asset_metadata = schema.asset_metadata().get(asset_id);
        no_permission_error(asset_metadata.get_owner() == blocker);
        account_not_found_error(schema.account().contains(asset_id, who));

        let mut account = schema.account()[asset_id, who];
        account.set_status(dubhe_account_status::new_blocked());
        schema.account().set(asset_id, who, account);
    }

    /// Allow unprivileged transfers to and from an account again.
    /// Sender must be the admin of the asset.
    /// `who` must already exist as an entry in `Account`s of the asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to thaw the asset in.
    /// * `asset_id`: The ID of the asset to thaw.
    /// * `who`: The address to thaw the asset from.
    public entry fun thaw_address(schema: &mut Schema, asset_id: u256, who: address, ctx: &mut TxContext) {
        let unfreezer = ctx.sender();

        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let asset_metadata = schema.asset_metadata().get(asset_id);
        no_permission_error(asset_metadata.get_owner() == unfreezer);
        account_not_found_error(schema.account().contains(asset_id, who));

        let mut account = schema.account()[asset_id, who];
        account.set_status(dubhe_account_status::new_liquid());
        schema.account().set(asset_id, who, account);
    }

    /// Disallow further unprivileged transfers for the asset class.
    /// Sender must be the admin of the asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to freeze the asset in.
    /// * `asset_id`: The ID of the asset to freeze.
    public entry fun freeze_asset(schema: &mut Schema, asset_id: u256, ctx: &mut TxContext) {
        let freezer = ctx.sender();

        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let mut asset_metadata = schema.asset_metadata()[asset_id];
        asset_not_liquid_error(asset_metadata.get_status() == dubhe_asset_status::new_liquid());
        no_permission_error(asset_metadata.get_owner() == freezer);

        asset_metadata.set_status(dubhe_asset_status::new_frozen());
        schema.asset_metadata().set(asset_id, asset_metadata);
    }

    /// Allow unprivileged transfers for the asset again.
    /// Sender must be the admin of the asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to thaw the asset in.
    /// * `asset_id`: The ID of the asset to thaw.
    public entry fun thaw_asset(schema: &mut Schema, asset_id: u256, ctx: &mut TxContext) {
        let unfreezer = ctx.sender();

         asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let mut asset_metadata = schema.asset_metadata()[asset_id];
        asset_not_frozen_error(asset_metadata.get_status() == dubhe_asset_status::new_frozen());
        no_permission_error(asset_metadata.get_owner() == unfreezer);

        asset_metadata.set_status(dubhe_asset_status::new_liquid());
        schema.asset_metadata().set(asset_id, asset_metadata);
    }

    /// Change the Owner of an asset.
    /// Sender must be the admin of the asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to change the owner of the asset in.
    /// * `asset_id`: The ID of the asset to change the owner of.
    /// * `to`: The address to change the owner of the asset to.
    public entry fun transfer_ownership(schema: &mut Schema, asset_id: u256, to: address, ctx: &mut TxContext) {
        let owner = ctx.sender();

        asset_not_found_error(schema.asset_metadata().contains(asset_id));
        let mut asset_metadata = schema.asset_metadata()[asset_id];
        no_permission_error(asset_metadata.get_owner() == owner);

        asset_metadata.set_owner(to);
        schema.asset_metadata().set(asset_id, asset_metadata);
    }

    /// Move some assets from the sender account to another.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to transfer the asset in.
    /// * `asset_id`: The ID of the asset to transfer.
    /// * `to`: The address to transfer the asset to.
    /// * `amount`: The amount of the asset to transfer.
    public entry fun transfer(schema: &mut Schema, asset_id: u256, to: address, amount: u256, ctx: &mut TxContext) {
        let from = ctx.sender();
        dubhe_assets_functions::do_transfer(schema, asset_id, from, to, amount);
    }

    /// Transfer the entire transferable balance from the caller asset account.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to transfer the asset in.
    /// * `asset_id`: The ID of the asset to transfer.
    /// * `to`: The address to transfer the asset to.
    public entry fun transfer_all(schema: &mut Schema, asset_id: u256, to: address, ctx: &mut TxContext) {
        let from = ctx.sender();
        let balance = balance_of(schema, asset_id, from);

        dubhe_assets_functions::do_transfer(schema, asset_id, from, to, balance);
    }

    // ===============================================================
    // Dubhe package functions , only for other packages to use.
    // ===============================================================

    /// Create a new asset with the given parameters.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to create the asset in.
    /// * `_`: The dapp key.
    /// * `name`: The name of the asset.
    /// * `symbol`: The symbol of the asset.
    /// * `description`: The description of the asset.
    /// * `decimals`: The number of decimals of the asset.
    /// * `icon_url`: The URL of the asset's icon.
    /// * `admin`: The address of the admin of the asset, which is the address that can mint, burn and freeze the asset on dubhe package.
    ///            If the admin is the zero address, the asset is not mintable, burnable and freezable on dubhe package.
    /// * `is_mintable`: Whether the asset is mintable.
    /// * `is_burnable`: Whether the asset is burnable.
    /// * `is_freezable`: Whether the asset is freezable.
    /// 
    /// # Returns
    /// 
    /// The ID of the newly created asset.
    public fun create_asset<DappKey: drop>(
        schema: &mut Schema, 
        _: DappKey,
        name: String,
        symbol: String, 
        description: String, 
        decimals: u8,
        icon_url: String, 
        admin: address,
        is_mintable: bool, 
        is_burnable: bool, 
        is_freezable: bool
    ): u256 {
        let asset_id = dubhe_assets_functions::do_create(
            schema,
            is_mintable,
            is_burnable,
            is_freezable,
            dubhe_asset_type::new_package(),
            admin,
            name,
            symbol,
            description,
            decimals,
            icon_url,
            string(b"")
        );
        dubhe_assets_functions::add_package_asset<DappKey>(schema, asset_id);
        asset_id
    }

    /// Mint `amount` of asset `id` to `to`. Dapps can only mint their own assets.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to mint the asset in.
    /// * `_`: The dapp key.
    /// * `asset_id`: The ID of the asset to mint.
    /// * `to`: The address to mint the asset to.
    /// * `amount`: The amount of the asset to mint.
    public fun mint_asset<DappKey: drop>(
        schema: &mut Schema,
        _: DappKey,
        asset_id: u256,
        to: address,
        amount: u256
    ) {
        dubhe_assets_functions::assert_asset_is_package_asset<DappKey>(schema, asset_id);
        dubhe_assets_functions::do_mint(schema, asset_id, to, amount);
    }

    /// Burn `amount` of asset `id` from `from`. Dapps can only burn their own assets.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to burn the asset in.
    /// * `_`: The dapp key.
    /// * `asset_id`: The ID of the asset to burn.
    public fun burn_asset<DappKey: drop>(
        schema: &mut Schema,
        _: DappKey,
        asset_id: u256,
        from: address,
        amount: u256
    ) {
        dubhe_assets_functions::assert_asset_is_package_asset<DappKey>(schema, asset_id);
        dubhe_assets_functions::do_burn(schema, asset_id, from, amount);
    }       

    /// Transfer `amount` of asset `id` from `from` to `to`. Dapps can only transfer their own assets.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to transfer the asset in.
    /// * `_`: The dapp key.
    /// * `asset_id`: The ID of the asset to transfer.
    /// * `from`: The address to transfer the asset from.
    public fun transfer_asset<DappKey: drop>(
        schema: &mut Schema,
        _: DappKey,
        asset_id: u256,
        from: address,
        to: address,
        amount: u256
    ) {
        dubhe_assets_functions::assert_asset_is_package_asset<DappKey>(schema, asset_id);
        dubhe_assets_functions::do_transfer(schema, asset_id, from, to, amount);
    }


    // ===============================================================
    // Dubhe view functions
    // ===============================================================

    /// Get the balance of an asset for an address.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the balance from.
    /// * `asset_id`: The ID of the asset to get the balance of.
    /// * `who`: The address to get the balance of.
    /// 
    /// # Returns
    /// 
    /// The balance of the address.
    public fun balance_of(schema: &mut Schema, asset_id: u256, who: address): u256 {
        let maybe_account = schema.account().try_get(asset_id, who);
        if (maybe_account.is_none()) {
            return 0
        };
        let account = maybe_account.borrow();
        account.get_balance()
    }

    /// Get the supply of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the supply from.
    /// * `asset_id`: The ID of the asset to get the supply of. 
    /// 
    /// # Returns
    /// 
    /// The supply of the asset.
    public fun supply_of(schema: &mut Schema, asset_id: u256): u256 {
        let maybe_asset_metadata = schema.asset_metadata().try_get(asset_id);
        if (maybe_asset_metadata.is_none()) {
            return 0
        };
        let asset_metadata = maybe_asset_metadata.borrow();
        asset_metadata.get_supply()
    }


    /// Get the owner of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the owner from.
    /// * `asset_id`: The ID of the asset to get the owner of.
    /// 
    public fun owner_of(schema: &mut Schema, asset_id: u256): address {
        let maybe_asset_metadata = schema.asset_metadata().try_get(asset_id);
        if (maybe_asset_metadata.is_none()) {
            return @0x0
        };
        let asset_metadata = maybe_asset_metadata.borrow();
        asset_metadata.get_owner()
    }

    /// Get the name of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the name from.
    /// * `asset_id`: The ID of the asset to get the name of.
    /// 
    /// # Returns
    /// 
    /// The name of the asset.
    public fun name(schema: &mut Schema, asset_id: u256): String {
        let maybe_asset_metadata = schema.asset_metadata().try_get(asset_id);
        if (maybe_asset_metadata.is_none()) {
            return string(b"")
        };
        let asset_metadata = maybe_asset_metadata.borrow();
        asset_metadata.get_name()
    }

    /// Get the symbol of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the symbol from.
    /// * `asset_id`: The ID of the asset to get the symbol of.
    /// 
    /// # Returns
    /// 
    /// The symbol of the asset.
    public fun symbol(schema: &mut Schema, asset_id: u256): String {
        let maybe_asset_metadata = schema.asset_metadata().try_get(asset_id);
        if (maybe_asset_metadata.is_none()) {
            return string(b"")
        };
        let asset_metadata = maybe_asset_metadata.borrow();
        asset_metadata.get_symbol()
    }

    /// Get the description of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the description from.
    /// * `asset_id`: The ID of the asset to get the description of.
    /// 
    /// # Returns
    /// 
    /// The description of the asset.
    public fun description(schema: &mut Schema, asset_id: u256): String {
        let maybe_asset_metadata = schema.asset_metadata().try_get(asset_id);
        if (maybe_asset_metadata.is_none()) {
            return string(b"")
        };
        let asset_metadata = maybe_asset_metadata.borrow();
        asset_metadata.get_description()
    }

    /// Get the icon URL of an asset.
    /// 
    /// # Arguments
    /// 
    /// * `schema`: The Dubhe schema to get the icon URL from.
    /// * `asset_id`: The ID of the asset to get the icon URL of.
    /// 
    /// # Returns
    /// 
    /// The icon URL of the asset.
    public fun icon_url(schema: &mut Schema, asset_id: u256): String {
        let maybe_asset_metadata = schema.asset_metadata().try_get(asset_id);
        if (maybe_asset_metadata.is_none()) {
            return string(b"")
        };
        let asset_metadata = maybe_asset_metadata.borrow();
        asset_metadata.get_icon_url()
    }
}