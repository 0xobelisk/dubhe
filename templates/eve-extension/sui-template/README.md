## EVE Extension Template (Sui)

This template includes a complete Dubhe-based business flow:

- `packages/contracts`: Move extension package with business resources and systems
- `packages/ts-scripts`: Dubhe client scripts for transaction flow and state inspection

Business capabilities in `extension_system`:

- `initialize`: set admin + max units per action
- `update_config`: admin updates pause/max-units config
- `record_action`: updates player stats + emits `ActionRecorded`
- `read_config` / `read_player_stats`: query helpers for dashboards/scripts

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- Sui CLI installed

## Quick Start (Localnet)

```bash
pnpm install
cp .env.example .env

# 1) Check toolchain
pnpm run doctor

# 2) Generate Dubhe Move code
pnpm run schemagen

# 3) Start localnet + deploy + export deployment.ts
pnpm run setup:localnet

# 4) Fill PRIVATE_KEY in .env (deployer key or funded key)
# 5) Run full business flow (initialize + update_config + record_action)
pnpm run flow:business

# 6) Read on-chain state via Dubhe metadata query
pnpm run flow:inspect
```

## Testnet Flow

```bash
pnpm install
cp .env.example .env
pnpm run doctor
pnpm run schemagen

# Build / test Move package
pnpm run build:move
pnpm run test:move

# Publish to testnet
pnpm --filter contracts run deploy testnet
pnpm --filter contracts run config:store testnet

# Configure PRIVATE_KEY + EXTENSION_PACKAGE_ID + DUBHE_SCHEMA_ID in .env
pnpm run flow:business
pnpm run flow:inspect
```

## Commands

```bash
pnpm run doctor      # check Dubhe/Sui environment
pnpm run schemagen   # generate Dubhe Move code
pnpm run build:move  # sui move build
pnpm run test:move   # sui move test
pnpm run rpc:ping    # check RPC/network only
pnpm run call:ping   # quick health tx (record 1 unit)
pnpm run flow:business   # initialize/configure/record_action
pnpm run flow:inspect    # query config + player stats with Dubhe
```

## Environment Variables

```dotenv
SUI_NETWORK=testnet
SUI_RPC_URL=

PRIVATE_KEY=
EXTENSION_PACKAGE_ID=
DUBHE_SCHEMA_ID=
MAX_UNITS_PER_CALL=50
ACTION_UNITS=10
FLOW_INIT=true
FLOW_IGNORE_INIT_ERROR=true
FLOW_WAIT_CONFIRM=true
FLOW_MAX_ATTEMPTS=3
FLOW_RETRY_DELAY_MS=800
FLOW_POST_TX_DELAY_MS=250

# Optional ecosystem IDs for your custom scripts
WORLD_PACKAGE_ID=
BUILDER_PACKAGE_ID=
EXTENSION_CONFIG_ID=
```

`DUBHE_SCHEMA_ID` is the Dubhe `DappHub` object ID used by extension entry functions.
