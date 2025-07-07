# 🔌 Dubhe Extension System

Dubhe 拓展系统是一个轻量级、高性能的功能增强框架，专为 Dubhe 区块链开发平台设计。与插件系统不同，拓展系统专注于功能增强和模块化扩展，提供更紧密的集成和更高的性能。

## 📋 目录

- [特性](#特性)
- [与插件系统的区别](#与插件系统的区别)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API 参考](#api-参考)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## ✨ 特性

### 🚀 核心特性

- **轻量级设计**: 专注于功能增强，资源占用少
- **高性能**: 紧耦合设计，执行效率高
- **模块化**: 支持按需加载和卸载
- **事件驱动**: 基于拓展点的执行机制
- **优先级管理**: 支持拓展执行优先级控制
- **热重载**: 支持运行时拓展更新

### 🔧 技术特性

- **TypeScript 支持**: 完整的类型定义
- **依赖注入**: 支持拓展间依赖管理
- **错误隔离**: 单个拓展错误不影响整体系统
- **监控统计**: 内置性能监控和统计功能
- **配置管理**: 灵活的配置系统
- **存储接口**: 统一的拓展数据存储

## 🔄 与插件系统的区别

| 特性           | 拓展系统 (Extension System) | 插件系统 (Plugin System) |
| -------------- | --------------------------- | ------------------------ |
| **设计理念**   | 功能增强，无缝集成          | 功能模块化，独立运行     |
| **生命周期**   | 动态加载/卸载               | 完整的安装/卸载周期      |
| **依赖关系**   | 轻量级依赖                  | 复杂的依赖管理           |
| **使用场景**   | 小型功能增强                | 大型功能模块             |
| **集成方式**   | 紧耦合，共享进程            | 松耦合，独立进程         |
| **性能**       | 高（直接调用）              | 中等（进程间通信）       |
| **资源占用**   | 低                          | 中等                     |
| **开发复杂度** | 简单                        | 复杂                     |

## 🚀 快速开始

### 安装

```bash
npm install @0xobelisk/extension-system
```

### 基本使用

```typescript
import { Dubhe } from '@0xobelisk/sui-client';
import { World } from '@0xobelisk/ecs';
import {
  ExtensionSystem,
  ValidationExtension,
} from '@0xobelisk/extension-system';

// 1. 创建 Dubhe 和 ECS 实例
const dubhe = new Dubhe({
  network: 'testnet',
  rpcUrl: 'https://fullnode.testnet.sui.io',
});

const world = new World();

// 2. 创建拓展系统
const extensionSystem = new ExtensionSystem(dubhe, world);

// 3. 初始化拓展系统
await extensionSystem.initialize();

// 4. 注册拓展
const validationExtension = new ValidationExtension();
extensionSystem.register(validationExtension);

// 5. 执行拓展点
const results = await extensionSystem.executeExtensionPoint(
  ExtensionPoint.DATA_VALIDATION,
  { type: 'transaction', from: '0x...', to: '0x...', amount: '1000' }
);

console.log('验证结果:', results);
```

## 🧠 核心概念

### 拓展点 (Extension Points)

拓展点是系统中预定义的执行钩子，拓展可以注册到这些点上：

```typescript
enum ExtensionPoint {
  BEFORE_TRANSACTION = 'before_transaction', // 交易处理前
  AFTER_TRANSACTION = 'after_transaction', // 交易处理后
  BEFORE_NFT_TRANSFER = 'before_nft_transfer', // NFT转移前
  AFTER_NFT_TRANSFER = 'after_nft_transfer', // NFT转移后
  BEFORE_WALLET_CONNECT = 'before_wallet_connect', // 钱包连接前
  AFTER_WALLET_CONNECT = 'after_wallet_connect', // 钱包连接后
  DATA_VALIDATION = 'data_validation', // 数据验证
  ERROR_HANDLING = 'error_handling', // 错误处理
  LOGGING = 'logging', // 日志记录
  CACHE_HANDLING = 'cache_handling', // 缓存处理
  CUSTOM = 'custom', // 自定义拓展点
}
```

### 优先级 (Priority)

拓展执行优先级控制：

```typescript
enum ExtensionPriority {
  HIGHEST = 1000, // 最高优先级
  HIGH = 100, // 高优先级
  NORMAL = 0, // 正常优先级
  LOW = -100, // 低优先级
  LOWEST = -1000, // 最低优先级
}
```

### 拓展生命周期

```typescript
interface Extension {
  metadata: ExtensionMetadata; // 拓展元数据
  config: ExtensionConfig; // 拓展配置
  status: ExtensionStatus; // 拓展状态

  execute(context: ExtensionContext): Promise<any> | any; // 执行逻辑
  initialize?(context: ExtensionContext): Promise<void> | void; // 初始化
  cleanup?(context: ExtensionContext): Promise<void> | void; // 清理
}
```

## 📚 API 参考

### ExtensionSystem

拓展系统主类：

```typescript
class ExtensionSystem {
  constructor(dubhe: Dubhe, world: World);

  // 生命周期管理
  initialize(): Promise<void>;
  cleanup(): Promise<void>;

  // 拓展管理
  register(extension: Extension): void;
  unregister(extensionId: string): void;
  enable(extensionId: string): void;
  disable(extensionId: string): void;

  // 拓展点执行
  executeExtensionPoint(point: ExtensionPoint, data?: any): Promise<any[]>;

  // 系统信息
  getStatusReport(): Record<string, any>;
  getSystemInfo(): Record<string, any>;
  getDependencyGraph(): Record<string, string[]>;
}
```

### ExtensionManager

拓展管理器接口：

```typescript
interface ExtensionManager {
  register(extension: Extension): void;
  unregister(extensionId: string): void;
  enable(extensionId: string): void;
  disable(extensionId: string): void;

  getExtension(extensionId: string): Extension | undefined;
  getAllExtensions(): Extension[];
  getEnabledExtensions(): Extension[];
  isEnabled(extensionId: string): boolean;

  executeExtensionPoint(
    point: ExtensionPoint,
    context: ExtensionContext
  ): Promise<any[]>;
  getExtensionsForPoint(point: ExtensionPoint): Extension[];
}
```

### ExtensionContext

拓展执行上下文：

```typescript
interface ExtensionContext {
  dubhe: Dubhe; // Dubhe 实例
  world: World; // ECS 世界实例
  extensionManager: ExtensionManager; // 拓展管理器
  config: ExtensionConfig; // 拓展配置
  metadata: ExtensionMetadata; // 拓展元数据
  logger: ExtensionLogger; // 日志记录器
  events: ExtensionEventEmitter; // 事件发射器
  data?: any; // 当前执行的数据
  result?: any; // 执行结果
  error?: Error; // 错误信息
}
```

## 💡 使用示例

### 创建自定义拓展

```typescript
import {
  Extension,
  ExtensionPoint,
  ExtensionPriority,
} from '@0xobelisk/extension-system';

class CustomLoggingExtension implements Extension {
  public metadata = {
    id: 'custom-logging',
    name: 'Custom Logging Extension',
    version: '1.0.0',
    description: '自定义日志记录拓展',
    author: 'Developer',
    extensionPoints: [ExtensionPoint.LOGGING],
    priority: ExtensionPriority.NORMAL,
  };

  public config = {
    name: this.metadata.name,
    version: this.metadata.version,
    extensionPoints: this.metadata.extensionPoints,
    priority: this.metadata.priority,
    enabled: true,
    options: {
      logLevel: 'info',
      format: 'json',
    },
  };

  public status = 'unregistered' as any;

  async execute(context: ExtensionContext) {
    const { data, logger } = context;

    logger.info('Custom logging extension executing...');

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.config.options.logLevel,
      message: 'Custom log entry',
      data: data,
    };

    console.log(JSON.stringify(logEntry, null, 2));
    return logEntry;
  }

  async initialize(context: ExtensionContext) {
    const { logger } = context;
    logger.info('Custom logging extension initializing...');
  }

  async cleanup(context: ExtensionContext) {
    const { logger } = context;
    logger.info('Custom logging extension cleaning up...');
  }
}
```

### 批量操作

```typescript
// 批量启用拓展
extensionSystem.enableExtensions(['validation-extension', 'logging-extension']);

// 批量禁用拓展
extensionSystem.disableExtensions(['debug-extension']);

// 获取拓展状态报告
const report = extensionSystem.getStatusReport();
console.log('拓展状态:', report);
```

### 错误处理

```typescript
// 执行拓展点并处理错误
try {
  const results = await extensionSystem.executeExtensionPoint(
    ExtensionPoint.DATA_VALIDATION,
    transactionData
  );
  console.log('验证成功:', results);
} catch (error) {
  console.error('验证失败:', error);

  // 获取错误拓展信息
  const manager = extensionSystem.getManager();
  const extensions = manager.getExtensionsForPoint(
    ExtensionPoint.DATA_VALIDATION
  );
  extensions.forEach((ext) => {
    if (ext.status === 'error') {
      console.error(`拓展 ${ext.metadata.name} 错误:`, ext.error);
    }
  });
}
```

### 事件监听

```typescript
const events = extensionSystem.getEvents();

// 监听拓展注册事件
events.on('extension:registered', (extension) => {
  console.log(`拓展已注册: ${extension.metadata.name}`);
});

// 监听拓展启用事件
events.on('extension:enabled', (extension) => {
  console.log(`拓展已启用: ${extension.metadata.name}`);
});

// 监听拓展点执行事件
events.on('extension:point:executed', (point, results) => {
  console.log(`拓展点 ${point} 执行完成，结果数量: ${results.length}`);
});
```

## 🎯 最佳实践

### 1. 拓展设计原则

```typescript
// ✅ 好的设计：单一职责
class ValidationExtension implements Extension {
  // 只负责数据验证
}

// ❌ 不好的设计：多重职责
class ValidationAndLoggingExtension implements Extension {
  // 既负责验证又负责日志记录
}
```

### 2. 错误处理

```typescript
async execute(context: ExtensionContext) {
  try {
    // 执行逻辑
    const result = await this.performOperation(context.data);
    return result;
  } catch (error) {
    // 记录错误但不抛出，避免影响其他拓展
    context.logger.error(`Extension ${this.metadata.name} failed:`, error);
    return { success: false, error: error.message };
  }
}
```

### 3. 性能优化

```typescript
// 使用缓存避免重复计算
private cache = new Map();

async execute(context: ExtensionContext) {
  const cacheKey = JSON.stringify(context.data);

  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }

  const result = await this.computeResult(context.data);
  this.cache.set(cacheKey, result);

  return result;
}
```

### 4. 配置管理

```typescript
// 使用环境变量和默认值
public config = {
  name: this.metadata.name,
  version: this.metadata.version,
  extensionPoints: this.metadata.extensionPoints,
  priority: this.metadata.priority,
  enabled: process.env.ENABLE_VALIDATION !== 'false',
  options: {
    strictMode: process.env.STRICT_MODE === 'true',
    timeout: parseInt(process.env.VALIDATION_TIMEOUT) || 5000
  }
};
```

### 5. 测试策略

```typescript
// 单元测试
describe('ValidationExtension', () => {
  let extension: ValidationExtension;
  let mockContext: ExtensionContext;

  beforeEach(() => {
    extension = new ValidationExtension();
    mockContext = createMockContext();
  });

  it('should validate transaction data correctly', async () => {
    const data = { type: 'transaction', from: '0x...', to: '0x...' };
    const result = await extension.execute({ ...mockContext, data });

    expect(result.isValid).toBe(true);
  });
});
```

## 🔧 故障排除

### 常见问题

#### 1. 拓展未执行

**问题**: 拓展注册了但没有执行

**解决方案**:

```typescript
// 检查拓展是否启用
const isEnabled = extensionSystem.getManager().isEnabled('extension-id');
console.log('拓展是否启用:', isEnabled);

// 检查拓展点是否正确
const extensions = extensionSystem
  .getManager()
  .getExtensionsForPoint(ExtensionPoint.DATA_VALIDATION);
console.log(
  '该拓展点的拓展:',
  extensions.map((ext) => ext.metadata.name)
);
```

#### 2. 拓展执行顺序错误

**问题**: 拓展执行顺序不符合预期

**解决方案**:

```typescript
// 检查优先级设置
const extensions = extensionSystem
  .getManager()
  .getExtensionsForPoint(ExtensionPoint.DATA_VALIDATION);
extensions.forEach((ext) => {
  console.log(`${ext.metadata.name}: 优先级 ${ext.metadata.priority}`);
});
```

#### 3. 拓展初始化失败

**问题**: 拓展初始化时出错

**解决方案**:

```typescript
// 检查拓展状态
const extension = extensionSystem.getManager().getExtension('extension-id');
if (extension.status === 'error') {
  console.error('拓展错误:', extension.error);
}

// 重新初始化
extensionSystem.disable('extension-id');
extensionSystem.enable('extension-id');
```

#### 4. 内存泄漏

**问题**: 拓展系统占用内存过多

**解决方案**:

```typescript
// 定期清理未使用的拓展
const manager = extensionSystem.getManager();
const allExtensions = manager.getAllExtensions();

allExtensions.forEach((ext) => {
  if (ext.status === 'disabled' && !ext.config.enabled) {
    manager.unregister(ext.metadata.id);
  }
});

// 清理拓展系统
await extensionSystem.cleanup();
```

### 调试技巧

#### 1. 启用详细日志

```typescript
// 设置日志级别
const logger = extensionSystem.getLogger();
logger.debug('调试信息');
logger.info('信息日志');
logger.warn('警告信息');
logger.error('错误信息');
```

#### 2. 监控拓展性能

```typescript
// 获取拓展统计信息
const report = extensionSystem.getStatusReport();
console.log('拓展统计:', report);

// 监控特定拓展点
const manager = extensionSystem.getManager();
const extensions = manager.getExtensionsForPoint(
  ExtensionPoint.DATA_VALIDATION
);
extensions.forEach((ext) => {
  console.log(`${ext.metadata.name}: ${ext.status}`);
});
```

#### 3. 事件调试

```typescript
// 监听所有事件
const events = extensionSystem.getEvents();
events.on('*', (event, ...args) => {
  console.log(`事件: ${event}`, args);
});
```

## 📄 许可证

Apache-2.0 License

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解贡献指南。

## 📞 支持

- 📧 Email: team@obelisk.build
- 🐛 Issues: [GitHub Issues](https://github.com/0xobelisk/dubhe/issues)
- 📖 文档: [Dubhe Documentation](https://dubhe.obelisk.build)
