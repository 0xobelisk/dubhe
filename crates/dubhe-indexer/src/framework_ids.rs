use crate::args::Network;

/// All known Dubhe framework package IDs, per network and upgrade version.
///
/// ## Why this exists
///
/// Every `dubhe_events` event has `event.type_.address` equal to the Dubhe *framework*
/// package address (not the DApp package address), because the event structs are defined
/// in `module dubhe::dubhe_events` and can only be emitted by `public(package)` functions
/// within that framework package.
///
/// The indexer verifies `event.type_.address` against a trusted set to prevent attacker-
/// controlled packages from injecting fake events with a forged `dapp_key` payload.
///
/// ## Network strategy
///
/// | Network           | Source of trusted framework IDs                         |
/// |-------------------|---------------------------------------------------------|
/// | `localnet/devnet` | `original_dubhe_package_id` in `dubhe.config.json`      |
/// |                   | (Dubhe is re-deployed fresh each time; no fixed IDs)    |
/// | `testnet`         | `TESTNET_FRAMEWORK_PACKAGE_IDS` (hardcoded list below)  |
/// | `mainnet`         | `MAINNET_FRAMEWORK_PACKAGE_IDS` (hardcoded list below)  |
///
/// ## Maintenance
///
/// After each Dubhe framework upgrade on testnet or mainnet:
///   1. Append the new framework package ID to the relevant list below (oldest → newest).
///   2. Update `TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID` / `MAINNET_DUBHE_FRAMEWORK_PACKAGE_ID`
///      in `packages/sui-client/src/libs/suiInteractor/defaultConfig.ts` (latest only).
///   3. Rebuild and redeploy the indexer binary.
///
/// IDs are stored as 64-char lowercase hex without "0x" prefix, matching the
/// normalization applied in `DubheConfig::known_package_ids`.

/// All known Dubhe framework package IDs on testnet (all versions, oldest first).
pub const TESTNET_FRAMEWORK_PACKAGE_IDS: &[&str] = &[
    // v1 — current deployment (force-redeployed 2026-06-22)
    "ae33be6675639d6f1a5c468ae6bbc457ae4e22e57cd7526741d6143ce219d995",
    // Add new testnet IDs here after each framework upgrade ↓
];

/// All known Dubhe framework package IDs on mainnet (all versions, oldest first).
pub const MAINNET_FRAMEWORK_PACKAGE_IDS: &[&str] = &[
    // v1 — force-redeployed 2026-06-22
    "5bc40de124588b1e3514ca50f5e7109869351c4d9544e5f0cb9d30dd47bf8de7",
    // Add new mainnet IDs here after each framework upgrade ↓
];

/// Returns the hardcoded Dubhe framework package IDs for the given network.
///
/// * `testnet` → `TESTNET_FRAMEWORK_PACKAGE_IDS`
/// * `mainnet` → `MAINNET_FRAMEWORK_PACKAGE_IDS`
/// * `localnet` / `devnet` → empty slice; the ID is read from `dubhe.config.json` instead.
pub fn framework_package_ids_for_network(network: &Network) -> &'static [&'static str] {
    match network {
        Network::Testnet => TESTNET_FRAMEWORK_PACKAGE_IDS,
        Network::Mainnet => MAINNET_FRAMEWORK_PACKAGE_IDS,
        Network::Localnet | Network::Devnet => &[],
    }
}
