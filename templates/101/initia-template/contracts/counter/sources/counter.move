module counter::counter {
    use std::signer;

    /// module for counter
    struct Counter has key {
        value: u64,
    }

    // Define the initialize function. This function is called when the module is first deployed to the blockchain.
    fun init_module(account: &signer) {
        move_to(account, Counter {value: 0})
    }

    // MsgExecute only can execute entry function
    public entry fun increase(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        counter.value = counter.value + 1;
    }

    // Function that has view tag can be queried by initia/minitia's lcd/rpc
    #[view]
    public fun value(): u64 acquires Counter {
        borrow_global<Counter>(@counter).value
    }
}
