#!/usr/bin/env tsx

/**
 * Walrus插件集成示例
 *
 * 这个示例展示了如何在Dubhe项目中使用Walrus插件
 * 来集成Walrus NFT平台的功能。
 */

import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';
import { PluginSystem, WalrusPlugin, WalrusPluginConfig } from '../src';

// 示例配置
const WALRUS_CONFIG: WalrusPluginConfig = {
  apiEndpoint: 'https://api.walrus.xyz',
  apiKey: process.env.WALRUS_API_KEY || 'your-api-key',
  network: 'mainnet',
  timeout: 30000,
  retries: 3,
  enableCache: true,
  cacheExpiry: 300,
};

// 插件系统配置
const PLUGIN_SYSTEM_CONFIG = {
  pluginDirectory: './plugins',
  autoLoad: true,
  hotReload: true,
  logLevel: 'info' as const,
  storageDirectory: './plugin-storage',
};

/**
 * 主函数
 */
async function main() {
  console.log('🚀 启动Walrus插件集成示例...');

  try {
    // 1. 初始化Dubhe和ECS世界
    console.log('📦 初始化Dubhe和ECS世界...');
    const dubhe = new Dubhe({
      networkType: 'mainnet',
      fullnodeUrls: ['https://sui-mainnet.blockvision.org'],
    });
    const world = new World();

    // 2. 创建插件系统
    console.log('🔌 创建插件系统...');
    const pluginSystem = new PluginSystem(dubhe, world, PLUGIN_SYSTEM_CONFIG);

    // 3. 启动插件系统
    console.log('▶️ 启动插件系统...');
    await pluginSystem.start();

    // 4. 创建Walrus插件
    console.log('🐋 创建Walrus插件...');
    const walrusPlugin = new WalrusPlugin(WALRUS_CONFIG);

    // 5. 注册插件
    console.log('📝 注册Walrus插件...');
    pluginSystem.registerPlugin(walrusPlugin);

    // 6. 启用插件
    console.log('✅ 启用Walrus插件...');
    await pluginSystem.enablePlugin('walrus-plugin');

    // 7. 演示插件功能
    await demonstrateWalrusFeatures(walrusPlugin);

    // 8. 演示插件系统功能
    await demonstratePluginSystemFeatures(pluginSystem);

    // 9. 清理资源
    console.log('🧹 清理资源...');
    await pluginSystem.stop();

    console.log('🎉 Walrus插件集成示例完成！');
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    process.exit(1);
  }
}

/**
 * 演示Walrus插件功能
 */
async function demonstrateWalrusFeatures(walrusPlugin: WalrusPlugin) {
  console.log('\n🔍 演示Walrus插件功能...');

  try {
    // 示例NFT合约地址和Token ID
    const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const tokenId = '123';

    // 1. 获取NFT元数据
    console.log('📋 获取NFT元数据...');
    const metadata = await walrusPlugin.getNFTMetadata(
      tokenId,
      contractAddress
    );
    if (metadata) {
      console.log('✅ NFT元数据:', {
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        owner: metadata.owner,
      });
    } else {
      console.log('⚠️ 未找到NFT元数据');
    }

    // 2. 获取用户NFT列表
    console.log('👤 获取用户NFT列表...');
    const userAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    const userNFTs = await walrusPlugin.getUserNFTs(userAddress, 10, 0);
    console.log(`✅ 用户NFT数量: ${userNFTs.length}`);

    // 3. 搜索NFT
    console.log('🔍 搜索NFT...');
    const searchResults = await walrusPlugin.searchNFTs('Bored Ape', {
      collection: 'Bored Ape Yacht Club',
      minPrice: 10,
      maxPrice: 100,
    });
    console.log(`✅ 搜索结果数量: ${searchResults.length}`);

    // 4. 获取NFT价格
    console.log('💰 获取NFT价格...');
    const priceInfo = await walrusPlugin.getNFTPrice(tokenId, contractAddress);
    if (priceInfo) {
      console.log('✅ NFT价格信息:', {
        price: priceInfo.price,
        currency: priceInfo.currency,
        lastUpdated: priceInfo.lastUpdated,
      });
    } else {
      console.log('⚠️ 未找到价格信息');
    }
  } catch (error) {
    console.error('❌ Walrus功能演示失败:', error);
  }
}

/**
 * 演示插件系统功能
 */
async function demonstratePluginSystemFeatures(pluginSystem: PluginSystem) {
  console.log('\n🔧 演示插件系统功能...');

  try {
    // 1. 获取插件状态报告
    console.log('📊 获取插件状态报告...');
    const statusReport = pluginSystem.getStatusReport();
    console.log('✅ 插件状态报告:', statusReport);

    // 2. 检查插件是否启用
    console.log('🔍 检查插件状态...');
    const isEnabled = pluginSystem.isPluginEnabled('walrus-plugin');
    console.log(`✅ Walrus插件是否启用: ${isEnabled}`);

    // 3. 获取所有插件
    console.log('📋 获取所有插件...');
    const allPlugins = pluginSystem.getAllPlugins();
    console.log(`✅ 插件总数: ${allPlugins.length}`);

    // 4. 获取已启用的插件
    console.log('✅ 获取已启用的插件...');
    const enabledPlugins = pluginSystem.getEnabledPlugins();
    console.log(`✅ 已启用插件数量: ${enabledPlugins.length}`);

    // 5. 获取插件依赖图
    console.log('🔗 获取插件依赖图...');
    const dependencyGraph = pluginSystem.getDependencyGraph();
    console.log('✅ 插件依赖图:', dependencyGraph);

    // 6. 检查依赖冲突
    console.log('⚠️ 检查依赖冲突...');
    const conflicts = pluginSystem.checkDependencyConflicts();
    if (conflicts.length > 0) {
      console.log('❌ 发现依赖冲突:', conflicts);
    } else {
      console.log('✅ 无依赖冲突');
    }

    // 7. 演示插件存储功能
    console.log('💾 演示插件存储功能...');
    const storage = pluginSystem.getStorage();

    // 保存数据
    await storage.save('walrus-plugin', 'last-search', {
      query: 'Bored Ape',
      timestamp: new Date().toISOString(),
    });
    console.log('✅ 数据已保存');

    // 加载数据
    const savedData = await storage.load('walrus-plugin', 'last-search');
    console.log('✅ 加载的数据:', savedData);

    // 检查数据是否存在
    const exists = await storage.exists('walrus-plugin', 'last-search');
    console.log(`✅ 数据是否存在: ${exists}`);

    // 8. 演示事件系统
    console.log('📡 演示事件系统...');
    const events = pluginSystem.getEvents();

    // 监听事件
    events.on('plugin:enabled', (plugin) => {
      console.log(`🎉 插件已启用: ${plugin.metadata.name}`);
    });

    events.on('plugin:disabled', (plugin) => {
      console.log(`🛑 插件已禁用: ${plugin.metadata.name}`);
    });

    // 发射事件
    events.emit('custom:event', { message: 'Hello from plugin system!' });
  } catch (error) {
    console.error('❌ 插件系统功能演示失败:', error);
  }
}

/**
 * 演示插件热重载功能
 */
async function demonstrateHotReload(pluginSystem: PluginSystem) {
  console.log('\n🔄 演示插件热重载功能...');

  try {
    // 注意：热重载功能需要文件系统监听
    // 这里只是演示概念
    console.log('📁 监听插件文件变化...');
    console.log('💡 当插件文件发生变化时，系统会自动重新加载插件');

    // 模拟文件变化
    setTimeout(() => {
      console.log('📝 检测到插件文件变化，重新加载中...');
    }, 2000);
  } catch (error) {
    console.error('❌ 热重载演示失败:', error);
  }
}

/**
 * 演示错误处理
 */
async function demonstrateErrorHandling(pluginSystem: PluginSystem) {
  console.log('\n🚨 演示错误处理...');

  try {
    // 尝试启用不存在的插件
    console.log('⚠️ 尝试启用不存在的插件...');
    try {
      await pluginSystem.enablePlugin('non-existent-plugin');
    } catch (error) {
      console.log('✅ 正确捕获错误:', error.message);
    }

    // 尝试获取不存在的插件
    console.log('⚠️ 尝试获取不存在的插件...');
    const plugin = pluginSystem.getPlugin('non-existent-plugin');
    if (!plugin) {
      console.log('✅ 正确返回undefined');
    }
  } catch (error) {
    console.error('❌ 错误处理演示失败:', error);
  }
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

export { demonstratePluginSystemFeatures, demonstrateWalrusFeatures, main };
