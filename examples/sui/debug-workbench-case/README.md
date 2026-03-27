# Dubhe Debug Workbench Case

This case shows how to run a visual debug website as part of the standard `pnpm run dev` flow.

## Directory

- root: `examples/sui/debug-workbench-case`
- contracts package: `examples/sui/debug-workbench-case/packages/contracts`
- web package (Next.js 16.2.x): `examples/sui/debug-workbench-case/packages/web`
- generated debug artifacts: `packages/contracts/.reports/move/*`

## Quick Start

```bash
cd examples/sui/debug-workbench-case
pnpm install
pnpm run dev
```

After `dev` starts:

- open `http://localhost:4173` for Workbench v0.4 (Next.js realtime UI)
- legacy html remains at `packages/contracts/.reports/move/workbench.html`
- use the `shell` pane in mprocs for ad-hoc Dubhe commands

## What `pnpm run dev` starts

`mprocs.yaml` starts:

1. `node`: local Sui node
2. `debug_collect`: auto-collect debug/gas artifacts
3. `debug_workbench`: rebuild legacy static `workbench.html` every 2 seconds
4. `debug_web`: run Next.js v0.4 UI on `4173`
5. `shell`: `dubhe shell`

## Important scripts

- `pnpm run debug:collect:once`: one-shot artifact generation
- `pnpm run debug:collect:watch`: re-run artifact generation when Move source changes
- `pnpm run debug:web`: start Next.js realtime debugger UI (`packages/web`)
- `pnpm run debug:web:legacy`: one-shot build of static `.reports/move/workbench.html`
- `pnpm run debug:open`: create/update VSCode `move-debug` launch config and open target
- `pnpm run debug:tui`: terminal interactive timeline debugger

## Workbench v0.4 features

- local API snapshot: `GET /api/debug/payload`
- SSE realtime updates: `GET /api/debug/stream`
- instruction-level trace timeline parsed from `.json.zst`
- step inspector: timeline filter/search + prev/next/play navigation
- breakpoint controls: module/function/instruction + next-break jump
- call stack panel per trace instruction step
- variables/effects panel per trace instruction step
- state diff panel (before/after/delta counters)
- source-context preview for gas/source-hint rows
- replay command panel (copy command)
- trace file panel for `.json.zst` targets with `debug-open` command copy

## Notes

- This case uses the same `@0xobelisk/sui-cli` commands implemented in this repo:
  - `dubhe debug`
  - `dubhe test --profile-gas`
  - `dubhe workbench`
  - `dubhe debug-open`
  - `dubhe debug-tui`
- `debug_collect` tolerates failing tests and still emits debug artifacts to keep the website usable during failure triage.
- The contracts scripts call `packages/sui-cli/src/dubhe.ts` directly (source mode), so this case works even if `@0xobelisk/sui-cli` has not been built to `dist/` yet.
