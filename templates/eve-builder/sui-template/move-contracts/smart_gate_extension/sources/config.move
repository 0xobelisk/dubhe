/// Builder extensions shared configuration.
///
/// This module publishes a single shared `ExtensionConfig` object at package publish time
/// Other builder-extension modules can attach their own typed rule/config
/// structs under that shared object using Sui dynamic fields.
module smart_gate_extension::config;

use sui::dynamic_field as df;

public struct ExtensionConfig has key {
    id: UID,
}

public struct AdminCap has key, store {
    id: UID,
}

// This can be any type that is authorized to call the `issue_jump_permit` function.
// eg: AlgorithmicWarfareAuth, TribalAuth, GoonCorpAuth, etc.
public struct XAuth has drop {}

fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin_cap, ctx.sender());

    let config = ExtensionConfig { id: object::new(ctx) };
    transfer::share_object(config);
}

// === Dynamic field helpers ===
//
// These helpers let other modules attach their own config structs as dynamic fields
// under the shared `ExtensionConfig` object.
//
// Typical pattern:
// - define a per-rule key type `K has copy, drop, store`
// - define a per-rule value type `V has store, drop`
// - call `set_rule<K, V>(&mut extension_config, &admin_cap, K {}, V { ... })`
public fun has_rule<K: copy + drop + store>(config: &ExtensionConfig, key: K): bool {
    df::exists_(&config.id, key)
}

public fun borrow_rule<K: copy + drop + store, V: store>(config: &ExtensionConfig, key: K): &V {
    df::borrow(&config.id, key)
}

public fun borrow_rule_mut<K: copy + drop + store, V: store>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
): &mut V {
    df::borrow_mut(&mut config.id, key)
}

public fun add_rule<K: copy + drop + store, V: store>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
    value: V,
) {
    df::add(&mut config.id, key, value);
}

/// Insert-or-overwrite a rule. If a value already exists for `key`, it is removed and dropped.
public fun set_rule<K: copy + drop + store, V: store + drop>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
    value: V,
) {
    if (df::exists_(&config.id, copy key)) {
        let _old: V = df::remove(&mut config.id, copy key);
        // dropped
    };
    df::add(&mut config.id, key, value);
}

public fun remove_rule<K: copy + drop + store, V: store>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
): V {
    df::remove(&mut config.id, key)
}

/// Mint an `XAuth` witness. Restricted to this package to prevent unauthorized use.
public(package) fun x_auth(): XAuth {
    XAuth {}
}
