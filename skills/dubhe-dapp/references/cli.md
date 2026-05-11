# Dubhe CLI Reference

The `dubhe` CLI drives the full DApp development lifecycle — code generation,
publishing, upgrading, testing, and tooling. Run any command with `--help` for
all options.

```sh
# If installed globally:
dubhe <command>

# If installed locally (recommended):
node node_modules/@0xobelisk/sui-cli/dist/dubhe.js <command>
# or, with a pnpm script:
pnpm dubhe <command>
```

---

## Development Commands

### `generate` (alias: `schemagen`)

Generate Move code from `dubhe.config.ts`. Creates or updates all files under
`sources/codegen/`. Re-run after every config change.

```sh
dubhe generate
dubhe generate --config-path path/to/dubhe.config.ts
```

> `schemagen` is kept as a deprecated alias for backward compatibility.

### `watch`

Watch `dubhe.config.ts` for changes and automatically re-run `dubhe generate`.
Useful during active development.

```sh
dubhe watch
```

### `build`

Build the Move package without publishing. Useful for checking compilation
errors before deploying.

```sh
dubhe build --network testnet
```

### `test [filter]`

Run Move unit tests. `filter` is a substring matched against each test's fully
qualified name (`addr::module::function`).

```sh
dubhe test                       # run all tests
dubhe test create_player         # run tests whose name contains "create_player"
dubhe test --list                # list available tests without running
dubhe test --gas-limit 10000000  # override the gas limit per test
```

---

## Deployment Commands

### `publish`

Publish the DApp Move package for the first time. Calls `genesis::run` after
publication to create and share `DappStorage`.

```sh
dubhe publish --network testnet
dubhe publish --network localnet --force   # re-publish from scratch
```

Options:

| Option          | Default           | Description                                      |
| --------------- | ----------------- | ------------------------------------------------ |
| `--network`     | `default`         | `mainnet` \| `testnet` \| `devnet` \| `localnet` |
| `--config-path` | `dubhe.config.ts` | Path to config file                              |
| `--gas-budget`  | —                 | Override gas budget (MIST)                       |
| `--force`       | `false`           | Clear existing published state before build      |

### `upgrade`

Upgrade an already-published DApp. Detects version bumps and schema changes,
then calls `migrate_to_vN` automatically.

```sh
dubhe upgrade --network testnet
```

Options match `publish` (except `--force` is not available).

---

## Node Management

### `node`

Start or stop a local Sui node for development.

```sh
dubhe node                     # start with default data directory (.chk)
dubhe node --data-dir ./mynode # custom data directory
dubhe node --force             # stop existing node and restart clean
```

---

## Tooling Commands

### `load-metadata`

Fetch and save a package's Move ABI metadata to
`.history/sui_<network>/<packageId>.json`. Required when constructing the
TypeScript client without calling `loadMetadata()` at runtime.

```sh
dubhe load-metadata --network testnet
dubhe load-metadata --network testnet --package-id 0x<packageId>
```

### `generate-key`

Generate a new keypair and save it to a `.env` file as `PRIVATE_KEY`.

```sh
dubhe generate-key             # write PRIVATE_KEY to .env
dubhe generate-key --force     # overwrite existing key
dubhe generate-key --use-next-public  # use NEXT_PUBLIC_PRIVATE_KEY prefix
```

### `faucet`

Request testnet/devnet SUI for the configured address.

```sh
dubhe faucet --network testnet
dubhe faucet --network testnet --recipient 0x<address>
```

### `check-balance`

Print the SUI balance of the configured address.

```sh
dubhe check-balance --network testnet
```

### `switch-env`

Update the active Sui client environment (writes to `~/.sui/sui_config/client.yaml`).

```sh
dubhe switch-env --network testnet
```

### `info`

Print the active Sui node URL, active address, and configured keypair details.

```sh
dubhe info --network testnet
```

### `store-config`

Generate a TypeScript deployment config file from `dubhe.config.ts` and the
on-chain deployment history. Run after `dubhe publish` to produce a typed
import with `PackageId`, `DappHubId`, `DappStorageId`, and `FrameworkPackageId`.

```sh
dubhe store-config --network testnet --output-ts-path ./src/deployment.ts
```

Options:

| Option             | Default           | Description                                      |
| ------------------ | ----------------- | ------------------------------------------------ |
| `--network`        | `default`         | `mainnet` \| `testnet` \| `devnet` \| `localnet` |
| `--config-path`    | `dubhe.config.ts` | Path to config file                              |
| `--output-ts-path` | —                 | Output path for the generated `.ts` file         |

### `wait`

Wait for one or more services to become ready before continuing. Useful in
CI scripts and local dev startup sequences.

```sh
dubhe wait --localnet                # wait for all dubhe localnet services
dubhe wait --local-node              # wait for the Sui node only (port 9000)
dubhe wait --local-database          # wait for Postgres only (port 5432)
dubhe wait --local-indexer           # wait for the GraphQL indexer only (port 4000)
dubhe wait --url http://localhost:4000/graphql  # wait for an arbitrary URL
```

Options: `--timeout` (ms, default 60000) and `--interval` (ms, default 1000)
control polling behaviour.

### `convert-json`

Convert `dubhe.config.ts` to a JSON file. Run automatically by `publish` and
`upgrade`; rarely needed directly.

```sh
dubhe convert-json
dubhe convert-json --config-path dubhe.config.ts --output-path dubhe.config.json
```

### `doctor`

Diagnose the local development environment: checks Sui CLI installation, Node
version, package versions, and network connectivity.

```sh
dubhe doctor
```

### `shell`

Start an interactive sub-shell with all `dubhe` commands available as
top-level names (no `dubhe` prefix required).

```sh
dubhe shell
```
