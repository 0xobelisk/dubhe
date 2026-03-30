# TypeScript scripts

Interact with the published `smart_gate_extension` package on top of an EVE world deployment.

## Prerequisites

1. World deployment artifacts copied into this project root:
   - `deployments/<network>/extracted-object-ids.json`
   - `test-resources.json`
2. Your extension package is published and `.env` contains:
   - `BUILDER_PACKAGE_ID`
   - `EXTENSION_CONFIG_ID`

## Script order (smart gate example)

```bash
pnpm configure-rules
pnpm authorise-gate-extension
pnpm authorise-storage-unit-extension
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```

## Utilities

- `utils/helper.ts`: env + context + world config hydration
- `utils/derive-object-id.ts`: deterministic object id derivation from in-game IDs
- `utils/transaction.ts`: sponsored transaction execution
- `helpers/*`: owner-cap lookup helpers via dev inspect
