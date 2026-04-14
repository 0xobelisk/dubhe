# Dubhe DApp Developer Reference (LLM Index)

> Documentation for developers building DApps on top of the Dubhe framework.
> Read this index first, then open the specific page you need.

## Pages

- [Quickstart](./quickstart.md): From zero to a deployed DApp — create `dubhe.config.ts`, generate Move code, write system functions, and deploy. Start here.

- [CLI Reference](./cli.md): All `dubhe` CLI commands — `generate`, `publish`, `upgrade`, `test`, `watch`, `node`, `load-metadata`, `doctor`, and more.

- [DubheConfig Reference](./dubhe-config.md): Full reference for `dubhe.config.ts` — all fields (`resources`, `enums`, `errors`), resource options (`global`, `keys`, `offchain`), and annotated examples.

- [dapp_system API](./dapp-api.md): Every public function in `dapp_system` with signatures, descriptions, and usage examples. Covers storage, guards, ownership, and fee management.

- [Deployment & Upgrade](./deployment.md): How to publish a DApp for the first time, how to upgrade to a new package version, and how to protect system functions with the version guard pattern.

- [DApp Upgrade Guide](./upgrade.md): Complete upgrade lifecycle — compatible upgrades, schema migrations, the version guard pattern, boundary conditions, and deployment artifacts.

- [Client Packages](./client.md): TypeScript client packages for interacting with on-chain contracts, the indexer, and the ECS world. Covers `@0xobelisk/client/sui` (`createClient`), `@0xobelisk/react` (Provider + hooks), `@0xobelisk/sui-client` (`Dubhe`), `@0xobelisk/graphql-client`, and `@0xobelisk/ecs`.
