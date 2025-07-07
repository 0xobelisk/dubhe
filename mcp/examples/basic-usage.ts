// dubhe-mcp 基础使用示例

import {
  callAI,
  getAIModels,
  getAITools,
  initialize,
  registerPrompt,
  registerResources,
  renderPrompt,
  t,
} from '../src/index';

async function basicUsage() {
  console.log('🚀 Dubhe MCP Basic Usage Example\n');

  // 1. 初始化
  console.log('1. Initializing...');
  await initialize({ lang: 'zh' });
  console.log('✅ Initialized successfully\n');

  // 2. 多语言资源使用
  console.log('2. Multi-language Resources:');
  console.log(`中文: ${t('welcome', 'zh')}`);
  console.log(`English: ${t('welcome', 'en')}`);
  console.log(`日本語: ${t('welcome', 'ja')}`);
  console.log(`한국어: ${t('welcome', 'ko')}\n`);

  // 3. 注册自定义资源
  console.log('3. Registering Custom Resources:');
  registerResources({
    'custom.hello': {
      zh: '你好，Dubhe MCP！',
      en: 'Hello, Dubhe MCP!',
      ja: 'こんにちは、Dubhe MCP！',
      ko: '안녕하세요, Dubhe MCP!',
    },
  });
  console.log(`自定义资源: ${t('custom.hello', 'zh')}\n`);

  // 4. Prompt 模板使用
  console.log('4. Prompt Templates:');
  const codeReviewPrompt = renderPrompt('code-review', {
    lang: 'zh',
    variables: {
      code: `
function calculateSum(a, b) {
  return a + b;
}
      `,
    },
  });
  console.log('代码审查 Prompt:');
  console.log(codeReviewPrompt.content);
  console.log();

  // 5. 注册自定义 Prompt
  console.log('5. Registering Custom Prompt:');
  registerPrompt({
    id: 'custom-greeting',
    name: '自定义问候',
    description: '生成个性化问候语',
    category: 'custom',
    template: {
      zh: '你好 {{name}}！今天是 {{date}}，祝你 {{wish}}！',
      en: 'Hello {{name}}! Today is {{date}}, {{wish}}!',
      ja: 'こんにちは {{name}}！今日は {{date}}、{{wish}}！',
      ko: '안녕하세요 {{name}}! 오늘은 {{date}}, {{wish}}!',
    },
    variables: ['name', 'date', 'wish'],
  });

  const greetingPrompt = renderPrompt('custom-greeting', {
    lang: 'zh',
    variables: {
      name: '开发者',
      date: '2024年1月1日',
      wish: '编程愉快',
    },
  });
  console.log('自定义问候 Prompt:');
  console.log(greetingPrompt.content);
  console.log();

  // 6. AI 模型和工具
  console.log('6. AI Models and Tools:');
  const models = getAIModels();
  console.log('Available AI Models:');
  models.forEach((model) => {
    console.log(`  - ${model.name} (${model.provider})`);
  });

  const tools = getAITools();
  console.log('\nAvailable AI Tools:');
  tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // 7. AI 调用示例
  console.log('7. AI Call Example:');
  try {
    const response = await callAI({
      prompt: '请介绍一下 Dubhe 项目',
      model: 'gpt-4',
      context: {
        lang: 'zh',
        sessionId: 'example-session',
      },
    });
    console.log('AI Response:');
    console.log(response.content);
    console.log(`Model: ${response.model}`);
    console.log(`Request ID: ${response.requestId}`);
  } catch (error) {
    console.log('AI call failed (expected in demo):', error.message);
  }
  console.log();

  // 8. 错误处理示例
  console.log('8. Error Handling:');
  try {
    renderPrompt('non-existent-prompt', {
      lang: 'zh',
      variables: {},
    });
  } catch (error) {
    console.log('Expected error caught:', error.message);
  }
  console.log();

  console.log('🎉 Basic usage example completed!');
}

// 运行示例
basicUsage().catch((error) => {
  console.error('Example failed:', error);
  process.exit(1);
});
