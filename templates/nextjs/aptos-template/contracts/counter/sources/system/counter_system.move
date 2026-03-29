module counter::counter_system {
    use counter::counter_schema;

    public entry fun increase(_caller: &signer) {
        let old_number = counter_schema::get();
        let new_number = old_number + 1;
        counter_schema::set(new_number);
    }
}


