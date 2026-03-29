module counter::deploy_hook {
    use counter::world;
    use std::signer::address_of;

    /// Not the right admin for this world
    const ENotAdmin: u64 = 0;

    public entry fun run(deployer: &signer) {
        assert!( address_of(deployer) == world::deployer_address(), ENotAdmin);

        // Logic that needs to be automated once the contract is deployed

    }

    #[test_only]
    public fun deploy_hook_for_testing(deployer: &signer){
        run(deployer)
    }
}
