module examples::init {
    use sui::transfer;
    use sui::tx_context::TxContext;
    use examples::world;

	use examples::counter_component;

    fun init(ctx: &mut TxContext) {
        let world = world::create_world(ctx);

        // Add Component

		counter_component::register(&mut world);

        transfer::public_share_object(world);
    }

    #[test_only]
    public fun init_world_for_testing(ctx: &mut TxContext){
        init(ctx)
    }
}
