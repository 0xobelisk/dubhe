  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module counter::counter_error_invalid_increment {

  #[error]

  const InvalidIncrement: vector<u8> = b"Number can't be incremented, must be more than 0";

  /// Get the error message.

  public fun message(): vector<u8> {
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