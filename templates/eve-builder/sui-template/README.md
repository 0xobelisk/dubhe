## EVE Builder Template (Sui)

This template migrates the core `builder-scaffold` workflow into Dubhe as a create-dubhe template.

Included:

- `move-contracts/smart_gate_extension`: smart gate extension example
- `move-contracts/storage_unit_extension`: storage unit extension starter
- `ts-scripts/smart_gate_extension`: end-to-end interaction scripts
- `ts-scripts/utils` + `ts-scripts/helpers`: reusable world interaction utilities

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- Sui CLI installed
- A deployed EVE world (localnet or testnet)

## Setup

```bash
pnpm install
cp .env.example .env
```

You must provide world deployment artifacts in this project root:

- `deployments/<network>/extracted-object-ids.json`
- `test-resources.json`

For localnet custom package publish, also provide:

- `deployments/localnet/Pub.localnet.toml`

## Build / Publish Contracts

```bash
# Build
pnpm run build:smart-gate
pnpm run build:storage-unit

# Publish smart_gate_extension to testnet
pnpm run publish:smart-gate:testnet

# Publish smart_gate_extension to localnet (ephemeral)
pnpm run publish:smart-gate:localnet
```

After publish, set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `.env`.

## Smart Gate Business Flow

Run scripts in order:

```bash
pnpm run configure-rules
pnpm run authorise-gate-extension
pnpm run authorise-storage-unit-extension
pnpm run issue-tribe-jump-permit
pnpm run jump-with-permit
pnpm run collect-corpse-bounty
```

Or run the full flow:

```bash
pnpm run flow:smart-gate
```

## Notes

- Sponsor transaction flow is built in (`jump-with-permit` / `collect-corpse-bounty`).
- The scripts use `WORLD_PACKAGE_ID`, `BUILDER_PACKAGE_ID`, `EXTENSION_CONFIG_ID`, and role keys from `.env`.
- `TENANT` defaults to `dev` and is used in object id derivation.
