  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module counter::counter_increment_event {

  use sui::event;

  use std::ascii::String;

  public struct IncrementEvent has copy, drop {
    value: u32,
  }

  public fun new(value: u32): IncrementEvent {
    IncrementEvent {
                                   value
                               }
  }
}
