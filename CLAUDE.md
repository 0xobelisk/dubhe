# Dubhe Project Guidelines for AI Assistant

## Language Preferences
- **User Communication**: Always respond and summarize in Chinese (中文)
- **Code and File Editing**: Always write in English
- **Comments in Code**: English only, unless specifically requested otherwise
- **Git Commits**: English with conventional commit format

## Project Overview
Dubhe is a sophisticated blockchain development framework for building fully on-chain applications using the Move programming language. It provides a complete ecosystem for developing, testing, and deploying decentralized applications across multiple blockchain networks.

### Supported Blockchains
- **Sui**: Primary target with full feature support
- **Aptos**: Complete integration with Aptos Move
- **Rooch**: Bitcoin Layer-2 with Move support
- **Initia**: Cross-chain interoperability focus

## Architecture Overview

### Project Structure
```
dubhe/
├── packages/          # TypeScript/JavaScript packages
│   ├── client/       # Client libraries for blockchain interaction
│   ├── cli/          # CLI tools for project management
│   ├── create-dubhe/ # Project scaffolding tool
│   └── protocol-type-parser/ # Type conversion utilities
├── crates/           # Rust backend services
│   ├── sui-explorer/ # Sui blockchain explorer
│   └── rooch-explorer/ # Rooch blockchain explorer
├── docs/             # Mintlify documentation (MDX format)
├── templates/        # Project templates for different chains
└── examples/         # Example applications
```

### Core Design Patterns
- **Entity Component System (ECS)**: Primary architectural pattern
- **Schema-Driven Development**: Define schemas first, generate code automatically
- **Event Sourcing**: All state changes through events
- **Modular Architecture**: Clear separation between chain-specific and common code

## Development Standards

### Move Smart Contract Development

#### File Organization
```move
module dubhe::component_name {
    // 1. Imports
    use std::vector;
    use sui::object;
    
    // 2. Constants
    const ERROR_INVALID_STATE: u64 = 1;
    
    // 3. Structs and Resources
    struct ComponentData has store, drop {
        // fields
    }
    
    // 4. Public entry functions
    public entry fun action_name(ctx: &mut TxContext) {
        // implementation
    }
    
    // 5. Public functions
    public fun helper_function(): u64 {
        // implementation
    }
    
    // 6. Private functions
    fun internal_logic() {
        // implementation
    }
}
```

#### Naming Conventions
- **Modules**: snake_case (e.g., `player_system`)
- **Structs**: PascalCase (e.g., `PlayerData`)
- **Functions**: snake_case (e.g., `create_player`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_PLAYERS`)
- **Events**: PascalCase with "Event" suffix (e.g., `PlayerCreatedEvent`)

#### Schema Definition
Always define schemas in `contracts/{chain}/obelisk.yaml`:
```yaml
schemas:
  player:
    data:
      - name: String
      - level: u64
      - experience: u64
    events:
      - created
      - level_up
```

#### Best Practices
1. Always use schema-driven development
2. Emit events for all state changes
3. Use proper error handling with descriptive error codes
4. Implement access control using capabilities
5. Write comprehensive unit tests
6. Document public functions with /// comments

### TypeScript/JavaScript Development

#### Code Style
```typescript
// Use functional programming patterns
import { pipe, map, filter } from 'fp-ts/function';

// Prefer const over let
const processData = (data: Data[]): ProcessedData[] => {
  return pipe(
    data,
    filter(isValid),
    map(transform)
  );
};

// Use type-safe error handling
import { Either, left, right } from 'fp-ts/Either';

const parseConfig = (raw: string): Either<Error, Config> => {
  try {
    return right(JSON.parse(raw));
  } catch (e) {
    return left(new Error(`Invalid config: ${e.message}`));
  }
};
```

#### Package Development
1. Each package must have:
   - Comprehensive TypeScript types
   - Unit tests with >80% coverage
   - README with usage examples
   - Proper error handling
   - ESLint and Prettier compliance

#### CLI Tool Guidelines
- Use commander.js for command parsing
- Provide helpful error messages
- Include progress indicators for long operations
- Support both interactive and non-interactive modes
- Validate inputs before processing

### Rust Development

#### Code Organization
```rust
// src/lib.rs or src/main.rs
mod config;
mod handlers;
mod models;
mod services;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // initialization
    Ok(())
}
```

#### Best Practices
1. Use `anyhow` for error handling in applications
2. Use `thiserror` for error types in libraries
3. Implement proper async/await patterns
4. Use `tracing` for logging
5. Follow Rust API guidelines
6. Write documentation tests

### Testing Requirements

#### Move Tests
```move
#[test_only]
module dubhe::test_module {
    use sui::test_scenario;
    
    #[test]
    fun test_basic_functionality() {
        let scenario = test_scenario::begin(@0x1);
        // test implementation
        test_scenario::end(scenario);
    }
}
```

#### TypeScript Tests
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Component', () => {
  beforeEach(() => {
    // setup
  });

  it('should handle basic case', () => {
    // test
    expect(result).toBe(expected);
  });
});
```

#### Test Coverage Requirements
- Move contracts: 100% for critical functions
- TypeScript packages: >80% overall
- Rust services: >70% overall

## Documentation Standards (Mintlify)

### MDX File Structure
```mdx
---
title: 'Page Title'
description: 'Concise page description'
icon: 'icon-name'
---

## Overview
Brief introduction to the topic.

## Prerequisites
- Requirement 1
- Requirement 2

## Main Content
<CodeGroup>
```typescript TypeScript
// code example
```

```move Move
// code example
```
</CodeGroup>

<Note>
Important information for users.
</Note>

<Warning>
Critical warnings or common pitfalls.
</Warning>
```

### Documentation Requirements
1. Every public API must be documented
2. Include code examples for all features
3. Provide both basic and advanced use cases
4. Keep documentation in sync with code
5. Use semantic versioning in docs
6. Test all code examples before publishing

### Navigation Structure (docs.json)
```json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "installation", "quickstart"]
    },
    {
      "group": "Core Concepts",
      "pages": ["ecs-architecture", "schema-driven", "events"]
    }
  ]
}
```

## Git Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Emergency fixes
- `docs/*`: Documentation updates

### Commit Convention
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

Example:
```
feat(sui-client): add batch transaction support

- Implement batch transaction builder
- Add retry logic for failed transactions
- Update documentation

Closes #123
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes following coding standards
3. Run tests and linting
4. Create PR with template
5. Request review from maintainers
6. Address review feedback
7. Squash and merge when approved

### Pre-commit Hooks
The project uses Husky for pre-commit hooks:
- Linting (ESLint, rustfmt)
- Type checking (TypeScript)
- Test execution
- Commit message validation

**NEVER use --no-verify to skip hooks**

## Security Guidelines

### Smart Contract Security
1. **Input Validation**: Always validate user inputs
2. **Access Control**: Use capability-based security
3. **Reentrancy Protection**: Avoid external calls in critical sections
4. **Integer Overflow**: Use safe math operations
5. **Event Emission**: Log all important state changes

### Key Management
- Never commit private keys or mnemonics
- Use environment variables for sensitive data
- Implement proper key rotation strategies
- Use hardware wallets for production

### Code Review Requirements
- All code must be reviewed before merge
- Security-critical changes need 2+ reviewers
- Run security scanning tools
- Check for common vulnerabilities

## Multi-chain Development

### Chain-Specific Considerations

#### Sui
- Use programmable transactions
- Leverage object-centric model
- Implement proper object ownership
- Use Sui-specific types (UID, TxContext)

#### Aptos
- Follow Aptos resource model
- Use proper account abstraction
- Implement table storage patterns
- Handle gas optimization

#### Rooch
- Consider Bitcoin security model
- Implement proper state channels
- Use Rooch-specific features
- Handle cross-chain messaging

#### Initia
- Focus on interoperability
- Implement IBC compatibility
- Use cross-chain primitives
- Handle multi-chain state

### Deployment Process

#### Local Development
```bash
# 1. Start local network
pnpm run dev:node

# 2. Deploy contracts
dubhe deploy --network local

# 3. Run tests
pnpm test
```

#### Testnet Deployment
```bash
# 1. Configure network
dubhe config set --network testnet

# 2. Deploy with verification
dubhe deploy --network testnet --verify

# 3. Run integration tests
pnpm test:integration
```

#### Production Deployment
1. Create deployment plan
2. Review security audit
3. Test on testnet
4. Deploy with multi-sig
5. Monitor deployment
6. Verify on explorer

## CLI Usage Guide

### Project Creation
```bash
# Interactive mode
create-dubhe

# With options
create-dubhe my-project --chain sui --template game
```

### Schema Management
```bash
# Generate code from schema
dubhe obelisk generate

# Validate schema
dubhe obelisk validate

# Migrate schema changes
dubhe obelisk migrate
```

### Development Commands
```bash
# Start development environment
dubhe dev

# Run tests
dubhe test

# Build for production
dubhe build

# Deploy contracts
dubhe deploy
```

## Performance Optimization

### Smart Contract Optimization
1. Minimize storage operations
2. Batch transactions when possible
3. Use proper data structures
4. Implement lazy loading
5. Optimize gas consumption

### Frontend Optimization
1. Implement proper caching strategies
2. Use WebSocket for real-time updates
3. Batch RPC calls
4. Implement pagination
5. Use virtual scrolling for large lists

### Indexer Optimization
1. Design efficient database schemas
2. Implement proper indexing
3. Use connection pooling
4. Batch database operations
5. Implement caching layers

## Troubleshooting Guide

### Common Issues

#### Move Compilation Errors
- Check schema definition
- Verify import statements
- Ensure proper type annotations
- Check for version compatibility

#### TypeScript Build Errors
- Run `pnpm install`
- Clear build cache
- Check tsconfig.json
- Verify import paths

#### Deployment Failures
- Check network configuration
- Verify account balance
- Review gas settings
- Check contract size limits

### Debug Strategies
1. Use comprehensive logging
2. Implement proper error messages
3. Use debugging tools (move-analyzer, Chrome DevTools)
4. Write reproduction tests
5. Check documentation and examples

## Best Practices Summary

### Do's
- ✅ Follow schema-driven development
- ✅ Write comprehensive tests
- ✅ Document all public APIs
- ✅ Use type-safe patterns
- ✅ Implement proper error handling
- ✅ Follow naming conventions
- ✅ Commit frequently with clear messages
- ✅ Review code before merging
- ✅ Keep dependencies updated
- ✅ Monitor performance metrics

### Don'ts
- ❌ Skip pre-commit hooks
- ❌ Commit sensitive data
- ❌ Ignore linting errors
- ❌ Deploy without testing
- ❌ Use deprecated APIs
- ❌ Ignore security warnings
- ❌ Mix chain-specific code
- ❌ Skip documentation
- ❌ Use synchronous operations in async context
- ❌ Ignore error handling

## Resource Links

### Official Documentation
- [Dubhe Docs](https://docs.dubhe.io)
- [Move Language](https://move-language.github.io/move/)
- [Sui Developer Portal](https://docs.sui.io)
- [Aptos Developer Network](https://aptos.dev)

### Development Tools
- [Move Analyzer](https://marketplace.visualstudio.com/items?itemName=move.move-analyzer)
- [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet)
- [Aptos CLI](https://aptos.dev/cli-tools/aptos-cli-tool/)
- [Dubhe Explorer](https://explorer.dubhe.io)

### Community
- GitHub: https://github.com/dubhe-framework
- Discord: Community support
- Twitter: Updates and announcements

## Version History
- v1.0.0: Initial framework release
- v1.1.0: Multi-chain support
- v1.2.0: Schema-driven development
- v1.3.0: Enhanced CLI tools
- Current: Continuous improvements

---
**Remember**: 
- Always respond to users in Chinese (中文)
- Write code and edit files in English
- Follow these guidelines strictly for consistent, high-quality development