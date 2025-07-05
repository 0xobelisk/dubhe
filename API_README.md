# Dubhe API Documentation

Welcome to the Dubhe API documentation. This documentation provides comprehensive information about
all the APIs, components, and utilities available in the Dubhe ecosystem.

## 📚 Overview

Dubhe is an open-source Move application and game engine framework that provides:

- **Multi-chain Support**: Sui, Aptos, Rooch, and Initia
- **Schema-based Storage**: Automated storage contract generation
- **Development Tools**: CLI, SDK, and GraphQL server
- **UI Components**: Reusable React components
- **ECS System**: Entity Component System for game development

## 🏗️ Architecture

### Core Packages

- **@0xobelisk/sui-client**: Sui blockchain client
- **@0xobelisk/sui-common**: Common utilities for Sui
- **@0xobelisk/sui-cli**: Command-line interface
- **@0xobelisk/graphql-client**: GraphQL client library
- **@0xobelisk/ecs**: Entity Component System
- **@0xobelisk/graphql-server**: GraphQL server implementation

### UI Components

- **@workspace/ui**: Reusable React components
- **Components**: Button, Input, Card, Badge, Select, Table, Modal

## 🚀 Quick Start

### Installation

```bash
# Install Dubhe CLI
npm install -g @0xobelisk/sui-cli

# Create a new project
dubhe create my-project

# Install client library
npm install @0xobelisk/sui-client
```

### Basic Usage

```typescript
import { Dubhe } from '@0xobelisk/sui-client';

// Initialize client
const dubhe = new Dubhe({
  network: 'testnet',
  rpcUrl: 'https://fullnode.testnet.sui.io',
  graphqlUrl: 'https://sui-testnet.mystenlabs.com/graphql',
});

// Use client methods
const network = dubhe.getNetwork();
const rpcUrl = dubhe.getRpcUrl();
```

## 📖 Documentation Sections

### Core APIs

- [Dubhe Client](./modules/sui_client.html) - Main client library
- [Configuration](./modules/sui_common.html) - Configuration utilities
- [Types](./modules/types.html) - TypeScript type definitions

### UI Components

- [Button](./modules/ui_components_button.html) - Button component
- [Input](./modules/ui_components_input.html) - Input component
- [Card](./modules/ui_components_card.html) - Card component
- [Badge](./modules/ui_components_badge.html) - Badge component
- [Select](./modules/ui_components_select.html) - Select component
- [Table](./modules/ui_components_table.html) - Table component
- [Modal](./modules/ui_components_modal.html) - Modal component

### Utilities

- [Utils](./modules/ui_lib_utils.html) - Utility functions
- [ECS](./modules/ecs.html) - Entity Component System
- [GraphQL Client](./modules/graphql_client.html) - GraphQL utilities

## 🔧 Development

### Building Documentation

```bash
# Generate API documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/0xobelisk/dubhe/issues)
- **Discord**: [Join our community](https://discord.gg/dubhe)
- **Documentation**: [Full documentation](https://docs.dubhe.dev)

---

_Generated on: {{DATE}}_
