module dubhe::migrate {

  const ON_CHAIN_VERSION: u32 = 1;

  public fun on_chain_version(): u32 {
    ON_CHAIN_VERSION
  }
}