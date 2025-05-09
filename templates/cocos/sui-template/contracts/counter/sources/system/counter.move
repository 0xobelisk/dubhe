module counter::counter_system {
    use counter::counter_schema::Counter;

    public entry fun inc(counter: &mut Counter) {
        counter.borrow_mut_value().mutate!(|value| *value = *value + 1);
    }

    public fun get(counter: &Counter): u32 {
        counter.borrow_value().get()
    }
}
