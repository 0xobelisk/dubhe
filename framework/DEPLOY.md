# Dubhe Framework Deployment & Maintenance Guide

## Overview

This document covers deploying and upgrading the Dubhe framework contract across
`localnet`, `testnet`, and `mainnet`.

---

## Prerequisites

- Node.js ≥ 18, pnpm installed
- Sui CLI installed and on `$PATH`
- Repository dependencies installed: `pnpm install` at the repo root

---

## Part 1 — Initial Deployment

### Step 1 · Generate a Deployer Account

Run the following command inside the `framework/` directory. It creates a new
Ed25519 keypair and writes `PRIVATE_KEY=<suiprivkey…>` to `framework/.env`.

```bash
cd framework
pnpm dubhe generate-key
```

> If you already have a private key, create the file manually:
>
> ```bash
> echo "PRIVATE_KEY=<your-suiprivkey>" > .env
> ```

---

### Step 2 · Fund the Deployer Account

**Localnet / Testnet** — use the built-in faucet command:

```bash
# localnet
pnpm dubhe faucet --network localnet

# testnet
pnpm dubhe faucet --network testnet
```

**Mainnet** — transfer SUI to the deployer address manually.  
The address is printed by `generate-key` and can be re-derived any time with:

```bash
pnpm dubhe info --network mainnet
```

A fresh deployment uses roughly **0.5–2 SUI** in gas.

---

### Step 3 · Deploy the Contract

```bash
# localnet
pnpm dubhe publish --network localnet --force

# testnet
pnpm dubhe publish --network testnet

# mainnet
pnpm dubhe publish --network mainnet
```

The `--force` flag clears any previously published state for that network before
building, which is required when re-publishing from scratch on localnet.

**What happens internally:**

1. `dubhe convert-json` regenerates `dubhe.config.json` from `dubhe.config.ts`.
2. The Move package is compiled (`sui move build …`).
3. The compiled bytecode is published on-chain.
4. `genesis::run(dapp_hub, clock)` is called automatically as a deploy hook to
   initialise the `DappHub` shared object and set the fee configuration.
5. Deployment metadata is written to:
   - `src/dubhe/.history/sui_<network>/latest.json`
   - `src/dubhe/.history/sui_<network>/<package-id>.json`
   - `metadata.json`
   - `src/dubhe/Move.lock` (env section)
   - `src/dubhe/Published.toml`

---

### Step 4 · Verify the Deployment

Read the deployment record to confirm the key objects:

```bash
cat src/dubhe/.history/sui_localnet/latest.json
# (replace 'localnet' with 'testnet' or 'mainnet' as appropriate)
```

Key fields to note:

| Field        | Description                                 |
| ------------ | ------------------------------------------- |
| `packageId`  | The on-chain package address                |
| `dappHubId`  | The shared `DappHub` object ID              |
| `upgradeCap` | The `UpgradeCap` object ID — keep this safe |
| `version`    | Current contract version (starts at `1`)    |

You can also query the account balance after deployment:

```bash
pnpm dubhe faucet --network localnet   # prints balance as a side-effect
```

---

## Part 2 — Upgrading the Contract

Upgrades follow Sui's `authorize_upgrade → upgrade → commit_upgrade` pattern.
The CLI handles all of this automatically.

### When to Upgrade

- You modified Move source files (bug fixes, new logic)
- You added new resource definitions to `dubhe.config.ts`

### Upgrade Command

```bash
# localnet
pnpm dubhe upgrade --network localnet

# testnet
pnpm dubhe upgrade --network testnet

# mainnet
pnpm dubhe upgrade --network mainnet
```

### What Happens During Upgrade

1. The CLI reads `UpgradeCap`, `oldPackageId`, and `version` from the local
   deployment record.
2. The package is compiled against the existing on-chain dependency graph.
3. `package::authorize_upgrade → upgrade → commit_upgrade` is executed in a
   single transaction.
4. If **new resources** were added to `dubhe.config.ts`, the CLI:
   - Auto-generates a `migrate_to_v<N>` entry function in `migrate.move`.
   - Calls `migrate_to_v<N>(dapp_hub, new_package_id, new_version)` on-chain to
     register the new package ID and version via `dapp_system::upgrade_dapp`.
5. `Move.lock`, `Published.toml`, and the `.history/` records are updated with
   the new package ID and version number.

### Schema-Only vs. Logic-Only Upgrades

| Change type                             | Migration tx needed? | CLI behaviour                            |
| --------------------------------------- | -------------------- | ---------------------------------------- |
| New resource added to `dubhe.config.ts` | Yes                  | Auto-generates and calls `migrate_to_vN` |
| Bug-fix / logic change only             | No                   | Skips migration step automatically       |

---

## Part 3 — File Reference

### Key Files Written by the CLI

```
framework/
├── .env                              ← PRIVATE_KEY (never commit)
├── metadata.json                     ← Latest deployment metadata (all networks)
└── src/dubhe/
    ├── Move.toml                     ← Package manifest (published-at address)
    ├── Move.lock                     ← Per-env chain-id and published IDs
    ├── Published.toml                ← Human-readable publish record
    └── .history/
        ├── sui_localnet/
        │   ├── latest.json           ← Symlink-equivalent: latest localnet deploy
        │   └── <package-id>.json     ← Immutable snapshot per deploy
        ├── sui_testnet/
        │   └── ...
        └── sui_mainnet/
            └── ...
```

### `latest.json` Schema

```json
{
  "projectName": "dubhe",
  "network": "localnet",
  "startCheckpoint": "<checkpoint>",
  "packageId": "0x...",
  "dappHubId": "0x...",
  "upgradeCap": "0x...",
  "version": 1,
  "resources": { ... }
}
```

---

## Part 4 — Mainnet Checklist

Before deploying to mainnet, verify each item:

- [ ] All Move unit tests pass: `pnpm dubhe test --network testnet`
- [ ] Contract has been deployed and tested on testnet first
- [ ] Deployer address holds enough SUI (≥ 2 SUI recommended)
- [ ] `PRIVATE_KEY` in `.env` corresponds to the intended deployer address
- [ ] `UpgradeCap` object ID from the mainnet deployment is backed up securely
- [ ] `dubhe.config.ts` reflects the final intended configuration
- [ ] `src/dubhe/Move.toml` `published-at` and `[addresses]` are correct for mainnet

---

## Part 5 — Common Errors & Fixes

### `PublishErrorNonZeroAddress`

The package self-address is non-zero at publish time.

**Fix:** use `--force` to clear stale published state before republishing:

```bash
pnpm dubhe publish --network localnet --force
```

### `Missing private key environment variable`

The `.env` file is missing or not in the working directory.

**Fix:**

```bash
cd framework
pnpm dubhe generate-key   # or create .env manually
```

### `Network type [env.X] not found … cannot upgrade`

You are trying to upgrade a network that has never been published to.

**Fix:** run `publish` first before `upgrade`.

### `genesis::run failed`

The deploy hook transaction failed (usually insufficient gas or clock object issue).

**Fix:** check account balance, then retry `publish --force`.

### `Insufficient Credit` during operation

The `DappHub` fee state ran out of credits.

**Fix:** recharge credits via the admin interface or redeploy on localnet.

---

## Quick Reference

```bash
# Generate account
pnpm dubhe generate-key

# Fund account
pnpm dubhe faucet --network <network>

# First deploy
pnpm dubhe publish --network <network> [--force]

# Upgrade existing deploy
pnpm dubhe upgrade --network <network>

# View deployment info
cat src/dubhe/.history/sui_<network>/latest.json
```
