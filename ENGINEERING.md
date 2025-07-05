# Dubhe Engineering Configuration Guide

This document introduces the engineering configuration of the Dubhe project, including build systems, code quality, testing architecture, and more.

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Initialize Git Hooks

```bash
pnpm prepare
```

## 📦 Build System (Turbo)

Dubhe uses [Turbo](https://turbo.build/) as the build system, providing fast incremental builds and caching.

### Main Commands

```bash
# Build all packages
pnpm build

# Build type definitions
pnpm build:types

# Development mode
pnpm dev

# Clean build artifacts
pnpm clean
```

### Turbo Configuration

- **Caching Strategy**: Intelligent caching of build artifacts to avoid repeated builds
- **Dependency Management**: Automatic handling of dependencies between packages
- **Parallel Building**: Fully utilize multi-core CPU to accelerate builds
- **Environment Isolation**: Different build configurations for different environments

## 🔧 Code Quality (ESLint + Prettier)

### ESLint Configuration

Unified code style configuration supporting TypeScript and React.

```bash
# Check code style
pnpm lint

# Auto-fix code style issues
pnpm lint:fix
```

### Prettier Configuration

Unified code formatting configuration.

```bash
# Format code
pnpm format

# Check code format
pnpm format:check
```

### Main Rules

- **TypeScript**: Strict type checking
- **Code Complexity**: Limit function complexity and nesting depth
- **Best Practices**: Avoid common errors and anti-patterns
- **Consistency**: Unified code style

## 🧪 Testing Architecture (Jest)

### Test Types

1. **Unit Tests**: Test individual functions or components
2. **Integration Tests**: Test interactions between modules
3. **E2E Tests**: Test complete user workflows

### Test Commands

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Test Configuration

- **Jest**: Unified testing framework
- **Testing Library**: React component testing
- **Coverage**: 70% code coverage requirement
- **Mock System**: Comprehensive mock utilities

### Test Example

```typescript
import { describe, it, expect } from '@jest/globals';
import { Dubhe } from '@0xobelisk/sui-client';

describe('Dubhe', () => {
  it('should create instance with default config', () => {
    const dubhe = new Dubhe();
    expect(dubhe).toBeInstanceOf(Dubhe);
  });
});
```

## 🔒 Git Hooks (Husky + lint-staged)

### Pre-commit Checks

Automatically run before each commit:

1. **Code Style Check** (ESLint)
2. **Code Formatting** (Prettier)
3. **Type Checking** (TypeScript)
4. **Test Execution** (Jest)

### Commit Message Standards

Using [Conventional Commits](https://www.conventionalcommits.org/) standards:

```bash
# Use interactive commit
pnpm commit

# Example commit messages
feat: add new transaction method
fix: resolve balance calculation issue
docs: update API documentation
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Code style adjustments
- `refactor`: Code refactoring
- `test`: Test-related changes
- `chore`: Build process or tooling changes

## 📋 Workflow

### Development Process

1. **Create Branch**: `git checkout -b feature/new-feature`
2. **Develop Code**: Write features and tests
3. **Local Testing**: `pnpm validate`
4. **Commit Code**: `pnpm commit`
5. **Push Branch**: `git push origin feature/new-feature`
6. **Create PR**: Create Pull Request on GitHub

### Validation Commands

```bash
# Run all validations
pnpm validate

# Includes the following steps:
# - pnpm lint (code style check)
# - pnpm type-check (type checking)
# - pnpm test (test execution)
```

## 🛠️ Development Tools

### VSCode Configuration

Recommended extensions:

- **ESLint**: Code style checking
- **Prettier**: Code formatting
- **TypeScript**: TypeScript support
- **Jest**: Test runner
- **GitLens**: Git integration

### Debug Configuration

Project includes VSCode debug configuration supporting:

- **Node.js Debugging**: Debug server-side code
- **Jest Debugging**: Debug test code
- **E2E Debugging**: Debug end-to-end tests

## 📊 Monitoring and Reporting

### Build Reports

Turbo provides detailed build reports:

```bash
# View build analysis
pnpm build --dry-run
```

### Test Reports

Jest generates detailed test reports:

- **Coverage Reports**: HTML format coverage reports
- **Test Results**: Detailed test execution results
- **Performance Analysis**: Test execution time analysis

### Code Quality Reports

ESLint and Prettier provide code quality reports:

```bash
# Generate code quality report
pnpm lint --format=html > lint-report.html
```

## 🔧 Custom Configuration

### Package-level Configuration

Each package can have its own configuration:

```json
// packages/my-package/package.json
{
  "scripts": {
    "build": "tsup",
    "test": "jest",
    "lint": "eslint src"
  }
}
```

### Environment Variables

Support different environment configurations:

```bash
# Development environment
NODE_ENV=development pnpm dev

# Test environment
NODE_ENV=test pnpm test

# Production environment
NODE_ENV=production pnpm build
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clean cache
   pnpm clean
   # Reinstall dependencies
   pnpm install
   ```

2. **Test Failures**
   ```bash
   # Check test environment
   pnpm test --verbose
   ```

3. **Code Style Issues**
   ```bash
   # Auto-fix
   pnpm lint:fix
   pnpm format
   ```

### Performance Optimization

1. **Build Performance**
   - Use Turbo caching
   - Parallel building
   - Incremental builds

2. **Test Performance**
   - Parallel testing
   - Smart caching
   - Test isolation

## 📚 Related Documentation

- [Turbo Documentation](https://turbo.build/repo/docs)
- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Jest Documentation](https://jestjs.io/docs/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🤝 Contributing Guidelines

1. Follow code standards
2. Write test cases
3. Use standardized commit messages
4. Ensure all checks pass

---

For questions, please check [GitHub Issues](https://github.com/0xobelisk/dubhe/issues) or contact the maintenance team. 