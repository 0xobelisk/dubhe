  // Copyright (c) Obelisk Labs, Inc.
  // SPDX-License-Identifier: Apache-2.0
  #[allow(unused_use)]
  
  /* Autogenerated file. Do not edit manually. */
  
  module constantinople::map_schema {

  use std::ascii::String;

  use std::ascii::string;

  use sui::package::UpgradeCap;

  use std::type_name;

  use dubhe::storage_migration;

  use dubhe::storage_value::{Self, StorageValue};

  use dubhe::storage_map::{Self, StorageMap};

  use dubhe::storage_double_map::{Self, StorageDoubleMap};

  use sui::dynamic_field as df;

  use sui::sui::SUI;

  use sui::coin::Coin;

  use sui::balance::Balance;

  use constantinople::monster_type::MonsterType;

  use constantinople::direction::Direction;

  use constantinople::terrain_type::TerrainType;

  use constantinople::monster_catch_result::MonsterCatchResult;

  use constantinople::map_config::MapConfig;

  use constantinople::position::Position;

  use constantinople::monster_info::MonsterInfo;

  public struct Map has key, store {
    id: UID,
  }

  public fun borrow_config(self: &Map): &StorageValue<MapConfig> {
    storage_migration::borrow_field(&self.id, b"config")
  }

  public(package) fun config(self: &mut Map): &mut StorageValue<MapConfig> {
    storage_migration::borrow_mut_field(&mut self.id, b"config")
  }

  public fun borrow_position(self: &Map): &StorageMap<address, Position> {
    storage_migration::borrow_field(&self.id, b"position")
  }

  public(package) fun position(self: &mut Map): &mut StorageMap<address, Position> {
    storage_migration::borrow_mut_field(&mut self.id, b"position")
  }

  public(package) fun create(ctx: &mut TxContext): Map {
    let mut id = object::new(ctx);
    storage_migration::add_field<StorageValue<MapConfig>>(&mut id, b"config", storage_value::new());
    storage_migration::add_field<StorageMap<address, Position>>(&mut id, b"position", storage_map::new());
    Map { id }
  }

  public fun migrate(_map: &mut Map, _cap: &UpgradeCap) {}

  // ======================================== View Functions ========================================

  public fun get_config(self: &Map): &MapConfig {
    self.borrow_config().borrow()
  }

  public fun get_position(self: &Map, key: address): &Position {
    self.borrow_position().borrow(key)
  }

  public fun get_position_keys(self: &Map): vector<address> {
    self.borrow_position().keys()
  }

  public fun get_position_values(self: &Map): vector<Position> {
    self.borrow_position().values()
  }

  // =========================================================================================================
}