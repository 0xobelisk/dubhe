  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module dubhe::asset_type {

  use sui::bcs::{BCS, to_bytes, peel_enum_tag};

  public enum AssetType has copy, drop, store {
        Lp,Package,Private,Wrapped
    }

  public fun new_lp(): AssetType {
    AssetType::Lp
  }

  public fun new_package(): AssetType {
    AssetType::Package
  }

  public fun new_private(): AssetType {
    AssetType::Private
  }

  public fun new_wrapped(): AssetType {
    AssetType::Wrapped
  }

  public fun encode(self: AssetType): vector<u8> {
    to_bytes(&self)
  }

  public fun decode(bytes: &mut BCS): AssetType {
    match(peel_enum_tag(bytes)) {
            0 => AssetType::Lp,
            1 => AssetType::Package,
            2 => AssetType::Private,
            3 => AssetType::Wrapped,
            _ => abort,
        }
  }
}
