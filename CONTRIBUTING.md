# 🤝 Contributing to Dubhe

Thank you for your interest in contributing to Dubhe! This document provides guidelines and
information for contributors.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Code of Conduct](#code-of-conduct)

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.19.0 or higher
- **pnpm**: 9.12.3 or higher
- **Git**: Latest version
- **Docker**: For local development (optional)

### Quick Start

1. **Fork the repository**

   ```bash
   git clone https://github.com/your-username/dubhe.git
   cd dubhe
   ```

2. **Setup development environment**

   ```bash
   pnpm dev-setup
   ```

3. **Start development**
   ```bash
   pnpm dev
   ```

## 🛠️ Development Setup

### Environment Configuration

1. **Copy environment file**

   ```bash
   cp env.example .env.local
   ```

2. **Configure environment variables** Edit `.env.local` with your local configuration

3. **Install dependencies**
   ```bash
   pnpm install
   ```

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm dev:paper        # Start documentation site
pnpm dev:site         # Start web application

# Building
pnpm build            # Build all packages
pnpm build:types      # Build TypeScript types
pnpm build:paper      # Build documentation

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run end-to-end tests

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm type-check       # Run TypeScript checks
pnpm format           # Format code with Prettier

# Internationalization
pnpm i18n:sync        # Sync translations
pnpm i18n:validate    # Validate translations
pnpm i18n:health-check # Check i18n completeness

# Performance
pnpm performance:test # Run performance tests
pnpm performance:report # Generate performance report

# Utilities
pnpm cleanup          # Clean up build artifacts
pnpm health-check     # Run system health check
```

## 📝 Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Prefer `const` over `let` and `var`
- Use explicit return types for public functions
- Avoid `any` type - use proper typing
- Use interfaces for object shapes
- Prefer union types over enums

### React Guidelines

- Use functional components with hooks
- Prefer composition over inheritance
- Use TypeScript for all components
- Follow accessibility guidelines (ARIA)
- Use proper prop validation

### File Naming

- **Components**: PascalCase (e.g., `Button.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`)

### Import Organization

```typescript
// 1. React imports
import React from 'react';

// 2. Third-party libraries
import { useState } from 'react';
import { Button } from '@radix-ui/react-button';

// 3. Internal imports (absolute paths)
import { User } from '@/types';
import { formatDate } from '@/utils';

// 4. Relative imports
import './styles.css';
```

## 🧪 Testing

### Testing Guidelines

- Write tests for all new features
- Maintain 90%+ test coverage
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test Button.test.tsx

# Run E2E tests
pnpm test:e2e
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure tests pass**

   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

2. **Update documentation**

   - Update README if needed
   - Add JSDoc comments for new functions
   - Update API documentation

3. **Check internationalization**
   ```bash
   pnpm i18n:health-check
   ```

### Pull Request Guidelines

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Follow code style guidelines
   - Write tests for new features
   - Update documentation

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use the PR template
   - Describe your changes clearly
   - Link related issues

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**

```
feat(ui): add new Button component
fix(api): resolve authentication issue
docs(readme): update installation instructions
```

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment information**

   - OS and version
   - Node.js version
   - Browser version (if applicable)

2. **Steps to reproduce**

   - Clear, step-by-step instructions
   - Expected vs actual behavior

3. **Additional context**
   - Screenshots or videos
   - Console errors
   - Network requests

### Feature Requests

When requesting features, please include:

1. **Problem description**

   - What problem does this solve?
   - Current workarounds

2. **Proposed solution**

   - How should it work?
   - Mockups or examples

3. **Use cases**
   - Who would benefit?
   - How often would it be used?

## 📚 Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Keep documentation up to date
- Use proper markdown formatting

### Documentation Structure

```
docs/
├── README.md              # Main documentation
├── getting-started/       # Getting started guides
├── api/                   # API documentation
├── architecture/          # Architecture documentation
├── contributing/          # Contributing guides
└── i18n/                 # Internationalization docs
```

## 🌍 Internationalization

### Translation Guidelines

- Use translation keys for all user-facing text
- Keep translations concise and clear
- Consider cultural context
- Test with different languages

### Adding New Translations

1. **Add translation keys**

   ```typescript
   // en.json
   {
     "new.feature": "New Feature"
   }
   ```

2. **Sync translations**

   ```bash
   pnpm i18n:sync
   ```

3. **Validate translations**
   ```bash
   pnpm i18n:validate
   ```

## 🔒 Security

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Follow security best practices

### Reporting Security Issues

For security issues, please email security@dubhe.dev instead of creating a public issue.

## 📊 Performance

### Performance Guidelines

- Optimize bundle size
- Use lazy loading where appropriate
- Minimize API calls
- Cache frequently accessed data

### Performance Testing

```bash
# Run performance tests
pnpm performance:test

# Generate performance report
pnpm performance:report

# Monitor performance
pnpm performance:monitor
```

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community

### Enforcement

Violations of the Code of Conduct may result in:

- Warning
- Temporary ban
- Permanent ban

## 📞 Getting Help

### Resources

- **Documentation**: [docs.dubhe.dev](https://docs.dubhe.dev)
- **Issues**: [GitHub Issues](https://github.com/0xobelisk/dubhe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/0xobelisk/dubhe/discussions)
- **Discord**: [Join our Discord](https://discord.gg/dubhe)

### Questions

If you have questions about contributing:

1. Check the documentation first
2. Search existing issues and discussions
3. Create a new discussion
4. Join our Discord community

## 🙏 Acknowledgments

Thank you to all contributors who have helped make Dubhe better! Your contributions are greatly
appreciated.

---

**Happy contributing! 🎉**
