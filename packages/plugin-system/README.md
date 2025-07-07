# Dubhe Plugin System

Dubhe插件系统是一个可扩展的架构，允许开发者轻松集成第三方SDK、API和服务，如Walrus NFT平台。

## 🚀 快速开始

### 安装

```bash
pnpm add @0xobelisk/plugin-system
```

### 基本使用

```typescript
import { Dubhe } from '@0xobelisk/sui-client';
import { World } from '@0xobelisk/ecs';
import { PluginSystem, WalrusPlugin } from '@0xobelisk/plugin-system';

// 初始化Dubhe和ECS世界
const dubhe = new Dubhe();
const world = new World();

// 创建插件系统
const pluginSystem = new PluginSystem(dubhe, world, {
  pluginDirectory: './plugins',
  autoLoad: true,
  hotReload: true,
  logLevel: 'info',
});

// 启动插件系统
await pluginSystem.start();

// 创建并注册Walrus插件
const walrusPlugin = new WalrusPlugin({
  apiEndpoint: 'https://api.walrus.xyz',
  apiKey: 'your-api-key',
  network: 'mainnet',
  enableCache: true,
});

pluginSystem.registerPlugin(walrusPlugin);
await pluginSystem.enablePlugin('walrus-plugin');

// 使用插件功能
const nftMetadata = await walrusPlugin.getNFTMetadata('123', '0x...');
console.log('NFT Metadata:', nftMetadata);
```

## 📦 插件类型

### 1. Walrus NFT插件

集成Walrus NFT平台，提供NFT查询、搜索、价格获取等功能。

```typescript
import {
  WalrusPlugin,
  WalrusPluginConfig,
} from '@0xobelisk/plugin-system/walrus';

const config: WalrusPluginConfig = {
  apiEndpoint: 'https://api.walrus.xyz',
  apiKey: 'your-api-key',
  network: 'mainnet',
  timeout: 30000,
  retries: 3,
  enableCache: true,
  cacheExpiry: 300,
};

const walrusPlugin = new WalrusPlugin(config);
```

#### 主要功能

- **NFT元数据查询**: `getNFTMetadata(tokenId, contractAddress)`
- **用户NFT列表**: `getUserNFTs(address, limit, offset)`
- **NFT搜索**: `searchNFTs(query, filters)`
- **价格信息**: `getNFTPrice(tokenId, contractAddress)`

### 2. 自定义插件

创建自定义插件来集成其他服务：

```typescript
import { Plugin, PluginContext, PluginStatus } from '@0xobelisk/plugin-system';

export class MyCustomPlugin implements Plugin {
  public metadata = {
    id: 'my-custom-plugin',
    name: 'My Custom Plugin',
    version: '1.0.0',
    description: 'A custom plugin example',
    author: 'Your Name',
    dependencies: [],
  };

  public config = {
    name: 'my-custom-plugin',
    version: '1.0.0',
    options: {},
  };

  public status: PluginStatus = PluginStatus.UNINSTALLED;

  async onInstall(context: PluginContext): Promise<void> {
    context.logger.info('Installing custom plugin...');
    // 安装逻辑
  }

  async onEnable(context: PluginContext): Promise<void> {
    context.logger.info('Enabling custom plugin...');
    // 启用逻辑
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.logger.info('Disabling custom plugin...');
    // 禁用逻辑
  }

  async onUninstall(context: PluginContext): Promise<void> {
    context.logger.info('Uninstalling custom plugin...');
    // 卸载逻辑
  }

  // 自定义方法
  async myCustomMethod(): Promise<any> {
    // 自定义功能实现
  }
}
```

## 🔧 插件系统配置

### PluginSystemConfig

```typescript
interface PluginSystemConfig {
  pluginDirectory?: string; // 插件目录
  autoLoad?: boolean; // 自动加载插件
  hotReload?: boolean; // 热重载
  configPath?: string; // 配置文件路径
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  storageDirectory?: string; // 存储目录
}
```

### 插件配置

```typescript
interface PluginConfig {
  name: string; // 插件名称
  version: string; // 插件版本
  description?: string; // 描述
  author?: string; // 作者
  dependencies?: string[]; // 依赖
  options?: Record<string, any>; // 配置选项
  env?: Record<string, string>; // 环境变量
  apiKeys?: Record<string, string>; // API密钥
}
```

## 🎯 插件生命周期

### 1. 安装 (Install)

- 验证配置
- 初始化资源
- 注册组件

### 2. 启用 (Enable)

- 解析依赖
- 注册事件监听器
- 启动服务

### 3. 禁用 (Disable)

- 停止服务
- 移除事件监听器
- 清理资源

### 4. 卸载 (Uninstall)

- 完全清理资源
- 移除注册的组件

## 🔌 插件API

### 插件上下文 (PluginContext)

```typescript
interface PluginContext {
  dubhe: Dubhe; // Dubhe实例
  world: World; // ECS世界
  pluginManager: PluginManager; // 插件管理器
  config: PluginConfig; // 插件配置
  metadata: PluginMetadata; // 插件元数据
  logger: PluginLogger; // 日志记录器
  events: PluginEventEmitter; // 事件发射器
}
```

### 事件系统

```typescript
// 监听事件
context.events.on('transaction:confirmed', (txHash: string) => {
  // 处理交易确认
});

// 发射事件
context.events.emit('nft:transferred', {
  tokenId: '123',
  from: '0x...',
  to: '0x...',
});
```

### 存储系统

```typescript
// 保存数据
await context.pluginManager.getStorage().save('my-plugin', 'key', data);

// 加载数据
const data = await context.pluginManager.getStorage().load('my-plugin', 'key');

// 检查数据是否存在
const exists = await context.pluginManager
  .getStorage()
  .exists('my-plugin', 'key');
```

## 🛠️ 高级功能

### 1. 插件依赖管理

```typescript
// 插件依赖配置
public metadata = {
  dependencies: [
    { name: 'walrus-plugin', version: '>=1.0.0', type: 'required' }
  ]
};
```

### 2. 插件热重载

```typescript
const pluginSystem = new PluginSystem(dubhe, world, {
  hotReload: true,
});
```

### 3. 插件状态监控

```typescript
// 获取状态报告
const report = pluginSystem.getStatusReport();
console.log('Plugin Status:', report);

// 检查依赖冲突
const conflicts = pluginSystem.checkDependencyConflicts();
console.log('Dependency Conflicts:', conflicts);
```

### 4. 插件数据备份

```typescript
// 备份插件数据
await pluginSystem.backupPluginData('walrus-plugin');

// 恢复插件数据
await pluginSystem.restorePluginData('walrus-plugin', 'backup-id');
```

## 📁 插件目录结构

```
plugins/
├── walrus-plugin/
│   ├── package.json
│   ├── plugin.json
│   ├── src/
│   │   ├── index.ts
│   │   └── WalrusPlugin.ts
│   └── README.md
├── my-custom-plugin/
│   ├── package.json
│   ├── plugin.json
│   ├── src/
│   │   ├── index.ts
│   │   └── MyCustomPlugin.ts
│   └── README.md
└── plugin-config.json
```

### plugin.json 示例

```json
{
  "id": "walrus-plugin",
  "name": "Walrus Integration",
  "version": "1.0.0",
  "description": "Integration with Walrus NFT platform",
  "author": "Dubhe Team",
  "main": "src/index.ts",
  "dependencies": [],
  "config": {
    "apiEndpoint": "https://api.walrus.xyz",
    "network": "mainnet"
  }
}
```

## 🔒 安全考虑

### 1. API密钥管理

```typescript
// 使用环境变量
const config: WalrusPluginConfig = {
  apiKey: process.env.WALRUS_API_KEY,
  // ...
};
```

### 2. 权限控制

```typescript
// 插件权限验证
async onEnable(context: PluginContext): Promise<void> {
  // 验证权限
  if (!this.hasRequiredPermissions()) {
    throw new Error('Insufficient permissions');
  }
  // ...
}
```

### 3. 数据验证

```typescript
// 输入验证
private validateInput(data: any): boolean {
  // 实现输入验证逻辑
  return true;
}
```

## 🧪 测试插件

### 单元测试

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { WalrusPlugin } from '@0xobelisk/plugin-system/walrus';

describe('WalrusPlugin', () => {
  let plugin: WalrusPlugin;

  beforeEach(() => {
    plugin = new WalrusPlugin({
      apiEndpoint: 'https://test-api.walrus.xyz',
      apiKey: 'test-key',
      network: 'testnet',
    });
  });

  it('should get NFT metadata', async () => {
    const metadata = await plugin.getNFTMetadata('123', '0x...');
    expect(metadata).toBeDefined();
  });
});
```

### 集成测试

```typescript
import { PluginSystem } from '@0xobelisk/plugin-system';

describe('Plugin System Integration', () => {
  let pluginSystem: PluginSystem;

  beforeEach(async () => {
    pluginSystem = new PluginSystem(dubhe, world);
    await pluginSystem.start();
  });

  afterEach(async () => {
    await pluginSystem.stop();
  });

  it('should load and enable plugin', async () => {
    const plugin = new WalrusPlugin(config);
    pluginSystem.registerPlugin(plugin);
    await pluginSystem.enablePlugin('walrus-plugin');

    expect(pluginSystem.isPluginEnabled('walrus-plugin')).toBe(true);
  });
});
```

## 📚 最佳实践

### 1. 错误处理

```typescript
async onEnable(context: PluginContext): Promise<void> {
  try {
    // 启用逻辑
  } catch (error) {
    context.logger.error(`Failed to enable plugin: ${error}`);
    throw error;
  }
}
```

### 2. 资源清理

```typescript
async onDisable(context: PluginContext): Promise<void> {
  // 清理资源
  this.cache.clear();
  this.removeEventListeners();
  this.cleanupConnections();
}
```

### 3. 性能优化

```typescript
// 使用缓存
private cache = new Map<string, { data: any; expiry: number }>();

async getData(key: string): Promise<any> {
  const cached = this.cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const data = await this.fetchData(key);
  this.cache.set(key, { data, expiry: Date.now() + 300000 });
  return data;
}
```

### 4. 日志记录

```typescript
async onEnable(context: PluginContext): Promise<void> {
  context.logger.info('Enabling plugin...');

  try {
    // 启用逻辑
    context.logger.info('Plugin enabled successfully');
  } catch (error) {
    context.logger.error(`Failed to enable plugin: ${error}`);
    throw error;
  }
}
```

## 🤝 贡献指南

### 创建新插件

1. 创建插件目录结构
2. 实现Plugin接口
3. 添加测试用例
4. 编写文档
5. 提交Pull Request

### 插件审查

- 代码质量检查
- 安全性审查
- 性能测试
- 文档完整性

## 📞 支持

- **文档**: [Plugin System Documentation](https://docs.dubhe.obelisk.build/plugins)
- **问题反馈**: [GitHub Issues](https://github.com/0xobelisk/dubhe/issues)
- **社区**: [Discord](https://discord.gg/dubhe)
- **邮件**: plugins@dubhe.io

---

**版本**: 1.0.0  
**许可证**: Apache-2.0  
**维护者**: Dubhe Team
