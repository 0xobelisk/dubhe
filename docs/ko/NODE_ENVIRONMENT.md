# Node Environment Management

## Overview

This document describes the Node.js environment management strategy for the Dubhe project to ensure consistency across all packages and environments.

## Node Version

- **Current Version**: 18.19.0
- **Minimum Version**: >=18.19.0
- **Package Manager**: pnpm >=8.0.0

## Version Management Files

### .nvmrc
Specifies the Node.js version for nvm (Node Version Manager):
```
18.19.0
```

### .node-version
Specifies the Node.js version for other version managers (nodenv, asdf, etc.):
```
18.19.0
```

## Package 설정

### Root package.json
```json
{
  "engines": {
    "node": ">=18.19.0",
    "pnpm": ">=8.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.19.0"
  }
}
```

### Individual Package 설정
Each package should have consistent engine requirements:
```json
{
  "engines": {
    "node": ">=18.19.0"
  },
  "devDependencies": {
    "@types/node": "^18.19.0"
  }
}
```

## Scripts

### Check Environment Consistency
```bash
pnpm run check-node-env
```
This TypeScript script checks all package.json files for Node environment consistency.

### Unify Environment
```bash
pnpm run unify-node-env
```
This TypeScript script updates all package.json files to use the unified Node environment configuration.

## CI/CD Integration

The project includes GitHub Actions workflows that automatically check Node environment consistency on:
- Push to main/develop branches
- Pull requests to main/develop branches

## 개발 Setup

### Using nvm
```bash
# Install the correct Node version
nvm install
nvm use

# Install dependencies
pnpm install
```

### Using other version managers
```bash
# nodenv
nodenv install 18.19.0
nodenv local 18.19.0

# asdf
asdf install nodejs 18.19.0
asdf local nodejs 18.19.0
```

## 문제 해결

### Version Mismatch
If you encounter version mismatch errors:

1. Check your current Node version:
   ```bash
   node --version
   ```

2. Switch to the correct version:
   ```bash
   nvm use
   ```

3. Clear cache and reinstall:
   ```bash
   pnpm store prune
   pnpm install
   ```

### Inconsistent Dependencies
If you find inconsistent @types/node versions:

1. Run the unification script:
   ```bash
   pnpm run unify-node-env
   ```

2. Reinstall dependencies:
   ```bash
   pnpm install
   ```

## Best Practices

1. **Always use the specified Node version** for development
2. **Run consistency checks** before committing changes
3. **Update version files** when upgrading Node.js
4. **Test with the minimum version** to ensure compatibility
5. **Use the provided scripts** for environment management

## Migration Guide

When upgrading Node.js versions:

1. Update `.nvmrc` and `.node-version` files
2. Update the unified configuration in scripts
3. Run `pnpm run unify-node-env` to update all packages
4. Test thoroughly with the new version
5. Update documentation if needed

## 지원

For issues related to Node environment management:
- Check the troubleshooting section above
- Review the GitHub Actions logs for CI/CD issues
- Open an issue with detailed error information 