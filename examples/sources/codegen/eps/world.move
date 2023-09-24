module examples::world {
    use std::ascii::{String, string};
    use std::option::Option;
    use std::vector;
    use examples::entity_key;
    use sui::tx_context;
    use sui::transfer;
    use sui::event;
    use sui::tx_context::TxContext;
    use sui::bag::{ Self, Bag };
    use sui::object::{ Self, UID, ID };

    const VERSION: u64 = 1;

    /// Component does not exist
    const ECompDoesNotExist: u64 = 0;
    /// Component already exists
    const ECompAlreadyExists: u64 = 1;
    /// Not the right admin for this world
    const ENotAdmin: u64 = 2;
    /// Migration is not an upgrade
    const ENotUpgrade: u64 = 3;
    /// Calling functions from the wrong package version
    const EWrongVersion: u64 = 4;

    struct AdminCap has key {
        id: UID,
    }

    struct World has key, store {
        id: UID,
        /// Name of the world
        name: String,
        /// Description of the world
        description: String,
        /// Components of the world
        components: Bag,
        /// Component names of the world
        component_names: vector<String>,
        /// admin of the world
        admin: ID,
        /// Components of the world
        version: u64
    }

    struct CompRemoveField has copy, drop {
        comp: address,
        key: address
    }

    struct CompAddField has copy, drop {
        comp: address,
        key: address,
        data: vector<u8>
    }

    struct CompUpdateField has copy, drop {
        comp: address,
        key: Option<address>,
        data: vector<u8>
    }

    public fun create(name: String, description: String, ctx: &mut TxContext): World {
        let admin = AdminCap {
            id: object::new(ctx),
        };
        let world = World {
            id: object::new(ctx),
            name,
            description,
            components: bag::new(ctx),
            component_names: vector::empty(),
            admin: object::id(&admin),
            version: VERSION
        };
        transfer::transfer(admin, tx_context::sender(ctx));
        world
    }

    public fun info(world: &World): (String, String, u64) {
        (world.name, world.description, world.version)
    }

    public fun component_names(world: &World): vector<String> {
        world.component_names
    }

    public fun get_component<T : store>(world: &World, id: address): &T {
        assert!(world.version == VERSION, EWrongVersion);
        assert!(bag::contains(&world.components, id), ECompDoesNotExist);
        bag::borrow<address, T>(&world.components, id)
    }

    public fun get_mut_component<T : store>(world: &mut World, id: address): &mut T {
        assert!(world.version == VERSION, EWrongVersion);
        assert!(bag::contains(&world.components, id), ECompDoesNotExist);
        bag::borrow_mut<address, T>(&mut world.components, id)
    }

    public fun add_component<T : store>(world: &mut World, component_name: vector<u8>, component: T){
        assert!(world.version == VERSION, EWrongVersion);
        let id = entity_key::from_bytes(component_name);
        assert!(!bag::contains(&world.components, id), ECompAlreadyExists);
        vector::push_back(&mut world.component_names, string(component_name));
        bag::add<address,T>(&mut world.components, id, component);
    }

    public fun contains(world: &mut World, id: address): bool {
        assert!(world.version == VERSION, EWrongVersion);
        bag::contains(&mut world.components, id)
    }

    public fun emit_remove_event(comp: address, key: address) {
        event::emit(CompRemoveField { comp, key })
    }

    public fun emit_add_event(comp: address, key: address, data: vector<u8>) {
        event::emit(CompAddField { comp, key, data})
    }

    public fun emit_update_event(comp: address, key: Option<address>, data: vector<u8>) {
        event::emit(CompUpdateField { comp, key, data})
    }

    entry fun migrate(world: &mut World, admin_cap: &AdminCap) {
        assert!(world.admin == object::id(admin_cap), ENotAdmin);
        assert!(world.version < VERSION, ENotUpgrade);
        world.version = VERSION;
    }
}
