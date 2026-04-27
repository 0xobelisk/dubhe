# Codegen Pipeline

## Overview

Dubhe uses a code-generation step to produce boilerplate Move modules from a TypeScript
config file. The flow is:

```
dubhe.config.ts
      │
      │  node .../dubhe.js generate
      ▼
sources/codegen/
  ├── error.move          — error constants + assertion helpers
  ├── genesis.move         — DappStorage initialisation entry point
  ├── dapp_key.move        — DappKey struct for this package
  ├── init_test.move       — #[test_only] DappHub factory
  ├── user_storage_init.move — init_user_storage entry for first-time registration
  └── resources/
        ├── <resource_a>.move   — global (DappStorage) or user (UserStorage)
        ├── <resource_b>.move
        └── ...
```

## Running generate

From the package directory that contains `dubhe.config.ts`:

```sh
node .../dubhe.js generate
```

Both `framework/` and `e2e/` have their own `dubhe.config.ts`. Run generate in each
directory after any config change to keep them in sync.

## `dubhe.config.ts` Structure

```typescript
import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'my_dapp', // Move module prefix
  description: '...',
  resources: {
    // Global resource — stored in DappStorage (shared, all users see the same value)
    global_counter: {
      fields: { value: 'u64' },
      global: true // → set(dapp_storage, ...) / get(dapp_storage)
    },
    // User resource — stored in UserStorage (per-user, hot path)
    player_score: {
      fields: { score: 'u64', level: 'u32' },
      keys: ['level'] // optional: composite lookup keys within UserStorage
      // global omitted / false → set(user_storage, ...) / get(user_storage)
    }
  },
  errors: {
    not_found: 'Record not found'
  }
} as DubheConfig;
```

## Adding a New Error

1. Open `framework/dubhe.config.ts` (and `e2e/dubhe.config.ts` if applicable).
2. Add an entry to the `errors` object:
   ```typescript
   errors: {
     // existing entries …
     my_new_error: 'Descriptive error message',
   }
   ```
3. Run generate in both directories.
4. The new constant and helper function appear in `codegen/error.move`:
   ```move
   #[error]
   const MY_NEW_ERROR: vector<u8> = b"Descriptive error message";
   public fun my_new_error_error(condition: bool) { assert!(condition, MY_NEW_ERROR) }
   ```
5. Import and call `error::my_new_error_error(condition)` where needed.

## Adding a New Resource

1. Add a resource definition to `resources` in `dubhe.config.ts`.
   - Use `global: true` for DApp-wide singleton state (stored in `DappStorage`).
   - Omit `global` (default `false`) for per-user state (stored in `UserStorage`).
2. Run generate.
3. A new module `codegen/resources/<resource_name>.move` is created with:
   - `set`, `get`, `has`, `delete` (and struct getters/setters for each field)
   - Global resources use `&DappStorage` / `&mut DappStorage`
   - User resources use `&UserStorage` / `&mut UserStorage`
4. The resource is accessible via `<resource_name>::set(storage, ...)` etc.

## What NOT to Edit

The following files are entirely owned by generate:

- `sources/codegen/error.move`
- `sources/codegen/genesis.move`
- `sources/codegen/dapp_key.move`
- `sources/codegen/init_test.move`
- `sources/codegen/user_storage_init.move`
- `sources/codegen/resources/*.move`

Any manual changes will be overwritten on the next `generate` run.
Hand-written logic belongs in `sources/systems/`, `sources/core/`, or `sources/utils/`.

## framework/ vs e2e/ Sync

`framework/dubhe.config.ts` and `e2e/dubhe.config.ts` serve different purposes and are
not guaranteed to be identical. The framework config defines errors and resources for the
core infrastructure; the e2e config defines errors and resources used in integration tests.
After updating either, run generate in that directory and verify the corresponding
`codegen/error.move` compiles correctly.
