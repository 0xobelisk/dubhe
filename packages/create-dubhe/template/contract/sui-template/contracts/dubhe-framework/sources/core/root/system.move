module dubhe::root_system {
    use dubhe::root_schema::Root;

    public entry fun set_key(
        root: &mut Root,
        key: address,
        ctx: &mut TxContext
    ) {
        ensure_root(root, ctx);
        root.borrow_mut_key().set(key);
    }

    public entry fun remove_key(
        root: &mut Root,
        ctx: &mut TxContext
    ) {
        ensure_root(root, ctx);
        root.borrow_mut_key().remove();
    }

    public fun ensure_root(root: &Root, ctx: &TxContext) {
        assert!(root.borrow_key().get() == ctx.sender(), 0);
    }
}
