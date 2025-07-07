import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';
import { ConsolePluginLogger } from './ConsolePluginLogger';
import { FileSystemPluginLoader } from './FileSystemPluginLoader';
import { FileSystemPluginStorage } from './FileSystemPluginStorage';
import { DefaultPluginManager } from './PluginManager';
import { DefaultPluginRegistry } from './PluginRegistry';
import {
  Plugin,
  PluginAPI,
  PluginConfig,
  PluginLoader,
  PluginLogger,
  PluginManager,
  PluginRegistry,
  PluginStorage,
} from './types';

/**
 * 插件系统配置
 */
export interface PluginSystemConfig {
  /** 插件目录 */
  pluginDirectory?: string;

  /** 是否自动加载插件 */
  autoLoad?: boolean;

  /** 是否启用插件热重载 */
  hotReload?: boolean;

  /** 插件配置文件路径 */
  configPath?: string;

  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** 插件存储目录 */
  storageDirectory?: string;
}

/**
 * 插件系统主类
 */
export class PluginSystem implements PluginAPI {
  private dubhe: Dubhe;
  private world: World;
  private pluginManager: PluginManager;
  private loader: PluginLoader;
  private storage: PluginStorage;
  private registry: PluginRegistry;
  private logger: PluginLogger;
  private config: PluginSystemConfig;
  private plugins: Map<string, Plugin> = new Map();

  constructor(dubhe: Dubhe, world: World, config: PluginSystemConfig = {}) {
    this.dubhe = dubhe;
    this.world = world;
    this.config = {
      pluginDirectory: './plugins',
      autoLoad: true,
      hotReload: false,
      configPath: './plugin-config.json',
      logLevel: 'info',
      storageDirectory: './plugin-storage',
      ...config,
    };

    // 初始化组件
    this.logger = new ConsolePluginLogger(this.config.logLevel!);
    this.storage = new FileSystemPluginStorage(this.config.storageDirectory!);
    this.loader = new FileSystemPluginLoader(this.logger);
    this.registry = new DefaultPluginRegistry();
    this.pluginManager = new DefaultPluginManager(
      dubhe,
      world,
      this.storage,
      this.loader,
      this.registry,
      this.logger
    );

    this.logger.info('Plugin system initialized');
  }

  /**
   * 启动插件系统
   */
  async start(): Promise<void> {
    this.logger.info('Starting plugin system...');

    try {
      // 加载插件配置
      await this.loadPluginConfig();

      // 自动加载插件
      if (this.config.autoLoad) {
        await this.loadPlugins();
      }

      // 启用热重载
      if (this.config.hotReload) {
        this.enableHotReload();
      }

      this.logger.info('Plugin system started successfully');
    } catch (error) {
      this.logger.error(`Failed to start plugin system: ${error}`);
      throw error;
    }
  }

  /**
   * 停止插件系统
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping plugin system...');

    try {
      // 禁用所有插件
      const enabledPlugins = this.pluginManager.getEnabledPlugins();
      for (const plugin of enabledPlugins) {
        await this.pluginManager.disable(plugin.metadata.id);
      }

      this.logger.info('Plugin system stopped successfully');
    } catch (error) {
      this.logger.error(`Failed to stop plugin system: ${error}`);
      throw error;
    }
  }

  /**
   * 注册插件
   */
  registerPlugin(plugin: Plugin): void {
    this.logger.info(`Registering plugin: ${plugin.metadata.id}`);
    this.pluginManager.register(plugin);
    this.plugins.set(plugin.metadata.id, plugin);
  }

  /**
   * 卸载插件
   */
  unregisterPlugin(pluginId: string): void {
    this.logger.info(`Unregistering plugin: ${pluginId}`);
    this.pluginManager.unregister(pluginId);
    this.plugins.delete(pluginId);
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginId: string): Promise<void> {
    this.logger.info(`Enabling plugin: ${pluginId}`);
    await this.pluginManager.enable(pluginId);
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginId: string): Promise<void> {
    this.logger.info(`Disabling plugin: ${pluginId}`);
    await this.pluginManager.disable(pluginId);
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.pluginManager.getPlugin(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return this.pluginManager.getAllPlugins();
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins(): Plugin[] {
    return this.pluginManager.getEnabledPlugins();
  }

  /**
   * 检查插件是否启用
   */
  isPluginEnabled(pluginId: string): boolean {
    return this.pluginManager.isEnabled(pluginId);
  }

  /**
   * 加载插件目录
   */
  async loadPluginsFromDirectory(directory?: string): Promise<void> {
    const pluginDir = directory || this.config.pluginDirectory!;
    this.logger.info(`Loading plugins from directory: ${pluginDir}`);

    try {
      await this.pluginManager.loadPluginsFromDirectory(pluginDir);
    } catch (error) {
      this.logger.error(`Failed to load plugins from directory: ${error}`);
      throw error;
    }
  }

  /**
   * 批量启用插件
   */
  async enablePlugins(pluginIds: string[]): Promise<void> {
    this.logger.info(`Enabling plugins: ${pluginIds.join(', ')}`);
    await this.pluginManager.enablePlugins(pluginIds);
  }

  /**
   * 批量禁用插件
   */
  async disablePlugins(pluginIds: string[]): Promise<void> {
    this.logger.info(`Disabling plugins: ${pluginIds.join(', ')}`);
    await this.pluginManager.disablePlugins(pluginIds);
  }

  /**
   * 获取插件状态报告
   */
  getStatusReport(): Record<string, any> {
    return this.pluginManager.getStatusReport();
  }

  // PluginAPI 接口实现
  getDubhe(): Dubhe {
    return this.dubhe;
  }

  getWorld(): World {
    return this.world;
  }

  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  getStorage(): PluginStorage {
    return this.storage;
  }

  getEvents(): any {
    return this.pluginManager.getEvents();
  }

  getLogger(): PluginLogger {
    return this.logger;
  }

  /**
   * 加载插件配置
   */
  private async loadPluginConfig(): Promise<void> {
    try {
      const configExists = await this.storage.exists('system', 'config');
      if (configExists) {
        const config = await this.storage.load('system', 'config');
        this.logger.info('Loaded plugin configuration');
        return;
      }

      // 创建默认配置
      const defaultConfig = {
        plugins: [],
        autoEnable: [],
        settings: {},
      };

      await this.storage.save('system', 'config', defaultConfig);
      this.logger.info('Created default plugin configuration');
    } catch (error) {
      this.logger.error(`Failed to load plugin configuration: ${error}`);
    }
  }

  /**
   * 加载插件
   */
  private async loadPlugins(): Promise<void> {
    try {
      await this.loadPluginsFromDirectory();
    } catch (error) {
      this.logger.error(`Failed to load plugins: ${error}`);
    }
  }

  /**
   * 启用热重载
   */
  private enableHotReload(): void {
    this.logger.info('Enabling plugin hot reload');

    // 这里可以实现文件系统监听
    // 当插件文件发生变化时自动重新加载
  }

  /**
   * 验证插件配置
   */
  validatePluginConfig(config: PluginConfig): boolean {
    // 这里可以实现插件配置验证逻辑
    return true;
  }

  /**
   * 获取插件依赖图
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const plugin of this.getAllPlugins()) {
      graph[plugin.metadata.id] = plugin.config.dependencies || [];
    }

    return graph;
  }

  /**
   * 检查插件依赖冲突
   */
  checkDependencyConflicts(): string[] {
    const conflicts: string[] = [];
    const graph = this.getDependencyGraph();

    // 这里可以实现依赖冲突检测逻辑
    // 例如：循环依赖、版本冲突等

    return conflicts;
  }

  /**
   * 更新插件
   */
  async updatePlugin(pluginId: string): Promise<void> {
    this.logger.info(`Updating plugin: ${pluginId}`);

    try {
      // 禁用插件
      await this.disablePlugin(pluginId);

      // 重新加载插件
      // 这里可以实现插件更新逻辑

      // 重新启用插件
      await this.enablePlugin(pluginId);

      this.logger.info(`Plugin ${pluginId} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update plugin ${pluginId}: ${error}`);
      throw error;
    }
  }

  /**
   * 备份插件数据
   */
  async backupPluginData(pluginId: string): Promise<void> {
    this.logger.info(`Backing up plugin data: ${pluginId}`);

    try {
      const keys = await this.storage.keys(pluginId);
      const backup: Record<string, any> = {};

      for (const key of keys) {
        backup[key] = await this.storage.load(pluginId, key);
      }

      await this.storage.save('backup', `${pluginId}_${Date.now()}`, backup);
      this.logger.info(`Plugin ${pluginId} data backed up successfully`);
    } catch (error) {
      this.logger.error(`Failed to backup plugin ${pluginId} data: ${error}`);
      throw error;
    }
  }

  /**
   * 恢复插件数据
   */
  async restorePluginData(pluginId: string, backupId: string): Promise<void> {
    this.logger.info(`Restoring plugin data: ${pluginId} from ${backupId}`);

    try {
      const backup = await this.storage.load('backup', backupId);

      for (const [key, value] of Object.entries(backup)) {
        await this.storage.save(pluginId, key, value);
      }

      this.logger.info(`Plugin ${pluginId} data restored successfully`);
    } catch (error) {
      this.logger.error(`Failed to restore plugin ${pluginId} data: ${error}`);
      throw error;
    }
  }
}
