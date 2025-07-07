import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';
import { EventEmitter } from 'events';
import {
  Plugin,
  PluginContext,
  PluginEventEmitter,
  PluginLoader,
  PluginLogger,
  PluginManager,
  PluginRegistry,
  PluginStatus,
  PluginStorage,
} from './types';

/**
 * 插件管理器实现
 */
export class DefaultPluginManager implements PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private pluginDependencies: Map<string, string[]> = new Map();
  private context: PluginContext;
  private storage: PluginStorage;
  private loader: PluginLoader;
  private registry: PluginRegistry;
  private logger: PluginLogger;
  private events: PluginEventEmitter;

  constructor(
    dubhe: Dubhe,
    world: World,
    storage: PluginStorage,
    loader: PluginLoader,
    registry: PluginRegistry,
    logger: PluginLogger
  ) {
    this.storage = storage;
    this.loader = loader;
    this.registry = registry;
    this.logger = logger;
    this.events = new EventEmitter() as PluginEventEmitter;

    this.context = {
      dubhe,
      world,
      pluginManager: this,
      config: {} as any,
      metadata: {} as any,
      logger,
      events: this.events,
    };
  }

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    const { id } = plugin.metadata;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} is already registered`);
    }

    this.logger.info(`Registering plugin: ${id}`);
    this.plugins.set(id, plugin);
    plugin.status = PluginStatus.INSTALLED;

    // 记录依赖关系
    if (plugin.config.dependencies) {
      this.pluginDependencies.set(id, plugin.config.dependencies);
    }

    this.events.emit('plugin:registered', plugin);
    this.logger.info(`Plugin ${id} registered successfully`);
  }

  /**
   * 卸载插件
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // 检查是否有其他插件依赖此插件
    for (const [id, dependencies] of this.pluginDependencies) {
      if (dependencies.includes(pluginId) && this.enabledPlugins.has(id)) {
        throw new Error(
          `Cannot unregister plugin ${pluginId}: plugin ${id} depends on it`
        );
      }
    }

    this.logger.info(`Unregistering plugin: ${pluginId}`);

    // 如果插件已启用，先禁用
    if (this.enabledPlugins.has(pluginId)) {
      this.disable(pluginId);
    }

    // 调用卸载钩子
    if (plugin.onUninstall) {
      try {
        plugin.onUninstall(this.createPluginContext(plugin));
      } catch (error) {
        this.logger.error(`Error during plugin uninstall: ${error}`);
      }
    }

    this.plugins.delete(pluginId);
    this.enabledPlugins.delete(pluginId);
    this.pluginDependencies.delete(pluginId);

    this.events.emit('plugin:unregistered', pluginId);
    this.logger.info(`Plugin ${pluginId} unregistered successfully`);
  }

  /**
   * 启用插件
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.enabledPlugins.has(pluginId)) {
      this.logger.warn(`Plugin ${pluginId} is already enabled`);
      return;
    }

    this.logger.info(`Enabling plugin: ${pluginId}`);

    try {
      // 解析依赖
      await this.resolveDependencies(pluginId);

      // 设置插件状态为加载中
      plugin.status = PluginStatus.LOADING;

      // 创建插件上下文
      const context = this.createPluginContext(plugin);

      // 调用启用钩子
      if (plugin.onEnable) {
        await plugin.onEnable(context);
      }

      // 标记为已启用
      this.enabledPlugins.add(pluginId);
      plugin.status = PluginStatus.ENABLED;

      this.events.emit('plugin:enabled', plugin);
      this.logger.info(`Plugin ${pluginId} enabled successfully`);
    } catch (error) {
      plugin.status = PluginStatus.ERROR;
      plugin.error = error as Error;
      this.logger.error(`Failed to enable plugin ${pluginId}: ${error}`);
      throw error;
    }
  }

  /**
   * 禁用插件
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!this.enabledPlugins.has(pluginId)) {
      this.logger.warn(`Plugin ${pluginId} is not enabled`);
      return;
    }

    this.logger.info(`Disabling plugin: ${pluginId}`);

    try {
      // 检查是否有其他启用的插件依赖此插件
      for (const [id, dependencies] of this.pluginDependencies) {
        if (dependencies.includes(pluginId) && this.enabledPlugins.has(id)) {
          throw new Error(
            `Cannot disable plugin ${pluginId}: plugin ${id} depends on it`
          );
        }
      }

      // 创建插件上下文
      const context = this.createPluginContext(plugin);

      // 调用禁用钩子
      if (plugin.onDisable) {
        await plugin.onDisable(context);
      }

      // 标记为已禁用
      this.enabledPlugins.delete(pluginId);
      plugin.status = PluginStatus.DISABLED;

      this.events.emit('plugin:disabled', plugin);
      this.logger.info(`Plugin ${pluginId} disabled successfully`);
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginId}: ${error}`);
      throw error;
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.enabledPlugins).map((id) => this.plugins.get(id)!);
  }

  /**
   * 检查插件是否启用
   */
  isEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  /**
   * 获取插件依赖
   */
  getDependencies(pluginId: string): Plugin[] {
    const dependencies = this.pluginDependencies.get(pluginId) || [];
    return dependencies
      .map((depId) => this.plugins.get(depId))
      .filter(Boolean) as Plugin[];
  }

  /**
   * 解析插件依赖
   */
  async resolveDependencies(pluginId: string): Promise<void> {
    const dependencies = this.pluginDependencies.get(pluginId) || [];

    for (const depId of dependencies) {
      const depPlugin = this.plugins.get(depId);
      if (!depPlugin) {
        throw new Error(
          `Dependency plugin ${depId} not found for plugin ${pluginId}`
        );
      }

      // 如果依赖插件未启用，先启用它
      if (!this.enabledPlugins.has(depId)) {
        await this.enable(depId);
      }
    }
  }

  /**
   * 创建插件上下文
   */
  private createPluginContext(plugin: Plugin): PluginContext {
    return {
      ...this.context,
      config: plugin.config,
      metadata: plugin.metadata,
    };
  }

  /**
   * 获取插件存储
   */
  getStorage(): PluginStorage {
    return this.storage;
  }

  /**
   * 获取事件发射器
   */
  getEvents(): PluginEventEmitter {
    return this.events;
  }

  /**
   * 获取日志记录器
   */
  getLogger(): PluginLogger {
    return this.logger;
  }

  /**
   * 加载插件目录
   */
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    this.logger.info(`Loading plugins from directory: ${directory}`);

    try {
      const plugin = await this.loader.load(directory);
      const isValid = await this.loader.validate(plugin);

      if (isValid) {
        this.register(plugin);
      } else {
        this.logger.error(`Plugin validation failed: ${plugin.metadata.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${directory}: ${error}`);
    }
  }

  /**
   * 批量启用插件
   */
  async enablePlugins(pluginIds: string[]): Promise<void> {
    for (const pluginId of pluginIds) {
      try {
        await this.enable(pluginId);
      } catch (error) {
        this.logger.error(`Failed to enable plugin ${pluginId}: ${error}`);
        throw error;
      }
    }
  }

  /**
   * 批量禁用插件
   */
  async disablePlugins(pluginIds: string[]): Promise<void> {
    for (const pluginId of pluginIds) {
      try {
        await this.disable(pluginId);
      } catch (error) {
        this.logger.error(`Failed to disable plugin ${pluginId}: ${error}`);
        throw error;
      }
    }
  }

  /**
   * 获取插件状态报告
   */
  getStatusReport(): Record<string, any> {
    const report: Record<string, any> = {
      total: this.plugins.size,
      enabled: this.enabledPlugins.size,
      disabled: this.plugins.size - this.enabledPlugins.size,
      plugins: {},
    };

    for (const [id, plugin] of this.plugins) {
      report.plugins[id] = {
        name: plugin.metadata.name,
        version: plugin.metadata.version,
        status: plugin.status,
        enabled: this.enabledPlugins.has(id),
        error: plugin.error?.message,
      };
    }

    return report;
  }
}
