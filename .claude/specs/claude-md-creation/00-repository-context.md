# Repository Context Analysis - Dubhe

## Project Overview

**Dubhe** is a community-driven, open-source Move Application Creation Engine and Provable Game Engine designed for building fully on-chain applications. The project provides a comprehensive toolkit for creating verifiable Dapps and fully on-chain world/universe-type applications.

### Core Mission
- Reduce project setup time from days to hours through powerful toolkit
- Enable development of fully on-chain applications with real-time capabilities
- Support multiple Move blockchain ecosystems

## Project Type & Architecture

**Primary Type:** Multi-ecosystem blockchain development framework
**Architecture:** Hybrid monorepo with both Rust and TypeScript/JavaScript components

### Key Characteristics:
- **Entity Component System (ECS)** architecture for game logic
- **Harvard Structural Architecture** for data organization
- **Schema-based storage** for type-safe data modeling
- **Multi-blockchain support** (Sui, Aptos, Rooch, Initia)

## Technology Stack

### Core Languages & Frameworks
- **Move Language**: Smart contract development (primary blockchain language)
- **Rust**: Backend indexing, data processing, and infrastructure tools
- **TypeScript/JavaScript**: CLI tools, client SDKs, development tooling
- **Node.js v22+**: Runtime environment for development tools

### Package Management
- **pnpm v9+**: Primary package manager for JavaScript/TypeScript packages
- **Cargo**: Rust package management and workspace coordination
- **Turbo**: Monorepo build orchestration and caching

### Build System & Tooling
- **Turbo.json**: Build pipeline configuration with optimized caching
- **tsup**: TypeScript bundling for packages
- **Changesets**: Version management and release automation
- **Prettier**: Code formatting with Move and Solidity plugins
- **ESLint**: Linting for TypeScript/JavaScript code

### Testing & Quality Assurance
- **Vitest**: Unit testing framework
- **Husky**: Git hooks for pre-commit validation
- **lint-staged**: Staged file validation

## Repository Structure

### Root-Level Organization
```
dubhe/
├── packages/           # TypeScript/JavaScript packages (19 packages)
├── crates/            # Rust workspace (8 crates)
├── mintlify-docs/     # Documentation site (Mintlify-based)
├── framework/         # Core Move framework
├── examples/          # Example applications
├── templates/         # Project templates
├── e2e/              # End-to-end testing
└── assets/           # Static assets
```

### Key Packages Structure

#### Blockchain Ecosystem Support
- **Sui Ecosystem**: `sui-cli`, `sui-client`, `sui-common`
- **Aptos Ecosystem**: `aptos-cli`, `aptos-client`, `aptos-common`
- **Rooch Ecosystem**: `rooch-cli`, `rooch-client`
- **Initia Ecosystem**: `initia-cli`, `initia-client`

#### Core Infrastructure
- **create-dubhe**: Project scaffolding tool
- **ecs**: Entity Component System implementation
- **graphql-client/server**: GraphQL API layer
- **grpc-client**: gRPC communication layer
- **benchmark**: Performance measurement tools

#### Rust Crates
- **dubhe-indexer**: Main blockchain indexer
- **dubhe-common**: Shared utilities
- **dubhe-indexer-grpc/graphql**: API service layers
- **dubhe-indexer-*-client**: Client libraries

## Documentation System

### Mintlify-Based Documentation
- **Location**: `/mintlify-docs/`
- **Format**: MDX files with YAML frontmatter
- **Configuration**: `docs.json` for navigation and theming
- **Content Areas**:
  - Getting Started guides
  - Tutorials and contract development
  - API references for all major components
  - Technical whitepapers
  - AI tool integrations

### Documentation Standards
- Second-person voice ("you")
- Prerequisites listed at start of procedural content
- Code examples with proper language tags
- Relative paths for internal links
- Alt text for images

## Development Workflow & Standards

### Code Organization Patterns
- **Workspace-based**: Both pnpm workspaces and Cargo workspaces
- **Feature-based packaging**: Separate packages per blockchain ecosystem
- **Layered architecture**: CLI -> Client -> Common pattern
- **Template-driven**: Multiple project templates for different use cases

### Git Workflow
- **Main branch**: `main`
- **Current feature branch**: `feature/mintlify`
- **Pre-commit hooks**: Enforced via Husky
- **Changesets**: Automated version management

### Code Style & Conventions
- **Prettier configuration**: 2-space tabs, single quotes, 100-char line width
- **TypeScript**: Strict type checking enabled
- **Move formatting**: Custom prettier plugin
- **Consistent naming**: kebab-case for packages, PascalCase for components

## CI/CD Pipeline

### GitHub Actions Workflows
- **PR Checks** (`pr-checks.yml`):
  - Rust build validation (dubhe-indexer)
  - Node.js package building
  - Timeout limits: 30min Rust, 20min Node.js
  - Protocol Buffer compiler setup

- **Unified Release** (`unified-release.yml`):
  - Automated release management
  - Multi-package coordination

- **Changesets** (`changeset.yml`):
  - Version bump automation

### Build Targets
- **Rust**: Release builds with optimizations
- **Node.js**: ES modules with tsup bundling
- **Protocol Buffers**: gRPC service definitions

## Integration Points & APIs

### External Dependencies
- **Sui Framework**: Git dependency on MystenLabs/sui (mainnet-v1.48.2)
- **Move Core Types**: Blockchain interaction types
- **Database**: PostgreSQL with Diesel ORM, SQLite for development
- **GraphQL**: Real-time subscriptions and queries
- **gRPC**: High-performance service communication

### Client Integration
- **TypeScript SDK**: Type-safe client libraries
- **Real-time sync**: WebSocket-based state synchronization
- **Multi-blockchain**: Unified API across different Move chains

## Development Constraints & Considerations

### Technical Constraints
- **Node.js Version**: Minimum v22.0.0 required
- **pnpm Version**: Minimum v9.0.0 required
- **Rust Toolchain**: Stable channel with specific Sui version pinning

### Blockchain-Specific Considerations
- **Move Language**: Version constraints tied to upstream blockchain releases
- **Gas Optimization**: Performance-critical for on-chain execution
- **State Management**: ECS pattern for scalable game state
- **Upgradeability**: Logic upgrades and data migration support

### Development Environment
- **Monorepo Complexity**: Multiple language toolchains coordination
- **Build Dependencies**: Protocol Buffer compiler, Rust toolchain
- **Testing Requirements**: Multi-chain testing scenarios
- **Documentation Sync**: Mintlify docs must stay updated with code changes

## Special Features & Innovation

### Dubhe-Specific Patterns
- **Schema-Driven Development**: Configuration-based Move contract generation
- **ECS Architecture**: Entity-Component-System for game development
- **Real-time On-chain**: Live state synchronization with blockchain
- **Multi-chain Abstraction**: Unified development experience across Move chains

### Developer Experience
- **Hot Reloading**: Development mode with file watching
- **Type Generation**: Automatic TypeScript types from Move schemas
- **Template System**: Multiple starting templates for different use cases
- **Comprehensive CLI**: Full-featured command-line interface for all operations

This repository represents a sophisticated blockchain development framework with strong emphasis on developer experience, multi-chain support, and innovative approaches to fully on-chain application development.