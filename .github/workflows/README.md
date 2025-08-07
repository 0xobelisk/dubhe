# 🚀 Dubhe CI/CD Workflow Documentation

## 📋 Workflow Overview

### 🔄 Unified Release Process (`unified-release.yml`)
**Primary release workflow** - Automatically triggered when version tags are pushed

**Features:**
- ✅ Unified update of all project versions (Rust + Node.js)
- ✅ Build cross-platform Rust binaries
- ✅ Build and publish NPM packages
- ✅ Create GitHub Release
- ✅ Automatic binary testing

**Trigger method:**
```bash
git tag v1.2.3
git push origin v1.2.3
```

### 📦 Supported Release Content

#### NPM Packages
- `@0xobelisk/sui-common`
- `@0xobelisk/sui-client` 
- `@0xobelisk/sui-cli`
- `@0xobelisk/graphql-client`
- `@0xobelisk/ecs`
- `@0xobelisk/graphql-server`
- `@0xobelisk/create-dubhe`

#### Rust Binaries
- `dubhe-indexer` (Linux x64/ARM64, macOS x64/ARM64, Windows x64)


---

## 🔧 Release Process Details

### Step 1: Version Update
1. Get Git tag version number
2. Update `crates/dubhe-indexer/Cargo.toml`
3. Update all NPM package `package.json` files
4. Commit all changes to main branch

### Step 2: Parallel Building
1. **Rust Build**: Cross-platform compile binary files
2. **NPM Build**: Build and publish all NPM packages

### Step 3: Release
1. Create GitHub Release
2. Upload binary files
3. Generate detailed release notes

### Step 4: Testing
1. Download built binary files
2. Test execution on various platforms

---

## 🎯 Advantage Comparison


### ✅ Current Solution
```
Tag Push → unified-release.yml → Sequential execution of all release steps
```

**Core Advantages:**
- 🚫 **Eliminate Conflicts**: Single workflow avoids concurrent pushes
- 🔄 **Sequential Execution**: Version update → Build → Release → Test
- 📦 **Unified Management**: All release content managed in one place
- 🧪 **Automatic Testing**: Auto-test binaries after building

---

## 📝 Usage Guide

### Release New Version
```bash
# 1. Ensure code is merged to main branch
git checkout main
git pull origin main

# 2. Create and push version tag
git tag v1.2.3
git push origin v1.2.3

# 3. Monitor release progress in GitHub Actions
# https://github.com/0xobelisk/dubhe/actions
```

### Check Release Status
- Visit [Actions page](../../actions)
- Look for "Unified Release Process" workflow
- Monitor execution status of each step

### After Release Completion
- 📦 NPM packages will be published to npmjs.com
- 📁 Binary files will be uploaded to GitHub Releases
- 📋 Detailed release notes will be auto-generated

---

## 🔧 Maintenance Instructions

### Adding New NPM Packages
Add to the following locations in `unified-release.yml`:
1. Version update in `update-versions` step
2. Build and publish in `build-and-publish-npm` step

### Adding New Platform Support
Add new platform configuration in `build-rust` `matrix`

### Emergency Handling
For urgent release of specific components:
1. Manually trigger disabled workflows
2. Or temporarily enable automatic triggering of corresponding workflows 