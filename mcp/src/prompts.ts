// dubhe-mcp prompt 注册和管理系统

import logger from './logger';
import { type Lang } from './resources';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: {
    zh: string;
    en: string;
    ja: string;
    ko: string;
  };
  variables?: string[];
  category?: string;
  tags?: string[];
}

export interface PromptContext {
  lang: Lang;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PromptResult {
  content: string;
  template: PromptTemplate;
  context: PromptContext;
  timestamp: Date;
}

class PromptRegistry {
  private prompts: Map<string, PromptTemplate> = new Map();
  private categories: Set<string> = new Set();

  /**
   * 注册 prompt 模板
   */
  register(template: PromptTemplate): void {
    if (this.prompts.has(template.id)) {
      logger.warn(`Prompt template ${template.id} already exists, overwriting`);
    }

    this.prompts.set(template.id, template);
    if (template.category) {
      this.categories.add(template.category);
    }

    logger.info(`Registered prompt template: ${template.id}`);
  }

  /**
   * 获取 prompt 模板
   */
  get(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  /**
   * 渲染 prompt
   */
  render(id: string, context: PromptContext): PromptResult {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Prompt template ${id} not found`);
    }

    const content = this.renderTemplate(template, context);

    return {
      content,
      template,
      context,
      timestamp: new Date(),
    };
  }

  /**
   * 渲染模板内容
   */
  private renderTemplate(
    template: PromptTemplate,
    context: PromptContext
  ): string {
    // 获取对应语言的模板内容
    const templateContent =
      template.template[context.lang] || template.template['en'] || '';
    let content = templateContent;

    // 变量替换
    if (template.variables && context.variables) {
      for (const variable of template.variables) {
        const value = context.variables[variable];
        if (value !== undefined) {
          const placeholder = `{{${variable}}}`;
          content = content.replace(
            new RegExp(placeholder, 'g'),
            String(value)
          );
        }
      }
    }

    return content;
  }

  /**
   * 列出所有 prompt 模板
   */
  list(category?: string): PromptTemplate[] {
    const templates = Array.from(this.prompts.values());
    if (category) {
      return templates.filter((t) => t.category === category);
    }
    return templates;
  }

  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * 搜索 prompt 模板
   */
  search(query: string): PromptTemplate[] {
    const templates = Array.from(this.prompts.values());
    const lowerQuery = query.toLowerCase();

    return templates.filter(
      (template) =>
        template.id.toLowerCase().includes(lowerQuery) ||
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 删除 prompt 模板
   */
  remove(id: string): boolean {
    const template = this.prompts.get(id);
    if (template) {
      this.prompts.delete(id);
      logger.info(`Removed prompt template: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * 清空所有 prompt 模板
   */
  clear(): void {
    this.prompts.clear();
    this.categories.clear();
    logger.info('Cleared all prompt templates');
  }
}

// 全局 prompt 注册表实例
export const promptRegistry = new PromptRegistry();

// 预定义的基础 prompt 模板
export const defaultPrompts: PromptTemplate[] = [
  {
    id: 'code-review',
    name: '代码审查',
    description: '代码审查和优化建议',
    category: 'development',
    tags: ['code', 'review', 'optimization'],
    template: {
      zh: '请对以下代码进行审查，提供优化建议：\n\n{{code}}\n\n请从以下方面进行分析：\n1. 代码质量\n2. 性能优化\n3. 安全性\n4. 可维护性',
      en: 'Please review the following code and provide optimization suggestions:\n\n{{code}}\n\nPlease analyze from the following aspects:\n1. Code quality\n2. Performance optimization\n3. Security\n4. Maintainability',
      ja: '以下のコードをレビューし、最適化の提案をしてください：\n\n{{code}}\n\n以下の観点から分析してください：\n1. コード品質\n2. パフォーマンス最適化\n3. セキュリティ\n4. 保守性',
      ko: '다음 코드를 검토하고 최적화 제안을 제공해주세요:\n\n{{code}}\n\n다음 측면에서 분석해주세요:\n1. 코드 품질\n2. 성능 최적화\n3. 보안\n4. 유지보수성',
    },
    variables: ['code'],
  },
  {
    id: 'bug-analysis',
    name: 'Bug 分析',
    description: '错误分析和解决方案',
    category: 'debugging',
    tags: ['bug', 'error', 'debug'],
    template: {
      zh: '请分析以下错误信息并提供解决方案：\n\n错误：{{error}}\n\n上下文：{{context}}\n\n请提供：\n1. 错误原因分析\n2. 解决方案\n3. 预防措施',
      en: 'Please analyze the following error and provide a solution:\n\nError: {{error}}\n\nContext: {{context}}\n\nPlease provide:\n1. Error cause analysis\n2. Solution\n3. Prevention measures',
      ja: '以下のエラーを分析し、解決策を提供してください：\n\nエラー：{{error}}\n\nコンテキスト：{{context}}\n\n以下を提供してください：\n1. エラー原因分析\n2. 解決策\n3. 予防措置',
      ko: '다음 오류를 분석하고 해결책을 제공해주세요:\n\n오류: {{error}}\n\n컨텍스트: {{context}}\n\n다음을 제공해주세요:\n1. 오류 원인 분석\n2. 해결책\n3. 예방 조치',
    },
    variables: ['error', 'context'],
  },
  {
    id: 'architecture-review',
    name: '架构审查',
    description: '系统架构设计和审查',
    category: 'architecture',
    tags: ['architecture', 'design', 'system'],
    template: {
      zh: '请审查以下系统架构设计：\n\n{{architecture}}\n\n需求：{{requirements}}\n\n请从以下方面进行评估：\n1. 可扩展性\n2. 性能\n3. 安全性\n4. 可维护性\n5. 成本效益',
      en: 'Please review the following system architecture design:\n\n{{architecture}}\n\nRequirements: {{requirements}}\n\nPlease evaluate from the following aspects:\n1. Scalability\n2. Performance\n3. Security\n4. Maintainability\n5. Cost-effectiveness',
      ja: '以下のシステムアーキテクチャ設計をレビューしてください：\n\n{{architecture}}\n\n要件：{{requirements}}\n\n以下の観点から評価してください：\n1. スケーラビリティ\n2. パフォーマンス\n3. セキュリティ\n4. 保守性\n5. コスト効率',
      ko: '다음 시스템 아키텍처 설계를 검토해주세요:\n\n{{architecture}}\n\n요구사항: {{requirements}}\n\n다음 측면에서 평가해주세요:\n1. 확장성\n2. 성능\n3. 보안\n4. 유지보수성\n5. 비용 효율성',
    },
    variables: ['architecture', 'requirements'],
  },

  // Dubhe/Sui 专业开发指导模板
  {
    id: 'dubhe-101',
    name: 'Dubhe 入门指南',
    description: 'Dubhe 框架入门和项目设置指导',
    category: 'dubhe',
    tags: ['dubhe', 'getting-started', 'setup'],
    template: {
      zh: `# Dubhe 开发入门指南

## 项目初始化
使用 Dubhe CLI 创建新项目：
\`\`\`bash
npx create-dubhe@latest {{projectName}}
cd {{projectName}}
\`\`\`

## 项目结构
Dubhe 项目包含以下核心组件：
- **CLI 工具**: 项目管理和部署
- **客户端库**: Sui 区块链交互
- **通用组件**: 可复用类型和工具
- **框架核心**: 核心功能和最佳实践

## 开发流程
1. 初始化项目
2. 配置开发环境
3. 编写智能合约
4. 实现客户端逻辑
5. 测试和部署

## 最佳实践
- 使用 TypeScript 进行类型安全开发
- 遵循 Dubhe 项目结构规范
- 充分利用 Dubhe 提供的工具链
- 参考官方文档和示例

{{additionalContext}}`,
      en: `# Dubhe Development Getting Started Guide

## Project Initialization
Create a new project with Dubhe CLI:
\`\`\`bash
npx create-dubhe@latest {{projectName}}
cd {{projectName}}
\`\`\`

## Project Structure
Dubhe projects include the following core components:
- **CLI Tools**: Project management and deployment
- **Client Libraries**: Sui blockchain interactions
- **Common Components**: Reusable types and utilities
- **Framework Core**: Core functionality and best practices

## Development Workflow
1. Initialize project
2. Configure development environment
3. Write smart contracts
4. Implement client logic
5. Test and deploy

## Best Practices
- Use TypeScript for type-safe development
- Follow Dubhe project structure conventions
- Leverage Dubhe's comprehensive toolchain
- Reference official documentation and examples

{{additionalContext}}`,
      ja: `# Dubhe開発入門ガイド

## プロジェクト初期化
Dubhe CLIで新しいプロジェクトを作成：
\`\`\`bash
npx create-dubhe@latest {{projectName}}
cd {{projectName}}
\`\`\`

## プロジェクト構造
Dubheプロジェクトには以下のコアコンポーネントが含まれます：
- **CLIツール**: プロジェクト管理とデプロイ
- **クライアントライブラリ**: Suiブロックチェーン相互作用
- **共通コンポーネント**: 再利用可能な型とユーティリティ
- **フレームワークコア**: コア機能とベストプラクティス

## 開発ワークフロー
1. プロジェクト初期化
2. 開発環境設定
3. スマートコントラクト作成
4. クライアントロジック実装
5. テストとデプロイ

## ベストプラクティス
- 型安全な開発のためのTypeScript使用
- Dubheプロジェクト構造規約の遵守
- Dubheの包括的なツールチェーンの活用
- 公式ドキュメントとサンプルの参照

{{additionalContext}}`,
      ko: `# Dubhe 개발 시작 가이드

## 프로젝트 초기화
Dubhe CLI로 새 프로젝트 생성:
\`\`\`bash
npx create-dubhe@latest {{projectName}}
cd {{projectName}}
\`\`\`

## 프로젝트 구조
Dubhe 프로젝트는 다음 핵심 구성 요소를 포함합니다:
- **CLI 도구**: 프로젝트 관리 및 배포
- **클라이언트 라이브러리**: Sui 블록체인 상호작용
- **공통 구성 요소**: 재사용 가능한 타입 및 유틸리티
- **프레임워크 코어**: 핵심 기능 및 모범 사례

## 개발 워크플로우
1. 프로젝트 초기화
2. 개발 환경 구성
3. 스마트 계약 작성
4. 클라이언트 로직 구현
5. 테스트 및 배포

## 모범 사례
- 타입 안전 개발을 위한 TypeScript 사용
- Dubhe 프로젝트 구조 규칙 준수
- Dubhe의 포괄적인 도구 체인 활용
- 공식 문서 및 예제 참조

{{additionalContext}}`,
    },
    variables: ['projectName', 'additionalContext'],
  },
  {
    id: 'sui-contract',
    name: 'Sui 智能合约开发',
    description: 'Sui Move 智能合约开发指导',
    category: 'sui',
    tags: ['sui', 'move', 'smart-contract'],
    template: {
      zh: `# Sui Move 智能合约开发指南

## 合约结构
\`\`\`move
module {{packageName}}::{{moduleName}} {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // 对象定义
    struct {{objectName}} has key, store {
        id: UID,
        {{objectFields}}
    }

    // 函数实现
    public fun create_{{objectName}}(
        ctx: &mut TxContext
    ): {{objectName}} {
        {{objectName}} {
            id: object::new(ctx),
            {{objectFields}}
        }
    }
}
\`\`\`

## 关键概念
- **对象**: Sui 的核心数据模型
- **能力**: 定义对象的行为和权限
- **交易**: 原子性操作单元
- **事件**: 状态变化的通知机制

## 最佳实践
1. 使用适当的对象能力
2. 实现安全的访问控制
3. 优化 Gas 使用
4. 添加充分的测试

{{additionalContext}}`,
      en: `# Sui Move Smart Contract Development Guide

## Contract Structure
\`\`\`move
module {{packageName}}::{{moduleName}} {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // Object definition
    struct {{objectName}} has key, store {
        id: UID,
        {{objectFields}}
    }

    // Function implementation
    public fun create_{{objectName}}(
        ctx: &mut TxContext
    ): {{objectName}} {
        {{objectName}} {
            id: object::new(ctx),
            {{objectFields}}
        }
    }
}
\`\`\`

## Key Concepts
- **Objects**: Core data model in Sui
- **Capabilities**: Define object behavior and permissions
- **Transactions**: Atomic operation units
- **Events**: State change notification mechanism

## Best Practices
1. Use appropriate object capabilities
2. Implement secure access control
3. Optimize gas usage
4. Add comprehensive tests

{{additionalContext}}`,
      ja: `# Sui Moveスマートコントラクト開発ガイド

## コントラクト構造
\`\`\`move
module {{packageName}}::{{moduleName}} {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // オブジェクト定義
    struct {{objectName}} has key, store {
        id: UID,
        {{objectFields}}
    }

    // 関数実装
    public fun create_{{objectName}}(
        ctx: &mut TxContext
    ): {{objectName}} {
        {{objectName}} {
            id: object::new(ctx),
            {{objectFields}}
        }
    }
}
\`\`\`

## 主要概念
- **オブジェクト**: Suiのコアデータモデル
- **能力**: オブジェクトの動作と権限を定義
- **トランザクション**: 原子操作単位
- **イベント**: 状態変化通知メカニズム

## ベストプラクティス
1. 適切なオブジェクト能力の使用
2. 安全なアクセス制御の実装
3. Gas使用量の最適化
4. 包括的なテストの追加

{{additionalContext}}`,
      ko: `# Sui Move 스마트 계약 개발 가이드

## 계약 구조
\`\`\`move
module {{packageName}}::{{moduleName}} {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // 객체 정의
    struct {{objectName}} has key, store {
        id: UID,
        {{objectFields}}
    }

    // 함수 구현
    public fun create_{{objectName}}(
        ctx: &mut TxContext
    ): {{objectName}} {
        {{objectName}} {
            id: object::new(ctx),
            {{objectFields}}
        }
    }
}
\`\`\`

## 주요 개념
- **객체**: Sui의 핵심 데이터 모델
- **능력**: 객체의 동작과 권한 정의
- **트랜잭션**: 원자적 작업 단위
- **이벤트**: 상태 변화 알림 메커니즘

## 모범 사례
1. 적절한 객체 능력 사용
2. 안전한 액세스 제어 구현
3. Gas 사용량 최적화
4. 포괄적인 테스트 추가

{{additionalContext}}`,
    },
    variables: [
      'packageName',
      'moduleName',
      'objectName',
      'objectFields',
      'additionalContext',
    ],
  },
  {
    id: 'dubhe-client',
    name: 'Dubhe 客户端开发',
    description: 'Dubhe 客户端库使用指导',
    category: 'dubhe',
    tags: ['dubhe', 'client', 'typescript'],
    template: {
      zh: `# Dubhe 客户端开发指南

## 客户端初始化
\`\`\`typescript
import { SuiClient } from '@0xobelisk/sui-client';

const client = new SuiClient({
  url: '{{rpcUrl}}',
  // 可选配置
  requestOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
\`\`\`

## 常用操作
\`\`\`typescript
// 查询对象
const object = await client.getObject({
  id: '{{objectId}}',
  options: { showContent: true }
});

// 执行交易
const txb = new TransactionBlock();
txb.moveCall({
  target: '{{packageId}}::{{module}}::{{function}}',
  arguments: [{{arguments}}]
});

const result = await client.signAndExecuteTransactionBlock({
  signer: wallet,
  transactionBlock: txb,
});
\`\`\`

## 最佳实践
1. 使用类型安全的客户端
2. 实现错误处理机制
3. 优化网络请求
4. 缓存常用数据

{{additionalContext}}`,
      en: `# Dubhe Client Development Guide

## Client Initialization
\`\`\`typescript
import { SuiClient } from '@0xobelisk/sui-client';

const client = new SuiClient({
  url: '{{rpcUrl}}',
  // Optional configuration
  requestOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
\`\`\`

## Common Operations
\`\`\`typescript
// Query object
const object = await client.getObject({
  id: '{{objectId}}',
  options: { showContent: true }
});

// Execute transaction
const txb = new TransactionBlock();
txb.moveCall({
  target: '{{packageId}}::{{module}}::{{function}}',
  arguments: [{{arguments}}]
});

const result = await client.signAndExecuteTransactionBlock({
  signer: wallet,
  transactionBlock: txb,
});
\`\`\`

## Best Practices
1. Use type-safe clients
2. Implement error handling mechanisms
3. Optimize network requests
4. Cache frequently used data

{{additionalContext}}`,
      ja: `# Dubheクライアント開発ガイド

## クライアント初期化
\`\`\`typescript
import { SuiClient } from '@0xobelisk/sui-client';

const client = new SuiClient({
  url: '{{rpcUrl}}',
  // オプション設定
  requestOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
\`\`\`

## 一般的な操作
\`\`\`typescript
// オブジェクトクエリ
const object = await client.getObject({
  id: '{{objectId}}',
  options: { showContent: true }
});

// トランザクション実行
const txb = new TransactionBlock();
txb.moveCall({
  target: '{{packageId}}::{{module}}::{{function}}',
  arguments: [{{arguments}}]
});

const result = await client.signAndExecuteTransactionBlock({
  signer: wallet,
  transactionBlock: txb,
});
\`\`\`

## ベストプラクティス
1. 型安全なクライアントの使用
2. エラーハンドリングメカニズムの実装
3. ネットワークリクエストの最適化
4. 頻繁に使用されるデータのキャッシュ

{{additionalContext}}`,
      ko: `# Dubhe 클라이언트 개발 가이드

## 클라이언트 초기화
\`\`\`typescript
import { SuiClient } from '@0xobelisk/sui-client';

const client = new SuiClient({
  url: '{{rpcUrl}}',
  // 선택적 구성
  requestOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
\`\`\`

## 일반적인 작업
\`\`\`typescript
// 객체 쿼리
const object = await client.getObject({
  id: '{{objectId}}',
  options: { showContent: true }
});

// 트랜잭션 실행
const txb = new TransactionBlock();
txb.moveCall({
  target: '{{packageId}}::{{module}}::{{function}}',
  arguments: [{{arguments}}]
});

const result = await client.signAndExecuteTransactionBlock({
  signer: wallet,
  transactionBlock: txb,
});
\`\`\`

## 모범 사례
1. 타입 안전한 클라이언트 사용
2. 오류 처리 메커니즘 구현
3. 네트워크 요청 최적화
4. 자주 사용되는 데이터 캐싱

{{additionalContext}}`,
    },
    variables: [
      'rpcUrl',
      'objectId',
      'packageId',
      'module',
      'function',
      'arguments',
      'additionalContext',
    ],
  },
  {
    id: 'dubhe-config',
    name: 'Dubhe 配置管理',
    description: 'Dubhe 项目配置和部署指导',
    category: 'dubhe',
    tags: ['dubhe', 'config', 'deployment'],
    template: {
      zh: `# Dubhe 配置管理指南

## 配置文件结构
\`\`\`json
{
  "name": "{{projectName}}",
  "version": "{{version}}",
  "networks": {
    "mainnet": {
      "url": "{{mainnetUrl}}",
      "faucet": "{{mainnetFaucet}}"
    },
    "testnet": {
      "url": "{{testnetUrl}}",
      "faucet": "{{testnetFaucet}}"
    },
    "devnet": {
      "url": "{{devnetUrl}}",
      "faucet": "{{devnetFaucet}}"
    }
  },
  "accounts": {
    "default": {
      "address": "{{accountAddress}}",
      "privateKey": "{{privateKey}}"
    }
  }
}
\`\`\`

## 环境配置
1. **开发环境**: 使用 devnet 进行开发和测试
2. **测试环境**: 使用 testnet 进行集成测试
3. **生产环境**: 使用 mainnet 进行正式部署

## 部署流程
\`\`\`bash
# 构建项目
pnpm build

# 部署到测试网
pnpm deploy:testnet

# 部署到主网
pnpm deploy:mainnet
\`\`\`

{{additionalContext}}`,
      en: `# Dubhe Configuration Management Guide

## Configuration File Structure
\`\`\`json
{
  "name": "{{projectName}}",
  "version": "{{version}}",
  "networks": {
    "mainnet": {
      "url": "{{mainnetUrl}}",
      "faucet": "{{mainnetFaucet}}"
    },
    "testnet": {
      "url": "{{testnetUrl}}",
      "faucet": "{{testnetFaucet}}"
    },
    "devnet": {
      "url": "{{devnetUrl}}",
      "faucet": "{{devnetFaucet}}"
    }
  },
  "accounts": {
    "default": {
      "address": "{{accountAddress}}",
      "privateKey": "{{privateKey}}"
    }
  }
}
\`\`\`

## Environment Configuration
1. **Development**: Use devnet for development and testing
2. **Testing**: Use testnet for integration testing
3. **Production**: Use mainnet for production deployment

## Deployment Process
\`\`\`bash
# Build project
pnpm build

# Deploy to testnet
pnpm deploy:testnet

# Deploy to mainnet
pnpm deploy:mainnet
\`\`\`

{{additionalContext}}`,
      ja: `# Dubhe設定管理ガイド

## 設定ファイル構造
\`\`\`json
{
  "name": "{{projectName}}",
  "version": "{{version}}",
  "networks": {
    "mainnet": {
      "url": "{{mainnetUrl}}",
      "faucet": "{{mainnetFaucet}}"
    },
    "testnet": {
      "url": "{{testnetUrl}}",
      "faucet": "{{testnetFaucet}}"
    },
    "devnet": {
      "url": "{{devnetUrl}}",
      "faucet": "{{devnetFaucet}}"
    }
  },
  "accounts": {
    "default": {
      "address": "{{accountAddress}}",
      "privateKey": "{{privateKey}}"
    }
  }
}
\`\`\`

## 環境設定
1. **開発環境**: 開発とテストにdevnetを使用
2. **テスト環境**: 統合テストにtestnetを使用
3. **本番環境**: 本番デプロイにmainnetを使用

## デプロイプロセス
\`\`\`bash
# プロジェクトビルド
pnpm build

# テストネットにデプロイ
pnpm deploy:testnet

# メインネットにデプロイ
pnpm deploy:mainnet
\`\`\`

{{additionalContext}}`,
      ko: `# Dubhe 구성 관리 가이드

## 구성 파일 구조
\`\`\`json
{
  "name": "{{projectName}}",
  "version": "{{version}}",
  "networks": {
    "mainnet": {
      "url": "{{mainnetUrl}}",
      "faucet": "{{mainnetFaucet}}"
    },
    "testnet": {
      "url": "{{testnetUrl}}",
      "faucet": "{{testnetFaucet}}"
    },
    "devnet": {
      "url": "{{devnetUrl}}",
      "faucet": "{{devnetFaucet}}"
    }
  },
  "accounts": {
    "default": {
      "address": "{{accountAddress}}",
      "privateKey": "{{privateKey}}"
    }
  }
}
\`\`\`

## 환경 구성
1. **개발 환경**: 개발 및 테스트에 devnet 사용
2. **테스트 환경**: 통합 테스트에 testnet 사용
3. **프로덕션 환경**: 프로덕션 배포에 mainnet 사용

## 배포 프로세스
\`\`\`bash
# 프로젝트 빌드
pnpm build

# 테스트넷에 배포
pnpm deploy:testnet

# 메인넷에 배포
pnpm deploy:mainnet
\`\`\`

{{additionalContext}}`,
    },
    variables: [
      'projectName',
      'version',
      'mainnetUrl',
      'mainnetFaucet',
      'testnetUrl',
      'testnetFaucet',
      'devnetUrl',
      'devnetFaucet',
      'accountAddress',
      'privateKey',
      'additionalContext',
    ],
  },
  {
    id: 'dubhe-testing',
    name: 'Dubhe 测试指南',
    description: 'Dubhe 项目测试策略和最佳实践',
    category: 'dubhe',
    tags: ['dubhe', 'testing', 'quality'],
    template: {
      zh: `# Dubhe 测试指南

## 测试策略
1. **单元测试**: 测试单个函数和组件
2. **集成测试**: 测试模块间的交互
3. **端到端测试**: 测试完整的用户流程
4. **性能测试**: 测试系统性能和负载能力

## 测试工具
\`\`\`typescript
// Jest 配置
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

// 测试示例
describe('SuiClient', () => {
  it('should connect to Sui network', async () => {
    const client = new SuiClient({ url: '{{testRpcUrl}}' });
    const version = await client.getRpcApiVersion();
    expect(version).toBeDefined();
  });
});
\`\`\`

## 测试最佳实践
1. 使用模拟数据进行测试
2. 实现自动化测试流程
3. 保持测试覆盖率 > 80%
4. 定期运行性能测试

{{additionalContext}}`,
      en: `# Dubhe Testing Guide

## Testing Strategy
1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test interactions between modules
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test system performance and load capacity

## Testing Tools
\`\`\`typescript
// Jest configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

// Test example
describe('SuiClient', () => {
  it('should connect to Sui network', async () => {
    const client = new SuiClient({ url: '{{testRpcUrl}}' });
    const version = await client.getRpcApiVersion();
    expect(version).toBeDefined();
  });
});
\`\`\`

## Testing Best Practices
1. Use mock data for testing
2. Implement automated testing workflows
3. Maintain test coverage > 80%
4. Run performance tests regularly

{{additionalContext}}`,
      ja: `# Dubheテストガイド

## テスト戦略
1. **単体テスト**: 個別の関数とコンポーネントをテスト
2. **統合テスト**: モジュール間の相互作用をテスト
3. **エンドツーエンドテスト**: 完全なユーザーワークフローをテスト
4. **パフォーマンステスト**: システムパフォーマンスと負荷能力をテスト

## テストツール
\`\`\`typescript
// Jest設定
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

// テスト例
describe('SuiClient', () => {
  it('should connect to Sui network', async () => {
    const client = new SuiClient({ url: '{{testRpcUrl}}' });
    const version = await client.getRpcApiVersion();
    expect(version).toBeDefined();
  });
});
\`\`\`

## テストベストプラクティス
1. テスト用のモックデータ使用
2. 自動化されたテストワークフローの実装
3. テストカバレッジ > 80%の維持
4. 定期的なパフォーマンステストの実行

{{additionalContext}}`,
      ko: `# Dubhe 테스트 가이드

## 테스트 전략
1. **단위 테스트**: 개별 함수 및 구성 요소 테스트
2. **통합 테스트**: 모듈 간 상호작용 테스트
3. **엔드투엔드 테스트**: 완전한 사용자 워크플로우 테스트
4. **성능 테스트**: 시스템 성능 및 부하 용량 테스트

## 테스트 도구
\`\`\`typescript
// Jest 구성
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

// 테스트 예제
describe('SuiClient', () => {
  it('should connect to Sui network', async () => {
    const client = new SuiClient({ url: '{{testRpcUrl}}' });
    const version = await client.getRpcApiVersion();
    expect(version).toBeDefined();
  });
});
\`\`\`

## 테스트 모범 사례
1. 테스트용 모의 데이터 사용
2. 자동화된 테스트 워크플로우 구현
3. 테스트 커버리지 > 80% 유지
4. 정기적인 성능 테스트 실행

{{additionalContext}}`,
    },
    variables: ['testRpcUrl', 'additionalContext'],
  },
];

// 注册默认 prompt 模板
defaultPrompts.forEach((prompt) => promptRegistry.register(prompt));

// 导出便捷函数
export function registerPrompt(template: PromptTemplate): void {
  promptRegistry.register(template);
}

export function renderPrompt(id: string, context: PromptContext): PromptResult {
  return promptRegistry.render(id, context);
}

export function listPrompts(category?: string): PromptTemplate[] {
  return promptRegistry.list(category);
}

export function searchPrompts(query: string): PromptTemplate[] {
  return promptRegistry.search(query);
}
