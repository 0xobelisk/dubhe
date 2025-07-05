module dubhe::assets_system;
use dubhe::errors::{
    no_permission_error, not_mintable_error, not_burnable_error
};
use dubhe::dapp_service::DappHub;
use dubhe::account_status;
use dubhe::asset_status;
use dubhe::assets_functions;
use dubhe::asset_type;
use dubhe::errors::not_freezable_error;
use dubhe::errors::invalid_metadata_error;
use dubhe::asset_metadata;
use dubhe::asset_account;
use dubhe::entity_id::asset_to_entity_id;
use dubhe::dubhe_config;
use dubhe::dapp_key;

/// Set the metadata of an asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to set the metadata in.
/// * `asset_id`: The ID of the asset to set the metadata of.
/// * `name`: The name of the asset.
/// * `symbol`: The symbol of the asset.
/// * `description`: The description of the asset.
/// * `icon_url`: The URL of the asset's icon.
public entry fun set_metadata(
    dapp_hub: &mut DappHub, 
    asset_id: address, 
    name: vector<u8>, 
    symbol: vector<u8>, 
    description: vector<u8>, 
    icon_url: vector<u8>, 
    ctx: &mut TxContext
) {
    let admin = ctx.sender();
    asset_metadata::ensure_has(dapp_hub, asset_id);
    let mut asset_metadata = asset_metadata::get_struct(dapp_hub, asset_id);
    no_permission_error(asset_metadata.owner() == admin);
    invalid_metadata_error(!name.is_empty() && !symbol.is_empty() && !description.is_empty());

    asset_metadata.update_name(name);
    asset_metadata.update_symbol(symbol);
    asset_metadata.update_description(description);
    asset_metadata.update_icon_url(icon_url);
    asset_metadata::set_struct(dapp_hub, asset_id, asset_metadata);
}

/// Mint `amount` of asset `id` to `who`. Sender must be the admin of the asset.
/// Asset must be a mintable asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to mint the asset in.
/// * `asset_id`: The ID of the asset to mint.
/// * `to`: The address to mint the asset to.
/// * `amount`: The amount of the asset to mint.
public entry fun mint(dapp_hub: &mut DappHub, asset_id: address, to: address, amount: u256, ctx: &mut TxContext) {
    let issuer = ctx.sender();
    asset_metadata::ensure_has(dapp_hub, asset_id);
    let asset_metadata = asset_metadata::get_struct(dapp_hub, asset_id);
    no_permission_error(asset_metadata.owner() == issuer);
    not_mintable_error(asset_metadata.is_mintable());

    assets_functions::do_mint(dapp_hub, asset_id, to, amount);
}

/// Burn `amount` of asset `id` from `who`. Sender must be the admin of the asset.
/// Asset must be a burnable asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to burn the asset in.
/// * `asset_id`: The ID of the asset to burn.
/// * `from`: The address to burn the asset from.
/// * `amount`: The amount of the asset to burn.
public entry fun burn(dapp_hub: &mut DappHub, asset_id: address, from: address, amount: u256, ctx: &mut TxContext) {
    let burner = ctx.sender();
    asset_metadata::ensure_has(dapp_hub, asset_id);
    let asset_metadata = asset_metadata::get_struct(dapp_hub, asset_id);
    no_permission_error(asset_metadata.owner() == burner);
    not_burnable_error(asset_metadata.is_burnable());

    assets_functions::do_burn(dapp_hub, asset_id, from, amount);
}

/// Disallow further unprivileged transfers of an asset `id` from an account `who`.
/// Sender must be the admin of the asset.
/// `who` must already exist as an entry in `Account`s of the asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to freeze the asset in.
/// * `asset_id`: The ID of the asset to freeze.
/// * `who`: The address to freeze the asset from.
public entry fun freeze_address(dapp_hub: &mut DappHub, asset_id: address, who: address, ctx: &mut TxContext) {
    let freezer = ctx.sender();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let asset_metadata = asset_metadata::get_struct(dapp_hub, asset_id);
    no_permission_error(asset_metadata.owner() == freezer);
    not_freezable_error(asset_metadata.is_freezable());

    asset_account::ensure_has(dapp_hub, asset_id, who);
    let status = account_status::new_frozen();
    asset_account::set_status(dapp_hub, asset_id, who, status);
}

/// Disallow further unprivileged transfers of an asset `id` to and from an account `who`.
/// Sender must be the admin of the asset.
/// `who` must already exist as an entry in `Account`s of the asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to block the asset in.
/// * `asset_id`: The ID of the asset to block.
/// * `who`: The address to block the asset from.
public entry fun block_address(dapp_hub: &mut DappHub, asset_id: address, who: address, ctx: &mut TxContext) {
    let blocker = ctx.sender();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == blocker);

    asset_account::ensure_has(dapp_hub, asset_id, who);
    let status = account_status::new_blocked();
    asset_account::set_status(dapp_hub, asset_id, who, status);
}

/// Allow unprivileged transfers to and from an account again.
/// Sender must be the admin of the asset.
/// `who` must already exist as an entry in `Account`s of the asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to thaw the asset in.
/// * `asset_id`: The ID of the asset to thaw.
/// * `who`: The address to thaw the asset from.
public entry fun thaw_address(dapp_hub: &mut DappHub, asset_id: address, who: address, ctx: &mut TxContext) {
    let unfreezer = ctx.sender();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == unfreezer);

    asset_account::ensure_has(dapp_hub, asset_id, who);
    let status = account_status::new_liquid();
    asset_account::set_status(dapp_hub, asset_id, who, status);
}

/// Disallow further unprivileged transfers for the asset class.
/// Sender must be the admin of the asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to freeze the asset in.
/// * `asset_id`: The ID of the asset to freeze.
public entry fun freeze_asset(dapp_hub: &mut DappHub, asset_id: address, ctx: &mut TxContext) {
    let freezer = ctx.sender();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == freezer);

    let status = asset_status::new_frozen();
    asset_metadata::set_status(dapp_hub, asset_id, status);
}

/// Allow unprivileged transfers for the asset again.
/// Sender must be the admin of the asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to thaw the asset in.
/// * `asset_id`: The ID of the asset to thaw.
public entry fun thaw_asset(dapp_hub: &mut DappHub, asset_id: address, ctx: &mut TxContext) {
    let unfreezer = ctx.sender();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == unfreezer);

    let status = asset_status::new_liquid();
    asset_metadata::set_status(dapp_hub, asset_id, status);
}

/// Change the Owner of an asset.
/// Sender must be the admin of the asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to change the owner of the asset in.
/// * `asset_id`: The ID of the asset to change the owner of.
/// * `to`: The address to change the owner of the asset to.
public entry fun transfer_ownership(dapp_hub: &mut DappHub, asset_id: address, to: address, ctx: &mut TxContext) {
    let owner = ctx.sender();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let stored_owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(stored_owner == owner);
    asset_metadata::set_owner(dapp_hub, asset_id, to);
}

/// Move some assets from the sender account to another.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to transfer the asset in.
/// * `asset_id`: The ID of the asset to transfer.
/// * `to`: The address to transfer the asset to.
/// * `amount`: The amount of the asset to transfer.
public entry fun transfer(dapp_hub: &mut DappHub, asset_id: address, to: address, amount: u256, ctx: &mut TxContext) {
    let from = ctx.sender();
    assets_functions::do_transfer(dapp_hub, asset_id, from, to, amount);
}

/// Transfer the entire transferable balance from the caller asset account.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to transfer the asset in.
/// * `asset_id`: The ID of the asset to transfer.
/// * `to`: The address to transfer the asset to.
public entry fun transfer_all(dapp_hub: &mut DappHub, asset_id: address, to: address, ctx: &mut TxContext) {
    let from = ctx.sender();
    let balance = balance_of(dapp_hub, asset_id, from);

    assets_functions::do_transfer(dapp_hub, asset_id, from, to, balance);
}

// ===============================================================
// Dubhe package functions , only for other packages to use.
// ===============================================================

/// Create a new asset with the given parameters.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to create the asset in.
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
    dapp_hub: &mut DappHub, 
    _: DappKey,
    name: vector<u8>,
    symbol: vector<u8>, 
    description: vector<u8>, 
    decimals: u8,
    icon_url: vector<u8>, 
    is_mintable: bool, 
    is_burnable: bool, 
    is_freezable: bool
): address {
    let dapp_key = dapp_key::to_string();
    let package_id = dapp_key::package_id();
    let asset_id = dubhe_config::get_next_asset_id(dapp_hub);
    let entity_id = asset_to_entity_id(dapp_key.into_bytes(), asset_id);
    let supply = 0;
    let accounts = 0;
    let status = asset_status::new_liquid();
    // set the assets metadata
    asset_metadata::set(
        dapp_hub, 
        entity_id, 
        name, 
        symbol, 
        description, 
        decimals, 
        icon_url, 
        package_id, 
        supply, 
        accounts, 
        status, 
        is_mintable, 
        is_burnable, 
        is_freezable, 
        asset_type::new_package()
    );

    // Increment the asset ID
    dubhe_config::set_next_asset_id(dapp_hub, asset_id + 1);
    entity_id
}

/// Mint `amount` of asset `id` to `to`. Dapps can only mint their own assets.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to mint the asset in.
/// * `_`: The dapp key.
/// * `asset_id`: The ID of the asset to mint.
/// * `to`: The address to mint the asset to.
/// * `amount`: The amount of the asset to mint.
public fun mint_asset<DappKey: drop>(
    dapp_hub: &mut DappHub,
    _: DappKey,
    asset_id: address,
    to: address,
    amount: u256
) {
    let package_id = dapp_key::package_id();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == package_id);

    assets_functions::do_mint(dapp_hub, asset_id, to, amount);
}

/// Burn `amount` of asset `id` from `from`. Dapps can only burn their own assets.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to burn the asset in.
/// * `_`: The dapp key.
/// * `asset_id`: The ID of the asset to burn.
public fun burn_asset<DappKey: drop>(
    dapp_hub: &mut DappHub,
    _: DappKey,
    asset_id: address,
    from: address,
    amount: u256
) {
    let package_id = dapp_key::package_id();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == package_id);

    assets_functions::do_burn(dapp_hub, asset_id, from, amount);
}       

/// Transfer `amount` of asset `id` from `from` to `to`. Dapps can only transfer their own assets.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to transfer the asset in.
/// * `_`: The dapp key.
/// * `asset_id`: The ID of the asset to transfer.
/// * `from`: The address to transfer the asset from.
public fun transfer_asset<DappKey: drop>(
    dapp_hub: &mut DappHub,
    _: DappKey,
    asset_id: address,
    from: address,
    to: address,
    amount: u256
) {
    let package_id = dapp_key::package_id();

    asset_metadata::ensure_has(dapp_hub, asset_id);
    let owner = asset_metadata::get_owner(dapp_hub, asset_id);
    no_permission_error(owner == package_id);

    assets_functions::do_transfer(dapp_hub, asset_id, from, to, amount);
}


// ===============================================================
// Dubhe view functions
// ===============================================================

/// Get the balance of an asset for an address.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to get the balance from.
/// * `asset_id`: The ID of the asset to get the balance of.
/// * `who`: The address to get the balance of.
/// 
/// # Returns
/// 
/// The balance of the address.
public fun balance_of(dapp_hub: &DappHub, asset_id: address, who: address): u256 {
   if (asset_account::has(dapp_hub, asset_id, who)) {
    asset_account::get_balance(dapp_hub, asset_id, who)
   } else {
    0
   }
}

/// Get the supply of an asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to get the supply from.
/// * `asset_id`: The ID of the asset to get the supply of. 
/// 
/// # Returns
/// 
/// The supply of the asset.
public fun supply_of(dapp_hub: &DappHub, asset_id: address): u256 {
    if (asset_metadata::has(dapp_hub, asset_id)) {
        asset_metadata::get_supply(dapp_hub, asset_id)
    } else {
        0
    }
}


/// Get the owner of an asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to get the owner from.
/// * `asset_id`: The ID of the asset to get the owner of.
/// 
public fun owner_of(dapp_hub: &DappHub, asset_id: address): address {
    if (asset_metadata::has(dapp_hub, asset_id)) {
        asset_metadata::get_owner(dapp_hub, asset_id)
    } else {
        @0x0
    }
}

/// Get the metadata of an asset.
/// 
/// # Arguments
/// 
/// * `dapp_hub`: The Dubhe dapp_hub to get the name from.
/// * `asset_id`: The ID of the asset to get the name of.
/// 
/// # Returns
/// 
/// The metadata of the asset.
public fun metadata_of(dapp_hub: &DappHub, asset_id: address): (vector<u8>, vector<u8>, vector<u8>, u8) {
    if (asset_metadata::has(dapp_hub, asset_id)) {
        let metadata = asset_metadata::get_struct(dapp_hub, asset_id);
        (
            metadata.name(),
            metadata.symbol(),
            metadata.description(),
            metadata.decimals()
        )
    } else {
        (b"", b"", b"", 0)
    }
}