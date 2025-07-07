import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';
import { DefaultExtensionManager } from './ExtensionManager';
import {
  Extension,
  ExtensionAPI,
  ExtensionContext,
  ExtensionEventEmitter,
  ExtensionLoader,
  ExtensionLogger,
  ExtensionManager,
  ExtensionPoint,
  ExtensionRegistry,
  ExtensionStorage,
} from './types';

/**
 * 默认日志记录器实现
 */
class DefaultExtensionLogger implements ExtensionLogger {
  debug(message: string, ...args: any[]): void {
    console.debug(`[Extension] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[Extension] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[Extension] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[Extension] ${message}`, ...args);
  }

  fatal(message: string, ...args: any[]): void {
    console.error(`[Extension] FATAL: ${message}`, ...args);
  }
}

/**
 * 默认存储实现
 */
class DefaultExtensionStorage implements ExtensionStorage {
  private storage: Map<string, Map<string, any>> = new Map();

  async save(extensionId: string, key: string, data: any): Promise<void> {
    if (!this.storage.has(extensionId)) {
      this.storage.set(extensionId, new Map());
    }
    this.storage.get(extensionId)!.set(key, data);
  }

  async load(extensionId: string, key: string): Promise<any> {
    return this.storage.get(extensionId)?.get(key);
  }

  async delete(extensionId: string, key: string): Promise<void> {
    this.storage.get(extensionId)?.delete(key);
  }

  async exists(extensionId: string, key: string): Promise<boolean> {
    return this.storage.get(extensionId)?.has(key) || false;
  }

  async keys(extensionId: string): Promise<string[]> {
    return Array.from(this.storage.get(extensionId)?.keys() || []);
  }
}

/**
 * 默认加载器实现
 */
class DefaultExtensionLoader implements ExtensionLoader {
  async load(extensionPath: string): Promise<Extension> {
    // 这里可以实现从文件系统加载拓展的逻辑
    throw new Error('DefaultExtensionLoader.load() not implemented');
  }

  async validate(extension: Extension): Promise<boolean> {
    // 基本验证逻辑
    return !!(
      extension.metadata &&
      extension.metadata.id &&
      extension.metadata.name &&
      extension.metadata.version &&
      extension.execute
    );
  }

  async getInfo(extensionPath: string): Promise<any> {
    // 获取拓展信息
    throw new Error('DefaultExtensionLoader.getInfo() not implemented');
  }
}

/**
 * 默认注册表实现
 */
class DefaultExtensionRegistry implements ExtensionRegistry {
  private factories: Map<string, any> = new Map();

  registerFactory(name: string, factory: any): void {
    this.factories.set(name, factory);
  }

  getFactory(name: string): any {
    return this.factories.get(name);
  }

  create(name: string, config: any): Extension {
    const factory = this.getFactory(name);
    if (!factory) {
      throw new Error(`Extension factory not found: ${name}`);
    }
    return factory.create(config);
  }

  listAvailable(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * 拓展系统主类
 */
export class ExtensionSystem {
  private dubhe: Dubhe;
  private world: World;
  private manager: ExtensionManager;
  private logger: ExtensionLogger;
  private storage: ExtensionStorage;
  private loader: ExtensionLoader;
  private registry: ExtensionRegistry;
  private events: ExtensionEventEmitter;
  private api: ExtensionAPI;
  private isInitialized = false;

  constructor(dubhe: Dubhe, world: World) {
    this.dubhe = dubhe;
    this.world = world;

    // 初始化默认组件
    this.logger = new DefaultExtensionLogger();
    this.storage = new DefaultExtensionStorage();
    this.loader = new DefaultExtensionLoader();
    this.registry = new DefaultExtensionRegistry();
    this.events =
      new (require('events').EventEmitter)() as ExtensionEventEmitter;

    // 创建拓展管理器
    this.manager = new DefaultExtensionManager(
      dubhe,
      world,
      this.storage,
      this.loader,
      this.registry,
      this.logger
    );

    // 创建API接口
    this.api = {
      getDubhe: () => this.dubhe,
      getWorld: () => this.world,
      getExtensionManager: () => this.manager,
      getStorage: () => this.storage,
      getEvents: () => this.events,
      getLogger: () => this.logger,
    };
  }

  /**
   * 初始化拓展系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Extension system already initialized');
      return;
    }

    this.logger.info('Initializing extension system...');

    try {
      // 注册默认拓展
      await this.registerDefaultExtensions();

      // 加载配置的拓展
      await this.loadConfiguredExtensions();

      // 设置事件监听器
      this.setupEventListeners();

      this.isInitialized = true;
      this.logger.info('Extension system initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize extension system: ${error}`);
      throw error;
    }
  }

  /**
   * 注册默认拓展
   */
  private async registerDefaultExtensions(): Promise<void> {
    this.logger.info('Registering default extensions...');

    // 这里可以注册一些默认的拓展
    // 例如：日志拓展、监控拓展等
  }

  /**
   * 加载配置的拓展
   */
  private async loadConfiguredExtensions(): Promise<void> {
    this.logger.info('Loading configured extensions...');

    // 这里可以从配置文件加载拓展
    // 例如：从 dubhe.config.json 中读取拓展配置
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.events.on('extension:registered', (extension: Extension) => {
      this.logger.info(`Extension registered: ${extension.metadata.name}`);
    });

    this.events.on('extension:enabled', (extension: Extension) => {
      this.logger.info(`Extension enabled: ${extension.metadata.name}`);
    });

    this.events.on('extension:disabled', (extension: Extension) => {
      this.logger.info(`Extension disabled: ${extension.metadata.name}`);
    });

    this.events.on(
      'extension:point:executed',
      (point: ExtensionPoint, results: any[]) => {
        this.logger.debug(
          `Extension point executed: ${point} with ${results.length} results`
        );
      }
    );
  }

  /**
   * 注册拓展
   */
  register(extension: Extension): void {
    this.manager.register(extension);
  }

  /**
   * 注销拓展
   */
  unregister(extensionId: string): void {
    this.manager.unregister(extensionId);
  }

  /**
   * 启用拓展
   */
  enable(extensionId: string): void {
    this.manager.enable(extensionId);
  }

  /**
   * 禁用拓展
   */
  disable(extensionId: string): void {
    this.manager.disable(extensionId);
  }

  /**
   * 执行拓展点
   */
  async executeExtensionPoint(
    point: ExtensionPoint,
    data?: any
  ): Promise<any[]> {
    const context: ExtensionContext = {
      dubhe: this.dubhe,
      world: this.world,
      extensionManager: this.manager,
      config: {} as any,
      metadata: {} as any,
      logger: this.logger,
      events: this.events,
      data,
    };

    return this.manager.executeExtensionPoint(point, context);
  }

  /**
   * 获取拓展管理器
   */
  getManager(): ExtensionManager {
    return this.manager;
  }

  /**
   * 获取API接口
   */
  getAPI(): ExtensionAPI {
    return this.api;
  }

  /**
   * 获取日志记录器
   */
  getLogger(): ExtensionLogger {
    return this.logger;
  }

  /**
   * 获取事件发射器
   */
  getEvents(): ExtensionEventEmitter {
    return this.events;
  }

  /**
   * 获取存储接口
   */
  getStorage(): ExtensionStorage {
    return this.storage;
  }

  /**
   * 获取拓展状态报告
   */
  getStatusReport(): Record<string, any> {
    return this.manager.getStatusReport();
  }

  /**
   * 批量启用拓展
   */
  enableExtensions(extensionIds: string[]): void {
    this.manager.enableExtensions(extensionIds);
  }

  /**
   * 批量禁用拓展
   */
  disableExtensions(extensionIds: string[]): void {
    this.manager.disableExtensions(extensionIds);
  }

  /**
   * 加载拓展目录
   */
  async loadExtensionsFromDirectory(directory: string): Promise<void> {
    await this.manager.loadExtensionsFromDirectory(directory);
  }

  /**
   * 更新拓展
   */
  async updateExtension(extensionId: string): Promise<void> {
    await this.manager.updateExtension(extensionId);
  }

  /**
   * 备份拓展数据
   */
  async backupExtensionData(extensionId: string): Promise<void> {
    await this.manager.backupExtensionData(extensionId);
  }

  /**
   * 恢复拓展数据
   */
  async restoreExtensionData(
    extensionId: string,
    backupId: string
  ): Promise<void> {
    await this.manager.restoreExtensionData(extensionId, backupId);
  }

  /**
   * 检查拓展依赖冲突
   */
  checkDependencyConflicts(): string[] {
    return this.manager.checkDependencyConflicts();
  }

  /**
   * 获取拓展依赖图
   */
  getDependencyGraph(): Record<string, string[]> {
    return this.manager.getDependencyGraph();
  }

  /**
   * 清理拓展系统
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up extension system...');

    try {
      // 禁用所有拓展
      const enabledExtensions = this.manager.getEnabledExtensions();
      for (const extension of enabledExtensions) {
        try {
          this.disable(extension.metadata.id);
        } catch (error) {
          this.logger.error(
            `Failed to disable extension ${extension.metadata.id}: ${error}`
          );
        }
      }

      // 移除所有事件监听器
      this.events.removeAllListeners();

      this.isInitialized = false;
      this.logger.info('Extension system cleaned up successfully');
    } catch (error) {
      this.logger.error(`Failed to cleanup extension system: ${error}`);
      throw error;
    }
  }

  /**
   * 检查系统是否已初始化
   */
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取系统信息
   */
  getSystemInfo(): Record<string, any> {
    return {
      initialized: this.isInitialized,
      dubheVersion: this.dubhe.version,
      worldId: this.world.id,
      totalExtensions: this.manager.getAllExtensions().length,
      enabledExtensions: this.manager.getEnabledExtensions().length,
      extensionPoints: Object.values(ExtensionPoint).length,
    };
  }
}
