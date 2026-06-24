## Dubhe

<div align="center">
  <img src="assets/dubhe.png">
  <br />
  <a href="https://github.com/0xobelisk/dubhe/releases">
    <img src="https://img.shields.io/github/v/tag/0xobelisk/dubhe.svg?sort=semver"/>
  </a>  
 <a href="https://twitter.com/0xObeliskLabs">
    <img src="https://img.shields.io/twitter/follow/0xObeliskLabs?style=social"/>
  </a>
  <a href="https://github.com/0xobelisk/dubhe/stargazers">
    <img src="https://img.shields.io/github/stars/0xobelisk/dubhe?style=social"/>
   </a>
  <a href="https://github.com/0xobelisk/dubhe/network/members">
    <img src="https://img.shields.io/github/forks/0xobelisk/dubhe?style=social"/>  
  </a>
</div>

> Dubhe is a community-driven, open-source Move application engine and provable game engine — a full-stack toolkit for building verifiable DApps and fully on-chain worlds.

Dubhe v2 runs in production on **Sui** (testnet and mainnet). It pairs an on-chain Move framework with a three-tier storage model, a Rust event indexer (GraphQL + gRPC), and type-safe TypeScript/React SDKs, so you can go from `pnpm create dubhe` to a deployed, queryable DApp in hours.

## 🔑 Key Features

- ⚡️ Built with [Move](https://move-language.github.io/move/), production-ready on Sui
- 🗄️ Three-tier storage: `DappHub` → `DappStorage` → `UserStorage`, plus extended storage (objects, scenes, permits)
- 🔑 [Session keys](https://dubhe-docs.obelisk.build/dubhe/sui/contracts/session-keys) for silent, delegated signing
- 🛒 Built-in [marketplace](https://dubhe-docs.obelisk.build/dubhe/sui/contracts/marketplace) and reactive cross-user writes
- 🧩 [ECS](https://dubhe-docs.obelisk.build/dubhe/sui/ecs) world client and React hooks
- 🔎 Rust indexer exposing GraphQL and gRPC over PostgreSQL
- 🛠️ Type-safe SDKs, code generation from `dubhe.config.ts`, logic upgrades & data migration
- 🌐 Multi-Move ecosystem clients (Aptos / Movement, Rooch, Initia)

## 🔮 Roadmap

- 🔐 ZK-login Plugin Integration
- 💰 Transaction Sponsorship Plugin
- 🔄 State Synchronization Client Hooks
- ⚙️ Custom Runtime Sandbox
- 🌍 World Browser Interface

## 📦 Packages

| Package                                                | Description                            | Version                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [create-dubhe](./packages/create-dubhe)                | Project scaffolding tool               | [![npm](https://img.shields.io/npm/v/create-dubhe.svg)](https://www.npmjs.com/package/create-dubhe)                           |
| [@0xobelisk/sui-cli](./packages/sui-cli)               | Sui CLI for testing, deployment & more | [![npm](https://img.shields.io/npm/v/@0xobelisk/sui-cli.svg)](https://www.npmjs.com/package/@0xobelisk/sui-cli)               |
| [@0xobelisk/sui-client](./packages/sui-client)         | Sui TypeScript Client                  | [![npm](https://img.shields.io/npm/v/@0xobelisk/sui-client.svg)](https://www.npmjs.com/package/@0xobelisk/sui-client)         |
| [@0xobelisk/sui-common](./packages/sui-common)         | Sui Core Utilities                     | [![npm](https://img.shields.io/npm/v/@0xobelisk/sui-common.svg)](https://www.npmjs.com/package/@0xobelisk/sui-common)         |
| [@0xobelisk/client](./packages/client)                 | High-level Dubhe client (v2)           | [![npm](https://img.shields.io/npm/v/@0xobelisk/client.svg)](https://www.npmjs.com/package/@0xobelisk/client)                 |
| [@0xobelisk/react](./packages/react)                   | React hooks (session keys, tx, ECS)    | [![npm](https://img.shields.io/npm/v/@0xobelisk/react.svg)](https://www.npmjs.com/package/@0xobelisk/react)                   |
| [@0xobelisk/grpc-client](./packages/grpc-client)       | gRPC client for the Dubhe indexer      | [![npm](https://img.shields.io/npm/v/@0xobelisk/grpc-client.svg)](https://www.npmjs.com/package/@0xobelisk/grpc-client)       |
| [@0xobelisk/aptos-cli](./packages/aptos-cli)           | Aptos/Movement CLI Tools               | [![npm](https://img.shields.io/npm/v/@0xobelisk/aptos-cli.svg)](https://www.npmjs.com/package/@0xobelisk/aptos-cli)           |
| [@0xobelisk/aptos-client](./packages/aptos-client)     | Aptos/Movement TypeScript Client       | [![npm](https://img.shields.io/npm/v/@0xobelisk/aptos-client.svg)](https://www.npmjs.com/package/@0xobelisk/aptos-client)     |
| [@0xobelisk/aptos-common](./packages/aptos-common)     | Aptos/Movement Core Utilities          | [![npm](https://img.shields.io/npm/v/@0xobelisk/aptos-common.svg)](https://www.npmjs.com/package/@0xobelisk/aptos-common)     |
| [@0xobelisk/rooch-cli](./packages/rooch-cli)           | Rooch CLI Tools                        | [![npm](https://img.shields.io/npm/v/@0xobelisk/rooch-cli.svg)](https://www.npmjs.com/package/@0xobelisk/rooch-cli)           |
| [@0xobelisk/rooch-client](./packages/rooch-client)     | Rooch TypeScript Client                | [![npm](https://img.shields.io/npm/v/@0xobelisk/rooch-client.svg)](https://www.npmjs.com/package/@0xobelisk/rooch-client)     |
| [@0xobelisk/initia-cli](./packages/initia-cli)         | Initia CLI Tools                       | [![npm](https://img.shields.io/npm/v/@0xobelisk/initia-cli.svg)](https://www.npmjs.com/package/@0xobelisk/initia-cli)         |
| [@0xobelisk/initia-client](./packages/initia-client)   | Initia TypeScript Client               | [![npm](https://img.shields.io/npm/v/@0xobelisk/initia-client.svg)](https://www.npmjs.com/package/@0xobelisk/initia-client)   |
| [@0xobelisk/graphql-client](./packages/graphql-client) | GraphQL Client for Dubhe               | [![npm](https://img.shields.io/npm/v/@0xobelisk/graphql-client.svg)](https://www.npmjs.com/package/@0xobelisk/graphql-client) |
| [@0xobelisk/ecs](./packages/ecs)                       | ECS Client for Dubhe                   | [![npm](https://img.shields.io/npm/v/@0xobelisk/ecs.svg)](https://www.npmjs.com/package/@0xobelisk/ecs)                       |
| [@0xobelisk/graphql-server](./packages/graphql-server) | GraphQL Server for Dubhe               | [![npm](https://img.shields.io/npm/v/@0xobelisk/graphql-server.svg)](https://www.npmjs.com/package/@0xobelisk/graphql-server) |

## 🗒 Quick Links

- 📚 [Documentation](https://dubhe-docs.obelisk.build/)
- 🚀 [Quick Start Guide](https://dubhe-docs.obelisk.build/dubhe/sui/quick-start)
- 💬 [Join our Telegram](https://t.me/+0_98p03Fbv1hNzY1)
- 🐛 [Report Issues](https://github.com/0xobelisk/dubhe/issues)

## Contributors ✨

Thanks to these outstanding contributors ❤️

<div align="center">
  <a href="https://github.com/0xobelisk/dubhe/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=0xobelisk/dubhe" width="100%" />
  </a>
</div>

## ⭐ Star History

<div align="center">
  <a href="https://star-history.com/#0xobelisk/dubhe&Date">
    <img src="https://api.star-history.com/svg?repos=0xobelisk/dubhe&type=Date" alt="Star History Chart" width="100%" />
  </a>
</div>
