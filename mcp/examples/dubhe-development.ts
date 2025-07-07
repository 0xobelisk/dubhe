#!/usr/bin/env tsx

/**
 * Dubhe/Sui 开发指导示例
 * 展示如何使用 dubhe-mcp 进行专业级开发指导
 */

import { callAI, registerAITool } from '../src/ai';
import logger from '../src/logger';
import { renderPrompt, type PromptContext } from '../src/prompts';
import { setLanguage } from '../src/resources';

// 设置日志级别
logger.setLevel('INFO');

/**
 * Dubhe 项目初始化指导
 */
async function dubheProjectSetup() {
  console.log('🚀 Dubhe 项目初始化指导\n');

  // 设置语言为中文
  setLanguage('zh');

  // 渲染 Dubhe 入门指南
  const context: PromptContext = {
    lang: 'zh',
    variables: {
      projectName: 'my-dubhe-game',
      additionalContext: '这是一个游戏项目，需要包含 NFT 和代币功能',
    },
  };

  try {
    const result = renderPrompt('dubhe-101', context);
    console.log('📋 项目初始化指南:');
    console.log(result.content);
    console.log('\n' + '='.repeat(80) + '\n');

    // 调用 AI 进行进一步指导
    const aiResponse = await callAI({
      model: 'gpt-4',
      prompt: `基于以下 Dubhe 项目信息，提供具体的实施建议：
      
项目名称: ${context.variables.projectName}
项目类型: 游戏项目
功能需求: NFT 和代币功能

请提供：
1. 具体的项目结构建议
2. 需要安装的依赖包
3. 开发步骤和时间规划
4. 可能遇到的挑战和解决方案`,
      temperature: 0.7,
      maxTokens: 1000,
    });

    console.log('🤖 AI 开发建议:');
    console.log(aiResponse.content);
    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    logger.error('项目初始化指导失败', error);
  }
}

/**
 * Sui Move 智能合约开发指导
 */
async function suiContractDevelopment() {
  console.log('📝 Sui Move 智能合约开发指导\n');

  // 渲染合约开发模板
  const context: PromptContext = {
    lang: 'zh',
    variables: {
      packageName: 'my_game',
      moduleName: 'nft_module',
      objectName: 'GameNFT',
      objectFields:
        'name: String,\n        description: String,\n        image_url: String,\n        attributes: vector<u8>',
      additionalContext:
        '这是一个游戏 NFT 合约，需要支持铸造、转移和属性更新功能',
    },
  };

  try {
    const result = renderPrompt('sui-contract', context);
    console.log('📋 智能合约开发指南:');
    console.log(result.content);
    console.log('\n' + '='.repeat(80) + '\n');

    // 调用 AI 进行代码审查和优化
    const aiResponse = await callAI({
      model: 'gpt-4',
      prompt: `请审查以下 Sui Move 合约代码并提供优化建议：

${result.content}

请从以下方面进行分析：
1. 代码结构和设计模式
2. 安全性和权限控制
3. Gas 优化建议
4. 错误处理机制
5. 测试策略建议`,
      temperature: 0.5,
      maxTokens: 1200,
    });

    console.log('🤖 AI 代码审查:');
    console.log(aiResponse.content);
    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    logger.error('合约开发指导失败', error);
  }
}

/**
 * Dubhe 客户端开发指导
 */
async function dubheClientDevelopment() {
  console.log('💻 Dubhe 客户端开发指导\n');

  // 渲染客户端开发模板
  const context: PromptContext = {
    lang: 'zh',
    variables: {
      rpcUrl: 'https://fullnode.testnet.sui.io',
      objectId: '0x1234567890abcdef...',
      packageId: '0x4567890abcdef123...',
      module: 'nft_module',
      function: 'mint_nft',
      arguments:
        'txb.pure("My NFT"), txb.pure("Description"), txb.pure("https://example.com/image.png")',
      additionalContext: '需要实现 NFT 铸造、查询和转移功能',
    },
  };

  try {
    const result = renderPrompt('dubhe-client', context);
    console.log('📋 客户端开发指南:');
    console.log(result.content);
    console.log('\n' + '='.repeat(80) + '\n');

    // 调用 AI 进行最佳实践指导
    const aiResponse = await callAI({
      model: 'gpt-4',
      prompt: `基于以下 Dubhe 客户端开发信息，提供最佳实践建议：

${result.content}

请提供：
1. 错误处理最佳实践
2. 性能优化建议
3. 用户体验优化
4. 安全性考虑
5. 测试策略`,
      temperature: 0.6,
      maxTokens: 1000,
    });

    console.log('🤖 AI 最佳实践建议:');
    console.log(aiResponse.content);
    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    logger.error('客户端开发指导失败', error);
  }
}

/**
 * 配置和部署指导
 */
async function configurationAndDeployment() {
  console.log('⚙️ 配置和部署指导\n');

  // 渲染配置管理模板
  const context: PromptContext = {
    lang: 'zh',
    variables: {
      projectName: 'my-dubhe-game',
      version: '1.0.0',
      mainnetUrl: 'https://fullnode.mainnet.sui.io',
      mainnetFaucet: 'null',
      testnetUrl: 'https://fullnode.testnet.sui.io',
      testnetFaucet: 'https://faucet.testnet.sui.io',
      devnetUrl: 'https://fullnode.devnet.sui.io',
      devnetFaucet: 'https://faucet.devnet.sui.io',
      accountAddress: '0x1234567890abcdef...',
      privateKey: '0xabcdef1234567890...',
      additionalContext: '需要支持多环境部署和自动化 CI/CD 流程',
    },
  };

  try {
    const result = renderPrompt('dubhe-config', context);
    console.log('📋 配置管理指南:');
    console.log(result.content);
    console.log('\n' + '='.repeat(80) + '\n');

    // 调用 AI 进行部署策略指导
    const aiResponse = await callAI({
      model: 'gpt-4',
      prompt: `基于以下配置信息，提供部署策略建议：

${result.content}

请提供：
1. 多环境部署策略
2. CI/CD 流程设计
3. 监控和日志配置
4. 回滚策略
5. 安全配置建议`,
      temperature: 0.5,
      maxTokens: 1000,
    });

    console.log('🤖 AI 部署策略建议:');
    console.log(aiResponse.content);
    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    logger.error('配置部署指导失败', error);
  }
}

/**
 * 测试和质量保证指导
 */
async function testingAndQuality() {
  console.log('🧪 测试和质量保证指导\n');

  // 渲染测试指南模板
  const context: PromptContext = {
    lang: 'zh',
    variables: {
      testRpcUrl: 'https://fullnode.testnet.sui.io',
      additionalContext:
        '需要全面的测试覆盖，包括单元测试、集成测试和端到端测试',
    },
  };

  try {
    const result = renderPrompt('dubhe-testing', context);
    console.log('📋 测试指南:');
    console.log(result.content);
    console.log('\n' + '='.repeat(80) + '\n');

    // 调用 AI 进行测试策略指导
    const aiResponse = await callAI({
      model: 'gpt-4',
      prompt: `基于以下测试信息，提供详细的测试策略：

${result.content}

请提供：
1. 测试用例设计
2. 测试数据管理
3. 自动化测试流程
4. 性能测试方案
5. 质量指标和监控`,
      temperature: 0.6,
      maxTokens: 1000,
    });

    console.log('🤖 AI 测试策略建议:');
    console.log(aiResponse.content);
    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    logger.error('测试指导失败', error);
  }
}

/**
 * 多语言支持演示
 */
async function multiLanguageDemo() {
  console.log('🌍 多语言支持演示\n');

  const languages: Array<'zh' | 'en' | 'ja' | 'ko'> = ['zh', 'en', 'ja', 'ko'];
  const context: PromptContext = {
    lang: 'zh',
    variables: {
      projectName: 'multi-lang-demo',
      additionalContext: '展示多语言支持功能',
    },
  };

  for (const lang of languages) {
    console.log(`\n📝 ${lang.toUpperCase()} 语言版本:`);
    setLanguage(lang);
    context.lang = lang;

    try {
      const result = renderPrompt('dubhe-101', context);
      console.log(result.content.substring(0, 200) + '...');
    } catch (error) {
      logger.error(`${lang} 语言渲染失败`, error);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('🎯 Dubhe/Sui 专业开发指导系统\n');
  console.log('本示例展示如何使用 dubhe-mcp 进行专业级开发指导\n');

  try {
    // 1. 项目初始化指导
    await dubheProjectSetup();

    // 2. 智能合约开发指导
    await suiContractDevelopment();

    // 3. 客户端开发指导
    await dubheClientDevelopment();

    // 4. 配置和部署指导
    await configurationAndDeployment();

    // 5. 测试和质量保证指导
    await testingAndQuality();

    // 6. 多语言支持演示
    await multiLanguageDemo();

    console.log('✅ 所有开发指导示例完成！');
    console.log('\n📚 更多信息请参考:');
    console.log('- Dubhe 官方文档: https://github.com/0xobelisk/dubhe');
    console.log('- Sui 官方文档: https://docs.sui.io/');
    console.log('- Move 语言文档: https://move-language.github.io/move/');
  } catch (error) {
    logger.error('开发指导示例执行失败', error);
    process.exit(1);
  }
}

// 注册自定义 AI 工具
registerAITool({
  name: 'dubhe_code_review',
  description: 'Dubhe 代码审查工具',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '要审查的代码',
      },
      language: {
        type: 'string',
        description: '代码语言 (move/typescript)',
      },
    },
    required: ['code', 'language'],
  },
  handler: async (params: any) => {
    // 模拟代码审查逻辑
    return {
      score: 85,
      issues: ['建议添加更多注释', '考虑优化 Gas 使用'],
      suggestions: ['使用批量操作减少交易次数', '添加输入验证'],
    };
  },
});

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

export {
  configurationAndDeployment,
  dubheClientDevelopment,
  dubheProjectSetup,
  multiLanguageDemo,
  suiContractDevelopment,
  testingAndQuality,
};
