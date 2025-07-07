import {
  defaultPrompts,
  promptRegistry,
  renderPrompt,
  type PromptContext,
} from '../src/prompts';
import { setLanguage } from '../src/resources';

describe('Dubhe/Sui 专业开发指导', () => {
  beforeEach(() => {
    // 注册默认的 prompt 模板
    defaultPrompts.forEach((prompt) => {
      promptRegistry.register(prompt);
    });
  });

  afterEach(() => {
    promptRegistry.clear();
  });

  describe('Dubhe 入门指南', () => {
    it('应该正确渲染 Dubhe 101 模板', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          projectName: 'test-project',
          additionalContext: '测试项目',
        },
      };

      const result = renderPrompt('dubhe-101', context);

      expect(result.content).toContain('Dubhe 开发入门指南');
      expect(result.content).toContain('test-project');
      expect(result.content).toContain('测试项目');
      expect(result.content).toContain('npx create-dubhe@latest');
    });

    it('应该支持多语言', () => {
      const languages: Array<'zh' | 'en' | 'ja' | 'ko'> = [
        'zh',
        'en',
        'ja',
        'ko',
      ];

      languages.forEach((lang) => {
        setLanguage(lang);
        const context: PromptContext = {
          lang,
          variables: {
            projectName: 'multi-lang-test',
            additionalContext: '多语言测试',
          },
        };

        const result = renderPrompt('dubhe-101', context);
        expect(result.content).toBeTruthy();
        expect(result.content.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sui Move 智能合约开发', () => {
    it('应该正确渲染合约开发模板', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          packageName: 'test_package',
          moduleName: 'test_module',
          objectName: 'TestObject',
          objectFields: 'value: u64',
          additionalContext: '测试合约',
        },
      };

      const result = renderPrompt('sui-contract', context);

      expect(result.content).toContain('Sui Move 智能合约开发指南');
      expect(result.content).toContain('test_package');
      expect(result.content).toContain('test_module');
      expect(result.content).toContain('TestObject');
      expect(result.content).toContain('value: u64');
    });

    it('应该包含正确的 Move 语法', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          packageName: 'test_package',
          moduleName: 'test_module',
          objectName: 'TestObject',
          objectFields: 'value: u64',
          additionalContext: '测试合约',
        },
      };

      const result = renderPrompt('sui-contract', context);

      expect(result.content).toContain('module');
      expect(result.content).toContain('use sui::object');
      expect(result.content).toContain('struct');
      expect(result.content).toContain('has key, store');
    });
  });

  describe('Dubhe 客户端开发', () => {
    it('应该正确渲染客户端开发模板', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          rpcUrl: 'https://fullnode.testnet.sui.io',
          objectId: '0x1234567890abcdef',
          packageId: '0x4567890abcdef123',
          module: 'test_module',
          function: 'test_function',
          arguments: 'txb.pure("test")',
          additionalContext: '测试客户端',
        },
      };

      const result = renderPrompt('dubhe-client', context);

      expect(result.content).toContain('Dubhe 客户端开发指南');
      expect(result.content).toContain('https://fullnode.testnet.sui.io');
      expect(result.content).toContain('0x1234567890abcdef');
      expect(result.content).toContain('test_module');
      expect(result.content).toContain('test_function');
    });

    it('应该包含 TypeScript 代码示例', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          rpcUrl: 'https://fullnode.testnet.sui.io',
          objectId: '0x1234567890abcdef',
          packageId: '0x4567890abcdef123',
          module: 'test_module',
          function: 'test_function',
          arguments: 'txb.pure("test")',
          additionalContext: '测试客户端',
        },
      };

      const result = renderPrompt('dubhe-client', context);

      expect(result.content).toContain('import { SuiClient }');
      expect(result.content).toContain('new SuiClient');
      expect(result.content).toContain('TransactionBlock');
      expect(result.content).toContain('moveCall');
    });
  });

  describe('配置和部署', () => {
    it('应该正确渲染配置管理模板', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          projectName: 'test-project',
          version: '1.0.0',
          mainnetUrl: 'https://fullnode.mainnet.sui.io',
          mainnetFaucet: 'null',
          testnetUrl: 'https://fullnode.testnet.sui.io',
          testnetFaucet: 'https://faucet.testnet.sui.io',
          devnetUrl: 'https://fullnode.devnet.sui.io',
          devnetFaucet: 'https://faucet.devnet.sui.io',
          accountAddress: '0x1234567890abcdef',
          privateKey: '0xabcdef1234567890',
          additionalContext: '测试配置',
        },
      };

      const result = renderPrompt('dubhe-config', context);

      expect(result.content).toContain('Dubhe 配置管理指南');
      expect(result.content).toContain('test-project');
      expect(result.content).toContain('1.0.0');
      expect(result.content).toContain('https://fullnode.mainnet.sui.io');
      expect(result.content).toContain('https://fullnode.testnet.sui.io');
    });

    it('应该包含 JSON 配置示例', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          projectName: 'test-project',
          version: '1.0.0',
          mainnetUrl: 'https://fullnode.mainnet.sui.io',
          mainnetFaucet: 'null',
          testnetUrl: 'https://fullnode.testnet.sui.io',
          testnetFaucet: 'https://faucet.testnet.sui.io',
          devnetUrl: 'https://fullnode.devnet.sui.io',
          devnetFaucet: 'https://faucet.devnet.sui.io',
          accountAddress: '0x1234567890abcdef',
          privateKey: '0xabcdef1234567890',
          additionalContext: '测试配置',
        },
      };

      const result = renderPrompt('dubhe-config', context);

      expect(result.content).toContain('{');
      expect(result.content).toContain('"name"');
      expect(result.content).toContain('"version"');
      expect(result.content).toContain('"networks"');
      expect(result.content).toContain('"accounts"');
    });
  });

  describe('测试和质量保证', () => {
    it('应该正确渲染测试指南模板', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          testRpcUrl: 'https://fullnode.testnet.sui.io',
          additionalContext: '测试质量保证',
        },
      };

      const result = renderPrompt('dubhe-testing', context);

      expect(result.content).toContain('Dubhe 测试指南');
      expect(result.content).toContain('https://fullnode.testnet.sui.io');
      expect(result.content).toContain('测试策略');
      expect(result.content).toContain('单元测试');
      expect(result.content).toContain('集成测试');
    });

    it('应该包含 Jest 配置示例', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          testRpcUrl: 'https://fullnode.testnet.sui.io',
          additionalContext: '测试质量保证',
        },
      };

      const result = renderPrompt('dubhe-testing', context);

      expect(result.content).toContain('module.exports');
      expect(result.content).toContain('ts-jest');
      expect(result.content).toContain('testEnvironment');
      expect(result.content).toContain('describe');
      expect(result.content).toContain('it');
    });
  });

  describe('Prompt 模板管理', () => {
    it('应该能够列出所有 Dubhe 相关的 prompt 模板', () => {
      const dubhePrompts = promptRegistry
        .list()
        .filter((p) => p.category === 'dubhe' || p.category === 'sui');

      expect(dubhePrompts.length).toBeGreaterThan(0);

      const promptIds = dubhePrompts.map((p) => p.id);
      expect(promptIds).toContain('dubhe-101');
      expect(promptIds).toContain('sui-contract');
      expect(promptIds).toContain('dubhe-client');
      expect(promptIds).toContain('dubhe-config');
      expect(promptIds).toContain('dubhe-testing');
    });

    it('应该能够搜索 Dubhe 相关的 prompt 模板', () => {
      const searchResults = promptRegistry.search('dubhe');
      expect(searchResults.length).toBeGreaterThan(0);

      const searchResults2 = promptRegistry.search('sui');
      expect(searchResults2.length).toBeGreaterThan(0);
    });

    it('应该能够按分类获取 prompt 模板', () => {
      const dubheCategory = promptRegistry.list('dubhe');
      const suiCategory = promptRegistry.list('sui');

      expect(dubheCategory.length).toBeGreaterThan(0);
      expect(suiCategory.length).toBeGreaterThan(0);
    });
  });

  describe('变量替换', () => {
    it('应该正确替换模板中的变量', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          projectName: 'REPLACED_PROJECT',
          additionalContext: 'REPLACED_CONTEXT',
        },
      };

      const result = renderPrompt('dubhe-101', context);

      expect(result.content).toContain('REPLACED_PROJECT');
      expect(result.content).toContain('REPLACED_CONTEXT');
      expect(result.content).not.toContain('{{projectName}}');
      expect(result.content).not.toContain('{{additionalContext}}');
    });

    it('应该处理缺失的变量', () => {
      const context: PromptContext = {
        lang: 'zh',
        variables: {
          projectName: 'test-project',
          // 故意不提供 additionalContext
        },
      };

      const result = renderPrompt('dubhe-101', context);

      expect(result.content).toContain('test-project');
      expect(result.content).toContain('{{additionalContext}}'); // 未替换的变量应该保留
    });
  });
});
