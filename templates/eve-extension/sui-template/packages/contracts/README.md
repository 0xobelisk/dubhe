## contracts

Move extension package for Dubhe business flow.

Core module: `eve_extension::extension_system`

- `initialize(dapp_hub, max_units_per_call)`
- `update_config(dapp_hub, paused, max_units_per_call)`
- `record_action(dapp_hub, units, nonce)`
- `read_config(dapp_hub)`
- `read_player_stats(dapp_hub, player)`

### Commands

```bash
pnpm run schemagen
pnpm run build:move
pnpm run test:move
pnpm run deploy testnet
pnpm run config:store testnet
```

After `config:store`, script metadata is generated at:

- `../ts-scripts/src/deployment.ts`
