# クイックスタート Guide

Welcome to Dubhe! This guide will help you get started with building autonomous worlds in just a few minutes.

## 🚀 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18.19.0 or later)
- **pnpm** (v8.0.0 or later)
- **Git**

### Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18.19.0
nvm use 18.19.0

# Or download from nodejs.org
# https://nodejs.org/en/download/
```

### Install pnpm

```bash
# Using npm
npm install -g pnpm

# Using curl
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## 📦 インストール

### 1. Clone the Repository

```bash
git clone https://github.com/0xobelisk/dubhe.git
cd dubhe
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build the Project

```bash
pnpm build
```

## 🎯 Your First Dubhe Project

### 1. Create a New Project

```bash
# Using the CLI
pnpm dubhe create my-first-world

# Or manually
mkdir my-first-world
cd my-first-world
```

### 2. Initialize the Project

```bash
# Initialize with Sui template
pnpm dubhe init --template sui

# Or with Aptos template
pnpm dubhe init --template aptos
```

### 3. Explore the Project Structure

```
my-first-world/
├── contracts/          # Move smart contracts
├── src/               # Application source code
├── dubhe.config.ts    # Dubhe configuration
├── package.json       # Dependencies
└── README.md         # Project documentation
```

### 4. Build Your Contracts

```bash
# Build Move contracts
pnpm dubhe build

# Or build specific package
pnpm dubhe build --package contracts
```

### 5. Deploy to Testnet

```bash
# Deploy to Sui testnet
pnpm dubhe deploy --network testnet

# Or deploy to Aptos testnet
pnpm dubhe deploy --network testnet --chain aptos
```

## 🎮 Create Your First Game

### 1. Set Up the Game Engine

```typescript
// src/game.ts
import { Dubhe } from '@0xobelisk/sui-client';
import { GameEngine } from '@0xobelisk/ecs';

const dubhe = new Dubhe({
  networkType: 'testnet',
  fullnodeUrls: ['https://testnet.sui.io'],
});

const game = new GameEngine();
```

### 2. Create Game Entities

```typescript
// Create a player entity
const player = game.createEntity();
game.addComponent(player, 'position', { x: 0, y: 0 });
game.addComponent(player, 'health', { value: 100 });
game.addComponent(player, 'inventory', { items: [] });
```

### 3. Add Game Systems

```typescript
// Movement system
game.addSystem('movement', (entities) => {
  entities.forEach(entity => {
    const position = game.getComponent(entity, 'position');
    const velocity = game.getComponent(entity, 'velocity');
    
    if (position && velocity) {
      position.x += velocity.x;
      position.y += velocity.y;
    }
  });
});
```

### 4. Run the Game

```bash
# Start the development server
pnpm dev

# Or run the game directly
pnpm start
```

## 🔗 Connect to Blockchain

### 1. Initialize Dubhe Client

```typescript
import { Dubhe } from '@0xobelisk/sui-client';

const dubhe = new Dubhe({
  networkType: 'testnet',
  fullnodeUrls: ['https://testnet.sui.io'],
  privateKey: process.env.PRIVATE_KEY,
});
```

### 2. Query Blockchain Data

```typescript
// Get account balance
const balance = await dubhe.getBalance(address);

// Get object data
const object = await dubhe.getObject(objectId);

// Query entities
const entities = await dubhe.queryEntities({
  component: 'player',
  filter: { health: { $gt: 0 } }
});
```

### 3. Execute Transactions

```typescript
// Create a transaction
const tx = dubhe.suiInteractor.currentClient.transferObject({
  target: recipientAddress,
  objectId: objectId,
});

// Execute the transaction
const result = await dubhe.executeTransaction(tx);
```

## 📊 Monitor Your Application

### 1. Set Up パフォーマンス モニタリング

```typescript
import { PerformanceMonitor } from '@0xobelisk/monitoring';

const monitor = new PerformanceMonitor({
  enabled: true,
  enableMemoryTracking: true,
  enableCPUTracking: true,
});

// Monitor function performance
await monitor.timeFunction('database_query', async () => {
  return await queryDatabase();
});
```

### 2. View Metrics

```bash
# Start monitoring dashboard
pnpm monitoring:start

# View performance reports
pnpm benchmark:run
```

## 🌍 国際化

### 1. Set Up i18n

```typescript
import { createI18n } from '@0xobelisk/i18n';

const i18n = createI18n({
  defaultLocale: 'en',
  locales: ['en', 'zh', 'ja'],
});

// Use translations
const message = i18n.t('common.welcome', { name: 'User' });
```

### 2. Add Translations

```typescript
i18n.addTranslation('zh', {
  common: {
    welcome: '欢迎使用 Dubhe',
    loading: '加载中...',
  }
});
```

## 🧪 テスト Your Application

### 1. Run Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- src/game.test.ts

# Run tests with coverage
pnpm test:coverage
```

### 2. Run E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run specific E2E test
pnpm test:e2e -- --grep "login flow"
```

### 3. Run パフォーマンス Tests

```bash
# Run benchmarks
pnpm benchmark:run

# Run specific benchmark suite
pnpm benchmark:run --suite client
```

## 🚀 Deploy to Production

### 1. Build for Production

```bash
# Build the application
pnpm build:prod

# Build Docker image
docker build -t dubhe/my-world .
```

### 2. Deploy with Docker

```bash
# Run with Docker Compose
docker-compose up -d

# Or deploy to Kubernetes
kubectl apply -f k8s/
```

### 3. Monitor Production

```bash
# Check application health
pnpm health:check

# View logs
pnpm logs

# Monitor performance
pnpm monitoring:dashboard
```

## 📚 Next Steps

Now that you've completed the quick start, here are some next steps:

1. **Read the ドキュメント**: Explore the [full documentation](../README.md)
2. **Try サンプル**: Check out the [examples](../examples/) directory
3. **Join コミュニティ**: Connect with other developers on [Discord](https://discord.gg/dubhe)
4. **Build Something**: Create your own autonomous world!

## 🆘 Need Help?

If you run into any issues:

1. Check the [FAQ](../support/faq.md)
2. Search the [documentation](../README.md)
3. Ask on [Discord](https://discord.gg/dubhe)
4. Report bugs on [GitHub](https://github.com/0xobelisk/dubhe/issues)

---

**Congratulations!** You've successfully set up Dubhe and created your first autonomous world! 🎉 