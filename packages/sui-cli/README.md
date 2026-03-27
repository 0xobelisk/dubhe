## The Dubhe CLI

The Dubhe CLI is used for building and developing a Dubhe project.

It comes with

1. `schemagen`: Autogenerate Dubhe schemas based on the store schemas config file
2. `publish`: Deploy your own project on the specified sui network.
3. `upgrade`: Upgrade your own project on the specified sui network.
4. `test`: Run Move unit tests with optional VM trace and gas profiling
5. `fuzz`: Run seeded random-test loops and replay flaky seeds
6. `invariant`: Run seeded invariant loops with automatic failing-seed shrink
7. `snapshot`: Capture object snapshots and diff state transitions
8. `quality-trend`: Aggregate quality metrics into timeline and enforce thresholds
9. `coverage`: Run coverage, emit lcov, and enforce threshold gate
10. `trace`: Human-readable transaction trace by digest (supports replay and digest files)
11. `debug`: Deep test debug mode with source-aware abort hints and repro artifacts
12. `localnode`: Start a local Sui node for development
13. `faucet`: An interface to the Devnet/Localnet faucet. It makes it easy to fund addresses on the Devnet/localnet

## Installation

We don't recommend installing the CLI globally.

Instead, you should add the CLI as a dev dependency to your project (done automatically if you start from a starter kit using `pnpm create dubhe`), and use it with `pnpm build` inside your project directory.

## Using the CLI

Some commands expect a Dubhe config in the same folder where the CLI is being executed. This includes `schemagen` and `publish`.

`faucet`, and `localnode` can be executed anywhere.

## Commands

### `schemagen`

Generates Store libraries from a `dubhe.config.ts` file. See the [Store Config and `schemagen` documentation](https://dubhe-docs.obelisk.build/dubhe/sui/store/config) in the Store section for more details.

```bash
# in a folder with a dubhe.config.ts
dubhe schemagen --config-path dubhe.config.ts
```

### `publish`

Deploy a Dubhe contract project with the dubhe framework.

This tool will use the `dubhe.config.ts` to detect all systems, schemas and projectName in the project and will deploy them to the chain specified.

When using the deployer, you must set the private key of the deployer using the `PRIVATE_KEY` environment variable. You can make this easier by using [`dotenv`](https://www.npmjs.com/package/dotenv) before running `dubhe publish` in your deployment script.

To set up the target network for deploying the contract (mainnet/testnet/devnet/localnet), before deploying the contract, please make sure that you have some tokens in your account, which will be used for some fees when deploying the contract. (If you choose devnet/localnet, you can get some test tokens via `dubhe faucet`), if you need to deploy the contract on localnet, please make sure you have started localnode.

```bash
# to deploy sui locally
dubhe publish --network localnet
# to deploy to sui devnet
dubhe publish --network devnet
# to deploy to sui testnet
dubhe publish --network testnet
# to deploy to sui mainnet
dubhe publish --network mainnet
```

### `upgrade`

Upgrade Dubhe contract project.

When you add a new schema or modify the system code, you need to upgrade the contract through the `upgrade` method. ([Migration Guide](https://dubhe-docs.obelisk.build/dubhe/migration))

```bash
dubhe upgrade --network <network:mainnet/testnet/devnet/localnet>
```

### `test`

Runs `sui move test` for your Dubhe package, with optional trace and gas statistics.

```bash
# run all tests
dubhe test --config-path dubhe.config.ts

# run a single test with higher gas limit
dubhe test --test counter::counter_test --gas-limit 500000000

# print Move VM trace
dubhe test --trace

# gas profiling summary (top N) and report output
dubhe test --profile-gas --profile-top 20 --profile-out .reports/move-gas.json

# gas regression gate against baseline (fail if >5%)
dubhe test --profile-gas \
  --profile-baseline .reports/move-gas-baseline.json \
  --profile-threshold-pct 5

# initialize/update baseline from current run
dubhe test --profile-gas \
  --profile-baseline .reports/move-gas-baseline.json \
  --update-profile-baseline
```

### `trace`

Fetches a transaction and prints a human-readable execution summary (status, gas, calls, events, object/balance changes).

```bash
# trace by digest using active network
dubhe trace --digest <txDigest>

# explicit network
dubhe trace --network testnet --digest <txDigest>

# raw json for machine processing
dubhe trace --digest <txDigest> --json

# replay tx bytes with dry-run (for deeper debug)
dubhe trace --digest <txDigest> --replay --show-inputs

# trace a batch of transactions from file
dubhe trace --digest-file .reports/tx-digests.txt --replay --continue-on-error
```

### `fuzz`

Runs repeated seeded `sui move test` executions, records failing seeds, and prints reproduction command.

```bash
# run 50 seeded fuzz rounds
dubhe fuzz --iterations 50

# replay a failing seed
dubhe fuzz --replay-seed 1712300012345
```

### `invariant`

Runs seeded invariant-style loops with three production-oriented phases:

- corpus replay (known flaky seeds),
- shrink window search,
- adaptive minimization + tail scan.

```bash
# run invariant loop and update corpus
dubhe invariant --iterations 50 --corpus-path .reports/move/invariant-corpus.json

# replay a minimized failing seed
dubhe invariant --replay-seed 1712300012301

# bounded minimization attempts/tail scan
dubhe invariant --minimize-attempts 80 --minimize-tail-window 40 --report-out .reports/move/invariant.json
```

### `snapshot`

Captures selected object states to JSON and diffs two snapshots by `objectId/version/digest`.

```bash
# capture snapshot for specific objects
dubhe snapshot --network testnet --objects 0xabc,0xdef --out .reports/snapshots/before.json

# capture using file input
dubhe snapshot --objects-file .reports/object_ids.txt --out .reports/snapshots/after.json

# diff two snapshots
dubhe snapshot --from .reports/snapshots/before.json --to .reports/snapshots/after.json

# machine-readable diff output
dubhe snapshot --from before.json --to after.json --json --out .reports/snapshots/diff.json
```

### `quality-trend`

Aggregates gas, coverage, fuzz, and invariant reports into a timeline JSON and optionally fails on threshold violations.

```bash
# append a quality snapshot and enforce thresholds
dubhe quality-trend \
  --gas-profile .reports/move-gas-current.json \
  --coverage-summary .reports/move-coverage-summary.txt \
  --fuzz-report .reports/move/fuzz.json \
  --invariant-report .reports/move/invariant.json \
  --max-gas-regression-pct 1 \
  --min-coverage-pct 6.5

# machine-readable output + snapshot artifact
dubhe quality-trend --json --snapshot-out .reports/move/quality-snapshot.json
```

### `coverage`

Runs coverage-enabled tests, generates `lcov.info`, and optionally enforces a minimum coverage percentage.

```bash
# generate summary + lcov
dubhe coverage --lcov-out .reports/move/lcov.info

# fail if total move coverage < 70%
dubhe coverage --threshold-pct 70

# print source-level coverage for one module
dubhe coverage --source-module dubhe::session_system
```

### `debug`

Runs test command in debug-oriented mode, extracts likely abort hints, and maps Move abort codes back to local source files/error constants.

```bash
# debug a failing test with trace
dubhe debug --filter session_cap_test --trace --show-abort-hints

# list tests first
dubhe debug --list-tests

# write structured repro artifact for CI attachments
dubhe debug --filter session_cap_test --repro-out .reports/move/debug-repro.json
```

### `localnode`

The localnode uses the official `sui-test-validator` binary provided by sui to start the localnode.

The local rpc is `http://127.0.0.1:9000`

```bash
dubhe localnode
```

### `faucet`

Connects to a Dubhe faucet service to fund an address.

```bash
dubhe faucet --network <network:devnet/localnet>
dubhe faucet --network <network:devnet/localnet> --recipient <address>
```

The default faucet service automatically gives test tokens to accounts in [`dotenv`](https://www.npmjs.com/package/dotenv).

To fund an address on the devnet/localnet, run `dubhe faucet --recipient <address>`
