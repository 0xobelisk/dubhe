module counter::counter_system {
    use counter::counter_schema::Counter;
    use counter::counter_event_increment;
    use counter::counter_error_invalid_increment;

    public entry fun inc(counter: &mut Counter, number: u32) {
        // Check if the increment value is valid.
        counter_error_invalid_increment::require(number > 0);
        counter.borrow_mut_value().mutate!(|value| {
            // Increment the counter value.
            *value =  *value + number;
            // Emit an event to notify the increment.
            counter_event_increment::emit(number);
        });
    }

    public fun get(counter: &Counter): u32 {
        counter.borrow_value().get()
    }
}
