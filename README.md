# Dubhe - The Fabric of Autonomous Worlds

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.19.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange.svg)](https://pnpm.io/)

Dubhe is an open-source Move application and game engine framework that provides schema-based
storage, multi-chain support, and comprehensive development tools for building autonomous worlds.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.19.0
- pnpm >= 8.0.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/0xobelisk/dubhe.git
cd dubhe

# Install dependencies
pnpm install

# Initialize git hooks
pnpm prepare
```

### Development

```bash
# Start all development servers
pnpm dev

# Start specific projects
pnpm dev:paper    # Documentation site
pnpm dev:site     # Main website

# Build all projects
pnpm build

# Build specific projects
pnpm build:paper  # Build documentation
pnpm build:site   # Build website
```

## 📦 Project Structure

```
dubhe/
├── packages/           # Core packages and libraries
│   ├── sui-client/     # Sui blockchain client
│   ├── sui-cli/        # Sui command-line interface
│   ├── sui-common/     # Shared Sui utilities
│   ├── aptos-client/   # Aptos blockchain client
│   ├── aptos-cli/      # Aptos command-line interface
│   ├── ecs/            # Entity Component System
│   ├── graphql-server/ # GraphQL API server
│   ├── monitoring/     # Performance monitoring
│   ├── i18n/           # Internationalization
│   └── benchmark/      # Performance benchmarking
├── paper/              # Documentation site (Nextra)
├── site/               # Main website (Next.js + shadcn/ui)
├── docs/               # Multi-language documentation
├── templates/          # Project templates
├── examples/           # Example projects
├── e2e-tests/          # End-to-end tests
├── k8s/                # Kubernetes configurations
└── monitoring/         # Monitoring stack
```

## 🌐 Multi-Language Support

Dubhe supports multiple languages:

- 🇺🇸 [English](./docs/README.md)
- 🇨🇳 [中文](./docs/zh/README.md)
- 🇯🇵 [日本語](./docs/ja/README.md)
- 🇰🇷 [한국어](./docs/ko/README.md)

## 📚 Documentation

- **📖 [Documentation Site](./paper/)** - Comprehensive guides and API reference
- **🌐 [Website](./site/)** - Project homepage and marketing site
- **🔧 [Engineering Guide](./ENGINEERING.md)** - Development setup and best practices

## 🛠️ Development Tools

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm type-check

# Run tests
pnpm test
```

### Performance & Monitoring

```bash
# Run benchmarks
pnpm benchmark:run

# Performance monitoring
pnpm performance:monitor

# Health check
pnpm health:check
```

### Internationalization

```bash
# Extract translations
pnpm i18n:extract

# Validate translations
pnpm i18n:validate

# Sync translations
pnpm sync-translations
```

## 🚀 Deployment

### Docker

```bash
# Build and run with Docker
pnpm docker:build
pnpm docker:dev
```

### Kubernetes

```bash
# Deploy to Kubernetes
pnpm k8s:apply

# View logs
pnpm k8s:logs
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contribute.mdx) for details.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for
details.

## 🔗 Links

- [Website](https://dubhe.obelisk.build)
- [Documentation](https://docs.dubhe.obelisk.build)
- [GitHub](https://github.com/0xobelisk/dubhe)
- [Discord](https://discord.gg/obelisk)
- [Twitter](https://twitter.com/0xobelisk)
