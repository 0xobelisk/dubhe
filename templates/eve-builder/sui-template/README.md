# EVE Builder Template (Sui)

This template ports the builder-scaffold workflow into Dubhe's `create-dubhe` flow.

## Included modules

- `move-contracts/`: Smart Assembly extension examples (`smart_gate_extension`, `storage_unit_extension`)
- `ts-scripts/`: on-chain interaction scripts for extension business flow
- `docs/`: builder flow docs (host/docker)
- `docker/`: local Sui dev container and helper scripts
- `setup-world/`: world deploy/configure/seed helper
- `dapps/`: reference React dApp starter
- `zklogin/`: zkLogin transaction helper CLI

## Prerequisites

- Node.js >= 18 (Node.js >= 22 recommended for `dapps` / `zklogin`)
- pnpm >= 9
- Sui CLI installed
- A deployed EVE world (localnet or testnet), or run setup flow to deploy one

## Quick start (contracts + scripts)

```bash
pnpm install
cp .env.example .env

pnpm run type-check
pnpm run build:smart-gate
pnpm run build:storage-unit
```

Required project artifacts:

- `deployments/<network>/extracted-object-ids.json`
- `test-resources.json`
- for localnet test-publish: `deployments/localnet/Pub.localnet.toml`

## Smart gate business flow

```bash
pnpm run configure-rules
pnpm run authorise-gate-extension
pnpm run authorise-storage-unit-extension
pnpm run issue-tribe-jump-permit
pnpm run jump-with-permit
pnpm run collect-corpse-bounty
```

Or run all steps:

```bash
pnpm run flow:smart-gate
```

## Optional modules

### Docker development environment

```bash
pnpm run docker:dev
```

See details in `docker/readme.md` and `docs/builder-flow-docker.md`.

### World setup helper

```bash
pnpm run setup:world
```

### Reference dApp

```bash
pnpm run install:dapp
pnpm run dev:dapp
```

### zkLogin helper

```bash
pnpm run install:zklogin
pnpm run zklogin
```

See network and prover notes in `zklogin/readme.md`.
