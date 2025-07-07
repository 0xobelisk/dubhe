import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';
import {
  ExtensionPoint,
  ExtensionPriority,
  ExtensionSystem,
  ValidationExtension,
} from '../src';

/**
 * 拓展系统使用示例
 */
async function extensionSystemExample() {
  console.log('🚀 拓展系统使用示例开始...\n');

  // 1. 创建Dubhe和ECS实例
  const dubhe = new Dubhe({
    network: 'testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io',
  });

  const world = new World();

  // 2. 创建拓展系统
  const extensionSystem = new ExtensionSystem(dubhe, world);

  // 3. 初始化拓展系统
  await extensionSystem.initialize();
  console.log('✅ 拓展系统初始化完成\n');

  // 4. 创建并注册验证拓展
  const validationExtension = new ValidationExtension();
  extensionSystem.register(validationExtension);
  console.log('✅ 验证拓展注册完成\n');

  // 5. 创建自定义拓展
  const customExtension = createCustomExtension();
  extensionSystem.register(customExtension);
  console.log('✅ 自定义拓展注册完成\n');

  // 6. 执行拓展点示例
  await demonstrateExtensionPoints(extensionSystem);

  // 7. 展示拓展管理功能
  await demonstrateExtensionManagement(extensionSystem);

  // 8. 展示拓展统计信息
  await demonstrateExtensionStats(extensionSystem);

  // 9. 清理拓展系统
  await extensionSystem.cleanup();
  console.log('✅ 拓展系统清理完成\n');
}

/**
 * 创建自定义拓展示例
 */
function createCustomExtension() {
  return {
    metadata: {
      id: 'custom-logging-extension',
      name: 'Custom Logging Extension',
      version: '1.0.0',
      description: '自定义日志记录拓展',
      author: 'Developer',
      extensionPoints: [
        ExtensionPoint.LOGGING,
        ExtensionPoint.AFTER_TRANSACTION,
      ],
      priority: ExtensionPriority.NORMAL,
      tags: ['logging', 'custom'],
    },
    config: {
      name: 'Custom Logging Extension',
      version: '1.0.0',
      description: '自定义日志记录拓展',
      author: 'Developer',
      extensionPoints: [
        ExtensionPoint.LOGGING,
        ExtensionPoint.AFTER_TRANSACTION,
      ],
      priority: ExtensionPriority.NORMAL,
      enabled: true,
      options: {
        logLevel: 'info',
        includeTimestamp: true,
        format: 'json',
      },
    },
    status: 'unregistered' as any,
    error: undefined,

    async execute(context: any) {
      const { data, logger } = context;

      logger.info('Custom logging extension executing...');

      const logEntry = {
        timestamp: new Date().toISOString(),
        level: this.config.options.logLevel,
        message: 'Custom log entry',
        data: data,
        extension: this.metadata.name,
      };

      if (this.config.options.format === 'json') {
        console.log(JSON.stringify(logEntry, null, 2));
      } else {
        console.log(
          `[${logEntry.timestamp}] ${logEntry.level.toUpperCase()}: ${logEntry.message}`
        );
      }

      return logEntry;
    },

    async initialize(context: any) {
      const { logger } = context;
      logger.info('Custom logging extension initializing...');
    },

    async cleanup(context: any) {
      const { logger } = context;
      logger.info('Custom logging extension cleaning up...');
    },
  };
}

/**
 * 演示拓展点执行
 */
async function demonstrateExtensionPoints(extensionSystem: ExtensionSystem) {
  console.log('📋 演示拓展点执行...\n');

  // 1. 执行数据验证拓展点
  console.log('🔍 执行数据验证拓展点:');
  const transactionData = {
    type: 'transaction',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x0987654321098765432109876543210987654321',
    amount: '1000000',
    gas: '50000',
  };

  try {
    const validationResults = await extensionSystem.executeExtensionPoint(
      ExtensionPoint.DATA_VALIDATION,
      transactionData
    );
    console.log('✅ 数据验证结果:', validationResults);
  } catch (error) {
    console.log('❌ 数据验证失败:', error);
  }

  // 2. 执行日志记录拓展点
  console.log('\n📝 执行日志记录拓展点:');
  const logData = {
    message: 'Test log message',
    level: 'info',
    timestamp: new Date().toISOString(),
  };

  const loggingResults = await extensionSystem.executeExtensionPoint(
    ExtensionPoint.LOGGING,
    logData
  );
  console.log('✅ 日志记录结果:', loggingResults);

  // 3. 执行交易后处理拓展点
  console.log('\n🔄 执行交易后处理拓展点:');
  const transactionResult = {
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    status: 'success',
    gasUsed: '45000',
    blockNumber: '12345',
  };

  const afterTransactionResults = await extensionSystem.executeExtensionPoint(
    ExtensionPoint.AFTER_TRANSACTION,
    transactionResult
  );
  console.log('✅ 交易后处理结果:', afterTransactionResults);

  console.log('\n');
}

/**
 * 演示拓展管理功能
 */
async function demonstrateExtensionManagement(
  extensionSystem: ExtensionSystem
) {
  console.log('🔧 演示拓展管理功能...\n');

  const manager = extensionSystem.getManager();

  // 1. 获取所有拓展
  const allExtensions = manager.getAllExtensions();
  console.log(
    '📦 所有拓展:',
    allExtensions.map((ext) => ext.metadata.name)
  );

  // 2. 获取已启用的拓展
  const enabledExtensions = manager.getEnabledExtensions();
  console.log(
    '✅ 已启用的拓展:',
    enabledExtensions.map((ext) => ext.metadata.name)
  );

  // 3. 禁用验证拓展
  console.log('\n🚫 禁用验证拓展...');
  manager.disable('validation-extension');
  console.log('✅ 验证拓展已禁用');

  // 4. 重新启用验证拓展
  console.log('\n✅ 重新启用验证拓展...');
  manager.enable('validation-extension');
  console.log('✅ 验证拓展已重新启用');

  // 5. 获取拓展状态报告
  console.log('\n📊 拓展状态报告:');
  const statusReport = manager.getStatusReport();
  console.log(JSON.stringify(statusReport, null, 2));

  console.log('\n');
}

/**
 * 演示拓展统计信息
 */
async function demonstrateExtensionStats(extensionSystem: ExtensionSystem) {
  console.log('📈 演示拓展统计信息...\n');

  // 1. 获取系统信息
  const systemInfo = extensionSystem.getSystemInfo();
  console.log('🖥️ 系统信息:', systemInfo);

  // 2. 获取拓展依赖图
  const dependencyGraph = extensionSystem.getDependencyGraph();
  console.log('\n🔗 拓展依赖图:', dependencyGraph);

  // 3. 检查依赖冲突
  const conflicts = extensionSystem.checkDependencyConflicts();
  console.log('\n⚠️ 依赖冲突检查:', conflicts);

  // 4. 获取拓展点信息
  const manager = extensionSystem.getManager();
  const extensionPoints = [
    ExtensionPoint.DATA_VALIDATION,
    ExtensionPoint.LOGGING,
    ExtensionPoint.AFTER_TRANSACTION,
  ];

  console.log('\n📍 拓展点信息:');
  for (const point of extensionPoints) {
    const extensions = manager.getExtensionsForPoint(point);
    console.log(`${point}: ${extensions.length} 个拓展`);
    extensions.forEach((ext) => {
      console.log(`  - ${ext.metadata.name} (${ext.status})`);
    });
  }

  console.log('\n');
}

/**
 * 演示错误处理
 */
async function demonstrateErrorHandling(extensionSystem: ExtensionSystem) {
  console.log('🚨 演示错误处理...\n');

  // 创建有错误的拓展
  const errorExtension = {
    metadata: {
      id: 'error-extension',
      name: 'Error Extension',
      version: '1.0.0',
      description: '用于演示错误处理的拓展',
      author: 'Developer',
      extensionPoints: [ExtensionPoint.ERROR_HANDLING],
      priority: ExtensionPriority.NORMAL,
    },
    config: {
      name: 'Error Extension',
      version: '1.0.0',
      description: '用于演示错误处理的拓展',
      author: 'Developer',
      extensionPoints: [ExtensionPoint.ERROR_HANDLING],
      priority: ExtensionPriority.NORMAL,
      enabled: true,
      options: {
        stopOnError: false,
      },
    },
    status: 'unregistered' as any,
    error: undefined,

    async execute(context: any) {
      const { logger } = context;
      logger.info('Error extension executing...');

      // 模拟错误
      throw new Error('This is a test error from error extension');
    },
  };

  // 注册错误拓展
  extensionSystem.register(errorExtension);
  console.log('✅ 错误拓展已注册');

  // 执行错误处理拓展点
  console.log('\n🔄 执行错误处理拓展点:');
  try {
    const results = await extensionSystem.executeExtensionPoint(
      ExtensionPoint.ERROR_HANDLING,
      { error: new Error('Test error') }
    );
    console.log('✅ 错误处理结果:', results);
  } catch (error) {
    console.log('❌ 错误处理失败:', error);
  }

  console.log('\n');
}

/**
 * 主函数
 */
async function main() {
  try {
    await extensionSystemExample();
    console.log('🎉 拓展系统示例执行完成！');
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
  }
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
  main();
}

export {
  demonstrateErrorHandling,
  demonstrateExtensionManagement,
  demonstrateExtensionPoints,
  demonstrateExtensionStats,
  extensionSystemExample,
};
