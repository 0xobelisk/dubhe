  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module constantinople::terrain_type {

  public enum TerrainType has copy, drop , store {
                                None,TallGrass,Boulder
                        }

  public fun new_none(): TerrainType {
    TerrainType::None
  }

  public fun new_tall_grass(): TerrainType {
    TerrainType::TallGrass
  }

  public fun new_boulder(): TerrainType {
    TerrainType::Boulder
  }
}