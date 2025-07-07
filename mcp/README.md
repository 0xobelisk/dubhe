# dubhe-mcp

Dubhe MCP AI 助手 - 多语言、可扩展的 AI 能力集成系统

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 项目定位

dubhe-mcp 是为 Dubhe 生态提供统一 AI 能力接入的 MCP（Model Context Protocol）工具集，具有以下特点：

- 🌍 **多语言支持**：完整支持中文、英文、日文、韩文
- 🔧 **可扩展架构**：支持 prompt 注册、AI 工具扩展、自定义模型
- 🚀 **企业级功能**：配置管理、日志系统、CLI 界面、工具函数
- 📦 **开箱即用**：预置常用 prompt 模板、AI 模型、工具

## 📦 安装

```bash
# 从 npm 安装
npm install dubhe-mcp

# 或使用 yarn
yarn add dubhe-mcp

# 或使用 pnpm
pnpm add dubhe-mcp
```

## 🚀 快速开始

### 基础使用

```typescript
import { initialize, t, callAI } from 'dubhe-mcp';

// 初始化
await initialize({ lang: 'zh' });

// 多语言支持
console.log(t('welcome', 'zh')); // 欢迎使用 Dubhe MCP AI 助手
console.log(t('welcome', 'en')); // Welcome to Dubhe MCP AI Assistant

// AI 调用
const response = await callAI({
  prompt: '请介绍一下 Dubhe 项目',
  context: { lang: 'zh' },
});
console.log(response.content);
```

### CLI 使用

```bash
# 启动交互式 CLI
npx dubhe-mcp

# 或直接执行命令
npx dubhe-mcp ai call "Hello world"
npx dubhe-mcp prompt list
npx dubhe-mcp config get language
```

## 📚 核心功能

### 🎯 专业级 Dubhe/Sui 开发指导

dubhe-mcp 提供专业级的 Dubhe 框架和 Sui 区块链开发指导，包括：

#### 1. Dubhe 项目初始化指导

```typescript
import { renderPrompt } from 'dubhe-mcp';

const result = renderPrompt('dubhe-101', {
  lang: 'zh',
  variables: {
    projectName: 'my-dubhe-game',
    additionalContext: '这是一个游戏项目，需要包含 NFT 和代币功能',
  },
});
console.log(result.content);
```

#### 2. Sui Move 智能合约开发指导

```typescript
const result = renderPrompt('sui-contract', {
  lang: 'zh',
  variables: {
    packageName: 'my_game',
    moduleName: 'nft_module',
    objectName: 'GameNFT',
    objectFields: 'name: String,\ndescription: String,\nimage_url: String',
    additionalContext:
      '这是一个游戏 NFT 合约，需要支持铸造、转移和属性更新功能',
  },
});
```

#### 3. Dubhe 客户端开发指导

```typescript
const result = renderPrompt('dubhe-client', {
  lang: 'zh',
  variables: {
    rpcUrl: 'https://fullnode.testnet.sui.io',
    objectId: '0x1234567890abcdef...',
    packageId: '0x4567890abcdef123...',
    module: 'nft_module',
    function: 'mint_nft',
    arguments: 'txb.pure("My NFT"), txb.pure("Description")',
    additionalContext: '需要实现 NFT 铸造、查询和转移功能',
  },
});
```

#### 4. 配置和部署指导

```typescript
const result = renderPrompt('dubhe-config', {
  lang: 'zh',
  variables: {
    projectName: 'my-dubhe-game',
    version: '1.0.0',
    mainnetUrl: 'https://fullnode.mainnet.sui.io',
    testnetUrl: 'https://fullnode.testnet.sui.io',
    devnetUrl: 'https://fullnode.devnet.sui.io',
    additionalContext: '需要支持多环境部署和自动化 CI/CD 流程',
  },
});
```

#### 5. 测试和质量保证指导

```typescript
const result = renderPrompt('dubhe-testing', {
  lang: 'zh',
  variables: {
    testRpcUrl: 'https://fullnode.testnet.sui.io',
    additionalContext: '需要全面的测试覆盖，包括单元测试、集成测试和端到端测试',
  },
});
```

### 2. 多语言资源管理

```typescript
import { t, registerResources } from 'dubhe-mcp';

// 使用内置资源
console.log(t('welcome', 'zh'));

// 注册自定义资源
registerResources({
  'custom.hello': {
    zh: '你好，Dubhe！',
    en: 'Hello, Dubhe!',
    ja: 'こんにちは、Dubhe！',
    ko: '안녕하세요, Dubhe!',
  },
});
```

### 2. Prompt 模板系统

```typescript
import { registerPrompt, renderPrompt } from 'dubhe-mcp';

// 注册自定义 prompt
registerPrompt({
  id: 'code-review',
  name: '代码审查',
  description: '代码审查和优化建议',
  template: {
    zh: '请审查以下代码：\n\n{{code}}\n\n请提供优化建议。',
    en: 'Please review the following code:\n\n{{code}}\n\nPlease provide optimization suggestions.',
  },
  variables: ['code'],
});

// 渲染 prompt
const result = renderPrompt('code-review', {
  lang: 'zh',
  variables: { code: 'function test() { return true; }' },
});
console.log(result.content);
```

### 3. AI 调用和工具

```typescript
import { callAI, registerAITool, getAIModels } from 'dubhe-mcp';

// 注册 AI 工具
registerAITool({
  id: 'code-analyzer',
  name: '代码分析器',
  description: '分析代码质量',
  category: 'development',
  async execute(params, context) {
    return { quality: 'good', score: 85 };
  },
});

// 调用 AI
const response = await callAI({
  prompt: '分析这段代码',
  model: 'gpt-4',
  tools: ['code-analyzer'],
  context: { lang: 'zh' },
});
```

### 4. 配置管理

```typescript
import { getConfig, setConfig, saveConfig } from 'dubhe-mcp';

// 获取配置
const language = getConfig('language', 'en');

// 设置配置
setConfig('aiModels.default', 'gpt-4');
await saveConfig();
```

### 5. 工具函数

```typescript
import {
  FileUtils,
  HttpUtils,
  CryptoUtils,
  ValidationUtils,
  TimeUtils,
  StringUtils,
} from 'dubhe-mcp';

// 文件操作
await FileUtils.writeFile('test.txt', 'Hello World');

// HTTP 请求
const data = await HttpUtils.get('https://api.example.com/data');

// 加密解密
const encrypted = CryptoUtils.encrypt('secret', 'key');
const decrypted = CryptoUtils.decrypt(encrypted, 'key');

// 数据验证
const isValid = ValidationUtils.isValidEmail('test@example.com');

// 时间格式化
const formatted = TimeUtils.formatDate(new Date());

// 字符串处理
const random = StringUtils.randomString(10);
```

## 🎯 专业开发指导示例

### 运行完整示例

```bash
# 运行 Dubhe/Sui 开发指导示例
npx tsx examples/dubhe-development.ts
```

这个示例将展示：

- 🚀 Dubhe 项目初始化指导
- 📝 Sui Move 智能合约开发指导
- 💻 Dubhe 客户端开发指导
- ⚙️ 配置和部署指导
- 🧪 测试和质量保证指导
- 🌍 多语言支持演示

### 示例输出

````
🎯 Dubhe/Sui 专业开发指导系统

🚀 Dubhe 项目初始化指导

📋 项目初始化指南:
# Dubhe 开发入门指南

## 项目初始化
使用 Dubhe CLI 创建新项目：
```bash
npx create-dubhe@latest my-dubhe-game
cd my-dubhe-game
````

## 项目结构

Dubhe 项目包含以下核心组件：

- **CLI 工具**: 项目管理和部署
- **客户端库**: Sui 区块链交互
- **通用组件**: 可复用类型和工具
- **框架核心**: 核心功能和最佳实践

🤖 AI 开发建议:
基于您的游戏项目需求，我建议以下实施策略：

1. 项目结构建议：

   - 使用 Dubhe 的标准项目结构
   - 分离合约和客户端代码
   - 建立清晰的模块化架构

2. 依赖包：

   - @0xobelisk/sui-client
   - @0xobelisk/sui-common
   - @0xobelisk/sui-cli

3. 开发步骤：
   - 第一周：项目初始化和基础架构
   - 第二周：智能合约开发
   - 第三周：客户端开发
   - 第四周：测试和优化

...

````

## 🛠️ CLI 命令

### 基础命令

```bash
# 帮助信息
dubhe-mcp help

# 配置管理
dubhe-mcp config get language
dubhe-mcp config set language zh

# 语言设置
dubhe-mcp lang zh
````

### Prompt 管理

```bash
# 列出所有 prompt 模板
dubhe-mcp prompt list

# 搜索 prompt 模板
dubhe-mcp prompt search "code"

# 渲染 prompt 模板
dubhe-mcp prompt render code-review code "function test() {}"

# 按分类列出
dubhe-mcp prompt list development
```

### AI 操作

```bash
# 调用 AI
dubhe-mcp ai call "Hello world" gpt-4

# 查看调用历史
dubhe-mcp ai history 10

# 列出可用模型
dubhe-mcp ai models

# 列出可用工具
dubhe-mcp ai tools
dubhe-mcp ai tools development
```

## 📁 项目结构

```
mcp/
├── bin/                    # 命令行入口
│   └── dubhe-mcp.js
├── src/                    # 源代码
│   ├── index.ts           # 主入口
│   ├── logger.ts          # 日志系统
│   ├── resources.ts       # 多语言资源管理
│   ├── prompts.ts         # Prompt 模板系统
│   ├── ai.ts              # AI 调用和工具
│   ├── utils.ts           # 工具函数
│   └── cli.ts             # 命令行界面
├── examples/              # 使用示例
│   └── basic-usage.ts
├── dist/                  # 构建输出
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 开发

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test

# 代码检查
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run type-check

# 生成文档
npm run docs
```

### 运行示例

```bash
# 运行基础示例
npm run example

# 或直接运行
npx tsx examples/basic-usage.ts
```

## 📖 API 文档

### 核心模块

#### 初始化

```typescript
initialize(options?: { lang?: Lang; configPath?: string }): Promise<void>
```

#### 多语言资源

```typescript
t(key: string, lang: Lang): string
registerResources(resources: ResourceMap): void
```

#### Prompt 管理

```typescript
registerPrompt(template: PromptTemplate): void
renderPrompt(id: string, context: PromptContext): PromptResult
listPrompts(category?: string): PromptTemplate[]
searchPrompts(query: string): PromptTemplate[]
```

#### AI 服务

```typescript
callAI(request: AIRequest): Promise<AIResponse>
registerAIModel(model: AIModel): void
registerAITool(tool: AITool): void
getAIHistory(limit?: number): AICallHistory[]
```

#### 配置管理

```typescript
getConfig(key: string, defaultValue?: any): any
setConfig(key: string, value: any): void
loadConfig(): Promise<void>
saveConfig(): Promise<void>
```

### 类型定义

```typescript
type Lang = 'zh' | 'en' | 'ja' | 'ko';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: ResourceMap;
  variables?: string[];
  category?: string;
  tags?: string[];
}

interface AIRequest {
  prompt: string | PromptResult;
  model?: string;
  tools?: string[];
  context: AIContext;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}
```

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 和 Prettier 配置
- 添加适当的测试
- 更新文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [Dubhe 项目](https://github.com/0xobelisk/dubhe)
- [MCP 协议](https://modelcontextprotocol.io/)
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](https://github.com/0xobelisk/dubhe/issues)
2. 创建新的 Issue
3. 联系开发团队

---

**感谢使用 dubhe-mcp！** 🎉
