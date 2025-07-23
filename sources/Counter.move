module my_counter::counter {

    public struct Counter has key {
        id: sui::object::UID,
        value: u64,
    }

    public entry fun create(ctx: &mut sui::tx_context::TxContext) {
        let counter = Counter {
            id: sui::object::new(ctx),
            value: 0,
        };
        sui::transfer::transfer(counter, sui::tx_context::sender(ctx));
    }

    public entry fun increment(counter: &mut Counter) {
        counter.value = counter.value + 1;
    }

    public fun get_value(counter: &Counter): u64 {
        counter.value
    }
}
