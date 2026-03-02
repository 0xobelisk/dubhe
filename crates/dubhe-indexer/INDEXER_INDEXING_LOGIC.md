# Indexer Indexing Logic (Analysis)

## Data flow (high level)

1. **Startup** (`main.rs`)

   - Load `dubhe.config.json`: `original_package_id`, `start_checkpoint`, `resources` / `components` (table names and fields).
   - Resolve checkpoint source:
     - If `--use-rpc-ingestion`: use **RPC (gRPC)** to fetch checkpoints from `--rpc-url` (recommended for localnet).
     - Else if `--checkpoint-url` starts with `http` → **remote store**.
     - Else → **local path** (e.g. `.chk`); see “Local path format” below.
   - Build `IndexerCluster` with `IndexerArgs.first_checkpoint` and `ClientArgs` (local / remote / rpc_api_url).
   - Register `DubheEventHandler` as the sequential pipeline processor and run the cluster.

2. **Checkpoint ingestion** (Sui framework, outside this repo)

   - The framework reads checkpoints from either the local path or the remote store.
   - It passes each checkpoint to our `Processor::process(&checkpoint)`.

3. **Process** (`handlers.rs` – `Processor::process`)
   - For each checkpoint: iterate `checkpoint.transactions`.
   - For each transaction: read `transaction.events` (optional). If `None`, the transaction is skipped (no events).
   - For each event in `events.data`: check if the event type is `Dubhe_Store_SetRecord`, `Dubhe_Store_SetField`, or `Dubhe_Store_DeleteRecord`.
   - If it is a Dubhe store event:
     - Parse BCS with `Event::from_bytes(short_name, event.contents)` (with normalization for the new format: account/key/value → table_id/key_tuple/value_tuple).
     - Check `dubhe_config.can_convert_event_to_sql(&event)`:
       - Event’s `original_package_id()` (from `dapp_key`) must equal config’s `original_package_id`.
       - Event’s `table_id()` (after normalization) must appear in config (in `resources` or `components`).
     - If OK: build SQL via `convert_event_to_sql`, push to batch; notify gRPC/GraphQL subscribers.
   - Returned batch is executed by `Handler::commit` (runs the SQL statements).

## Why you might see no data and no new logs

| Symptom                                                                        | Likely cause                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No “process checkpoint” logs at all**                                        | The framework is not calling `process()`. Possible reasons: no checkpoints available (local dir empty or not written by node; remote store returns nothing for the requested range); `first_checkpoint` is beyond the latest checkpoint; or ingestion pipeline not running / error before process. |
| **“process checkpoint seq=X” appears but no “dubhe event” or “indexed table”** | Checkpoints are being processed but: (1) `transaction.events` is `None` for all tx (ingestion may not populate events for this source), or (2) events exist but none are `Dubhe_Store_*`, or (3) parse fails, or (4) `can_convert_event_to_sql` fails (package id or table name mismatch).         |
| **“skip event (can_convert_event_to_sql)”**                                    | Package id mismatch (event from another package) or **table name mismatch** (e.g. config has `value` but event has `counter1`, or the opposite).                                                                                                                                                   |

## Config vs events

- **dubhe.config.json** defines tables from `resources` and `components` (e.g. `value` with field `value: u32`). Only events whose `table_id()` (after normalization) is one of these names are accepted.
- **Event format**: New framework format is `(dapp_key, account, key, value)`. Normalization in `dubhe_common::events` turns this into `table_id = utf8(key[0])` (e.g. `"value"`), `key_tuple = [bcs(account)]`, so the indexer and SQL see a single table name and entity key.

## Local path format (v1.58.1)

The framework’s **local** ingestion expects one file per checkpoint: **`{seq}.chk`** (e.g. `149.chk`) in **BCS** format. The node started by `sui start --data-ingestion-dir .chk` writes **`{seq}.binpb.zst`** (protobuf + zstd) instead. So with a local path the indexer typically gets no checkpoints (wrong filename/format). Use **remote store** (testnet/mainnet) or **RPC ingestion** when the node supports it (see below).

## “Failed to fetch checkpoint … 404 … get_full_checkpoint” (RPC ingestion)

When using **`--use-rpc-ingestion`**, the indexer uses the **gRPC** `GetCheckpoint` API (full checkpoint content). If you see:

`Retrying due to error: Failed to fetch checkpoint N: status: Unimplemented, message: "grpc-status header missing, mapped from HTTP status code 404" reason="get_full_checkpoint"`

then the server at `--rpc-url` (e.g. `http://localhost:9000`) is **not** answering that gRPC method. Common causes:

- **Local node (`sui start`)**: Port 9000 usually serves **JSON-RPC** only (or gRPC-Web in a way that does not match the indexer’s native gRPC client). So RPC ingestion fails on localnet with the default setup.
- **Fix for localnet**: Use **remote checkpoint store** (e.g. testnet) instead of RPC, or run the indexer against a full node that exposes the gRPC LedgerService (e.g. a testnet/mainnet RPC URL that supports it). For a **local** node we do not support RPC ingestion or local `.chk` (node writes `.binpb.zst`) with the current framework; use a remote store or a chain that provides gRPC checkpoint API.

## Suggested checks

1. **Checkpoint source**: For **localnet**, neither local path (node writes `.binpb.zst`, indexer expects `.chk`) nor RPC ingestion (node often doesn’t serve gRPC GetCheckpoint) works with the default setup. Use a **remote store URL** (e.g. testnet) or an RPC endpoint that supports full checkpoint gRPC. For **testnet/mainnet**, `--use-rpc-ingestion` or remote store usually works.
2. **Confirm `start_checkpoint`**: In `dubhe.config.json`, `start_checkpoint` must be ≤ the first checkpoint that contains your contract’s transactions (e.g. deployment or first call).
3. **Confirm config matches contract**: `original_package_id` must be your package id; resources must include the table name emitted by the contract (e.g. `value`).
4. **Log level**: Use `RUST_LOG=info` (or `debug`) so that “process checkpoint” and any “skip” / “indexed” lines are visible.
