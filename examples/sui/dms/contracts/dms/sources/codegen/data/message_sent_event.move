  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module dms::dms_message_sent_event {

  use sui::event;

  use std::ascii::String;

  public struct MessageSentEvent has copy, drop {
    sender: address,
    content: String,
  }

  public fun new(sender: address, content: String): MessageSentEvent {
    MessageSentEvent {
                                   sender,content
                               }
  }
}
