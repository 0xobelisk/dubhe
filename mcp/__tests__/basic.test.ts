// dubhe-mcp 基础测试

import {
  callAI,
  getAIModels,
  getAITools,
  initialize,
  logger,
  registerPrompt,
  registerResources,
  renderPrompt,
  t,
} from '../src/index';

describe('Dubhe MCP Basic Tests', () => {
  beforeAll(async () => {
    await initialize({ lang: 'en' });
  });

  describe('Multi-language Resources', () => {
    test('should get welcome message in different languages', () => {
      expect(t('welcome', 'zh')).toBe('欢迎使用 Dubhe MCP AI 助手');
      expect(t('welcome', 'en')).toBe('Welcome to Dubhe MCP AI Assistant');
      expect(t('welcome', 'ja')).toBe('Dubhe MCP AIアシスタントへようこそ');
      expect(t('welcome', 'ko')).toBe(
        'Dubhe MCP AI 어시스턴트에 오신 것을 환영합니다'
      );
    });

    test('should register and use custom resources', () => {
      registerResources({
        'test.hello': {
          zh: '测试你好',
          en: 'Test Hello',
          ja: 'テストこんにちは',
          ko: '테스트 안녕하세요',
        },
      });

      expect(t('test.hello', 'zh')).toBe('测试你好');
      expect(t('test.hello', 'en')).toBe('Test Hello');
    });

    test('should fallback to key when resource not found', () => {
      expect(t('non.existent.key', 'zh')).toBe('non.existent.key');
    });
  });

  describe('Prompt Templates', () => {
    test('should register and render prompt template', () => {
      registerPrompt({
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'A test prompt template',
        template: {
          zh: '你好 {{name}}，今天是 {{date}}',
          en: 'Hello {{name}}, today is {{date}}',
          ja: 'こんにちは {{name}}、今日は {{date}}',
          ko: '안녕하세요 {{name}}, 오늘은 {{date}}',
        },
        variables: ['name', 'date'],
      });

      const result = renderPrompt('test-prompt', {
        lang: 'zh',
        variables: {
          name: '世界',
          date: '2024年1月1日',
        },
      });

      expect(result.content).toBe('你好 世界，今天是 2024年1月1日');
      expect(result.template.id).toBe('test-prompt');
    });

    test('should throw error for non-existent prompt', () => {
      expect(() => {
        renderPrompt('non-existent', {
          lang: 'zh',
          variables: {},
        });
      }).toThrow('Prompt template non-existent not found');
    });

    test('should list prompts', () => {
      const prompts = listPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some((p) => p.id === 'test-prompt')).toBe(true);
    });

    test('should search prompts', () => {
      const results = searchPrompts('test');
      expect(results.some((p) => p.id === 'test-prompt')).toBe(true);
    });
  });

  describe('AI Models and Tools', () => {
    test('should get available AI models', () => {
      const models = getAIModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === 'gpt-4')).toBe(true);
      expect(models.some((m) => m.provider === 'OpenAI')).toBe(true);
    });

    test('should get available AI tools', () => {
      const tools = getAITools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some((t) => t.id === 'code-analyzer')).toBe(true);
    });

    test('should get tools by category', () => {
      const devTools = getAITools('development');
      expect(devTools.length).toBeGreaterThan(0);
      expect(devTools.every((t) => t.category === 'development')).toBe(true);
    });
  });

  describe('AI Call', () => {
    test('should make AI call successfully', async () => {
      const response = await callAI({
        prompt: 'Hello world',
        context: { lang: 'en' },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.model).toBeDefined();
      expect(response.requestId).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    test('should handle AI call with tools', async () => {
      const response = await callAI({
        prompt: 'Analyze this code',
        tools: ['code-analyzer'],
        context: { lang: 'en' },
      });

      expect(response).toBeDefined();
      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
    });
  });

  describe('Logger', () => {
    test('should log messages', () => {
      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warning message');
        logger.error('Test error message');
      }).not.toThrow();
    });
  });
});
