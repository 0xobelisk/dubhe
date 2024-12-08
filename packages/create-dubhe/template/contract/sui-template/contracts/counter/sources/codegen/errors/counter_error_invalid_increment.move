  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: MIT
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module counter::counter_error_invalid_increment {

  const InvalidIncrement: u64 = 0;

  /// Get the error code.

  public fun code(): u64 {
    InvalidIncrement
  }

  /// Abort execution with the given error code.

  public fun emit() {
    abort InvalidIncrement
  }

  /// Require that the given condition is true, otherwise abort with the given error code.

  public fun require(condition: bool) {
    if (!condition) { emit() }
  }
}
