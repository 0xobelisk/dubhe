---
name: dubhe
description: Guides development of the Dubhe framework itself on Sui Move. Use this skill whenever the user is contributing to or modifying the Dubhe protocol internals — including the three-tier storage model (DappHub/DappStorage/UserStorage), the codegen pipeline, security patterns (CVE-D-02, Ownable2Step, Lazy Settlement), framework version upgrades, or the dapp_system/dapp_service modules. Also use when the user is debugging framework-level issues, adding new framework errors or resources to dubhe.config.ts in the framework/ directory, or running the framework upgrade procedure.
---

# Dubhe Framework Development

This skill covers contributing to and maintaining the Dubhe framework itself — the Sui Move
infrastructure that DApp contracts build on. It is distinct from building a DApp _on top of_
Dubhe (use the `dubhe-dapp` skill for that).

## Reference Files

Load the relevant reference file(s) based on what the user is working on.

| File                              | When to read                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `references/architecture.md`      | Module layer overview, three-tier storage model, key module responsibilities                                  |
| `references/codegen-pipeline.md`  | How `dubhe.config.ts` drives `generate`, adding errors/resources, what files must not be edited               |
| `references/security-patterns.md` | CVE-D-02 (UserStorage ownership), Ownable2Step, Lazy Settlement fee model, proxy/session key security         |
| `references/upgrade.md`           | Framework upgrade procedure, `FRAMEWORK_VERSION` vs `DappHub.version`, `migrate_to_vN`, governance, e2e tests |

## Key Concepts

**Module layers** (top to bottom):

1. `systems/` — public API (`dapp_system`, `address_system`)
2. `core/` — storage layer (`dapp_service`, events, key encoding)
3. `codegen/` — auto-generated from `dubhe.config.ts` (never edit by hand)
4. `scripts/` — lifecycle hooks (`deploy_hook`, `migrate`)
5. `utils/` — shared helpers (BCS, math, entity IDs)

**Two version mechanisms**:

- `ON_CHAIN_VERSION` in `migrate.move` — gates per-DApp function calls (managed by DApp developers)
- `FRAMEWORK_VERSION` in `dapp_system.move` — gates framework lifecycle calls (managed by Dubhe team)

**Security invariants**:

- User data lives in caller-owned `UserStorage` (shared object, one per user per DApp) — never accept `resource_address` from caller
- Always use `address_system::ensure_origin(ctx)` (not `ctx.sender()`) to derive user key when a session proxy may be active
- Admin transfers use Ownable2Step (`propose_ownership` → `accept_ownership`)
- Lazy Settlement charges write fees from `credit_pool`; `MAX_UNSETTLED_WRITES = 1_000`

## Adding to the Framework

### New error

1. Add to `errors` in `framework/dubhe.config.ts` (and `e2e/dubhe.config.ts`)
2. Run `dubhe generate` in both directories
3. Use: `errors::my_new_error_error(condition)`

### New resource

1. Add to `resources` in `dubhe.config.ts`; use `global: true` for `DappStorage`, omit for `UserStorage`
2. Run `dubhe generate`
3. New module appears at `sources/codegen/resources/<name>.move`

### Framework upgrade (breaking)

1. Increment `FRAMEWORK_VERSION` in `dapp_system.move`
2. Update `dubhe.config.ts` + run `generate` if resources changed
3. Run `dubhe upgrade --name dubhe --network testnet`
4. `upgradeHandler` detects pending schema changes and calls `migrate_to_vN` on-chain,
   which bumps `DappStorage.version` and registers the new package ID

Read `references/upgrade.md` for the full procedure and security boundary analysis.
