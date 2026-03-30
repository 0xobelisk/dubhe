# Building on an existing world

_Coming soon._ This guide will cover the end-to-end flow when the world is already deployed (e.g. shared server, live game) and you don't hold GovernorCap or run the world deploy yourself.

Planned topics:

- **GovernorCap / AdminACL** — In the live game you don't hold GovernorCap or AdminACL enrollment. You only perform player-signer operations (e.g. issue permit, jump with permit, collect bounty). Admin operations (configure rules, authorise-gate-extension, authorise-storage-unit-extension) are for local testing.
- **Object discovery** — No local `extracted-object-ids.json`; discovering world object IDs via RPC/GraphQL or a helper.

Until this doc is written, use the [Docker](./builder-flow-docker.md) or [Host](./builder-flow-host.md) flow for localnet/testnet where you deploy the world; see [Auth and signers](./auth-and-signers.md) for who signs vs who sponsors each operation.
