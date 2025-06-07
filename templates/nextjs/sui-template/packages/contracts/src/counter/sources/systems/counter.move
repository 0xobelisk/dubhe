module counter::counter_system {
    use counter::counter_schema::Schema;
    use counter::counter_events::increment_event;
    use counter::counter_errors::invalid_increment_error;
    use counter::counter_dapp_key;
    use dubhe::dubhe_schema::Schema as DubheSchema;

    public entry fun inc(dubhe_schema: &mut DubheSchema, scheam: &mut Schema, number: u32) {
        // Check if the increment value is valid.
        invalid_increment_error(number > 0 && number < 100);
        let value = scheam.value()[];
        let dapp_key = counter_dapp_key::new();
        scheam.value().set(
            dubhe_schema,
            dapp_key,
            value + number,
        );
        increment_event(number);
    }
}