module obelisk::access_control {
    use obelisk::world::{AdminCap, World};
    use sui::dynamic_field as df;

    const ENotAdmin: u64 = 4;
    const EAppNotAuthorized: u64 = 5;

    public struct AppKey<phantom App: drop> has copy, store, drop {}
    
    /// Authorize an application to access protected features of the World.
    public fun authorize_app<App: drop>(admin_cap: &AdminCap, world: &mut World) {
        assert!(world.admin() == object::id(admin_cap), ENotAdmin);
        df::add(world.mut_uid(), AppKey<App>{}, true);
    }

    /// Deauthorize an application by removing its authorization key.
    public fun deauthorize_app<App: drop>(admin_cap: &AdminCap, world: &mut World): bool {
        assert!(world.admin() == object::id(admin_cap), ENotAdmin);
        df::remove(world.mut_uid(), AppKey<App>{})
    }

    // Check if an application is authorized to access protected features of
    /// the World.
    public fun is_app_authorized<App: drop>(world: &World): bool {
        df::exists_(world.uid(), AppKey<App>{})
    }

    /// Assert that an application is authorized to access protected features of
    /// the World. Aborts with `EAppNotAuthorized` if not.
    public fun assert_app_is_authorized<App: drop>(world: &World) {
        assert!(is_app_authorized<App>(world), EAppNotAuthorized);
    }


}