module dubhe::dapp_fee_state;

/// Structure for managing transaction fees and usage statistics
public struct DappFeeState has store {
    /// Base fee charged for each transaction
    base_fee: u256,
    /// Fee per byte of data stored
    byte_fee: u256,
    /// Total size of all stored data in bytes
    total_bytes_size: u256,
    /// Total amount of fees recharged/deposited
    total_recharged: u256,
    /// Total amount of fees paid/consumed
    total_paid: u256,
}

/// Create a new storage instance
public(package) fun new(
    base_fee: u256,
    byte_fee: u256,
    total_bytes_size: u256,
    total_recharged: u256,
    total_paid: u256
): DappFeeState {
    DappFeeState {
        base_fee,
        byte_fee,
        total_bytes_size,
        total_recharged,
        total_paid
    }
}

public(package) fun default(): DappFeeState {
    DappFeeState {
        base_fee: 80000,
        byte_fee: 500,
        total_bytes_size: 0,
        total_recharged: 10000000000,
        total_paid: 0
    }
}

public fun get_base_fee(self: &DappFeeState): u256 {
    self.base_fee
}

public fun get_byte_fee(self: &DappFeeState): u256 {
    self.byte_fee
}

public fun get_total_bytes_size(self: &DappFeeState): u256 {
    self.total_bytes_size
}

public fun get_total_recharged(self: &DappFeeState): u256 {
    self.total_recharged
}

public fun get_total_paid(self: &DappFeeState): u256 {
    self.total_paid
}

public(package) fun set_base_fee(self: &mut DappFeeState, base_fee: u256) {
    self.base_fee = base_fee;
}

public(package) fun set_byte_fee(self: &mut DappFeeState, byte_fee: u256) {
    self.byte_fee = byte_fee;
}

public(package) fun set_total_bytes_size(self: &mut DappFeeState, total_bytes_size: u256) {
    self.total_bytes_size = total_bytes_size;
}

public(package) fun set_total_recharged(self: &mut DappFeeState, total_recharged: u256) {
    self.total_recharged = total_recharged;
}

public(package) fun set_total_paid(self: &mut DappFeeState, total_paid: u256) {
    self.total_paid = total_paid;
}
