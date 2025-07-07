import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';
import { EventEmitter } from 'events';
import {
  Extension,
  ExtensionContext,
  ExtensionEventEmitter,
  ExtensionLoader,
  ExtensionLogger,
  ExtensionManager,
  ExtensionPoint,
  ExtensionPointContext,
  ExtensionRegistry,
  ExtensionResult,
  ExtensionStatus,
  ExtensionStorage,
} from './types';

/**
 * 拓展管理器实现
 */
export class DefaultExtensionManager implements ExtensionManager {
  private extensions: Map<string, Extension> = new Map();
  private enabledExtensions: Set<string> = new Set();
  private extensionPoints: Map<ExtensionPoint, Set<string>> = new Map();
  private context: ExtensionContext;
  private storage: ExtensionStorage;
  private loader: ExtensionLoader;
  private registry: ExtensionRegistry;
  private logger: ExtensionLogger;
  private events: ExtensionEventEmitter;

  constructor(
    dubhe: Dubhe,
    world: World,
    storage: ExtensionStorage,
    loader: ExtensionLoader,
    registry: ExtensionRegistry,
    logger: ExtensionLogger
  ) {
    this.storage = storage;
    this.loader = loader;
    this.registry = registry;
    this.logger = logger;
    this.events = new EventEmitter() as ExtensionEventEmitter;

    this.context = {
      dubhe,
      world,
      extensionManager: this,
      config: {} as any,
      metadata: {} as any,
      logger,
      events: this.events,
    };

    // 初始化拓展点映射
    Object.values(ExtensionPoint).forEach((point) => {
      this.extensionPoints.set(point, new Set());
    });
  }

  /**
   * 注册拓展
   */
  register(extension: Extension): void {
    const { id } = extension.metadata;

    if (this.extensions.has(id)) {
      throw new Error(`Extension ${id} is already registered`);
    }

    this.logger.info(`Registering extension: ${id}`);
    this.extensions.set(id, extension);
    extension.status = ExtensionStatus.REGISTERED;

    // 注册到拓展点
    extension.metadata.extensionPoints.forEach((point) => {
      const extensionsForPoint = this.extensionPoints.get(point);
      if (extensionsForPoint) {
        extensionsForPoint.add(id);
      }
    });

    // 如果配置为自动启用，则启用拓展
    if (extension.config.enabled !== false) {
      this.enable(id);
    }

    this.events.emit('extension:registered', extension);
    this.logger.info(`Extension ${id} registered successfully`);
  }

  /**
   * 注销拓展
   */
  unregister(extensionId: string): void {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    this.logger.info(`Unregistering extension: ${extensionId}`);

    // 如果拓展已启用，先禁用
    if (this.enabledExtensions.has(extensionId)) {
      this.disable(extensionId);
    }

    // 调用清理钩子
    if (extension.cleanup) {
      try {
        extension.cleanup(this.createExtensionContext(extension));
      } catch (error) {
        this.logger.error(`Error during extension cleanup: ${error}`);
      }
    }

    // 从拓展点中移除
    extension.metadata.extensionPoints.forEach((point) => {
      const extensionsForPoint = this.extensionPoints.get(point);
      if (extensionsForPoint) {
        extensionsForPoint.delete(extensionId);
      }
    });

    this.extensions.delete(extensionId);
    this.enabledExtensions.delete(extensionId);

    this.events.emit('extension:unregistered', extensionId);
    this.logger.info(`Extension ${extensionId} unregistered successfully`);
  }

  /**
   * 启用拓展
   */
  enable(extensionId: string): void {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    if (this.enabledExtensions.has(extensionId)) {
      this.logger.warn(`Extension ${extensionId} is already enabled`);
      return;
    }

    this.logger.info(`Enabling extension: ${extensionId}`);

    try {
      // 调用初始化钩子
      if (extension.initialize) {
        extension.initialize(this.createExtensionContext(extension));
      }

      // 标记为已启用
      this.enabledExtensions.add(extensionId);
      extension.status = ExtensionStatus.ENABLED;

      this.events.emit('extension:enabled', extension);
      this.logger.info(`Extension ${extensionId} enabled successfully`);
    } catch (error) {
      extension.status = ExtensionStatus.ERROR;
      extension.error = error as Error;
      this.logger.error(`Failed to enable extension ${extensionId}: ${error}`);
      throw error;
    }
  }

  /**
   * 禁用拓展
   */
  disable(extensionId: string): void {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    if (!this.enabledExtensions.has(extensionId)) {
      this.logger.warn(`Extension ${extensionId} is not enabled`);
      return;
    }

    this.logger.info(`Disabling extension: ${extensionId}`);

    try {
      // 调用清理钩子
      if (extension.cleanup) {
        extension.cleanup(this.createExtensionContext(extension));
      }

      // 标记为已禁用
      this.enabledExtensions.delete(extensionId);
      extension.status = ExtensionStatus.DISABLED;

      this.events.emit('extension:disabled', extension);
      this.logger.info(`Extension ${extensionId} disabled successfully`);
    } catch (error) {
      this.logger.error(`Failed to disable extension ${extensionId}: ${error}`);
      throw error;
    }
  }

  /**
   * 获取拓展
   */
  getExtension(extensionId: string): Extension | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * 获取所有拓展
   */
  getAllExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * 获取已启用的拓展
   */
  getEnabledExtensions(): Extension[] {
    return Array.from(this.enabledExtensions).map(
      (id) => this.extensions.get(id)!
    );
  }

  /**
   * 检查拓展是否启用
   */
  isEnabled(extensionId: string): boolean {
    return this.enabledExtensions.has(extensionId);
  }

  /**
   * 执行拓展点
   */
  async executeExtensionPoint(
    point: ExtensionPoint,
    context: ExtensionContext
  ): Promise<any[]> {
    const extensionIds = this.extensionPoints.get(point);
    if (!extensionIds || extensionIds.size === 0) {
      return [];
    }

    this.logger.debug(`Executing extension point: ${point}`);

    const results: any[] = [];
    const extensionPointContext: ExtensionPointContext = {
      ...context,
      point,
      results: [],
      continue: true,
      break: () => {
        extensionPointContext.continue = false;
      },
      skip: () => {
        extensionPointContext.continue = false;
      },
    };

    // 获取该拓展点的所有已启用拓展，按优先级排序
    const extensions = Array.from(extensionIds)
      .map((id) => this.extensions.get(id)!)
      .filter((ext) => this.enabledExtensions.has(ext.metadata.id))
      .sort((a, b) => b.metadata.priority - a.metadata.priority);

    for (const extension of extensions) {
      if (!extensionPointContext.continue) {
        break;
      }

      try {
        extension.status = ExtensionStatus.EXECUTING;
        const startTime = Date.now();

        const result = await extension.execute(extensionPointContext);

        const executionTime = Date.now() - startTime;
        const extensionResult: ExtensionResult = {
          extensionId: extension.metadata.id,
          result,
          executionTime,
          success: true,
        };

        extensionPointContext.results.push(extensionResult);
        results.push(result);

        this.logger.debug(
          `Extension ${extension.metadata.id} executed successfully in ${executionTime}ms`
        );

        extension.status = ExtensionStatus.ENABLED;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const extensionResult: ExtensionResult = {
          extensionId: extension.metadata.id,
          result: null,
          executionTime,
          success: false,
          error: error as Error,
        };

        extensionPointContext.results.push(extensionResult);
        extension.status = ExtensionStatus.ERROR;
        extension.error = error as Error;

        this.logger.error(
          `Extension ${extension.metadata.id} execution failed: ${error}`
        );

        // 根据配置决定是否继续执行其他拓展
        if (extension.config.options?.stopOnError) {
          extensionPointContext.break();
        }
      }
    }

    this.events.emit(
      'extension:point:executed',
      point,
      extensionPointContext.results
    );
    return results;
  }

  /**
   * 获取拓展点拓展
   */
  getExtensionsForPoint(point: ExtensionPoint): Extension[] {
    const extensionIds = this.extensionPoints.get(point);
    if (!extensionIds) {
      return [];
    }

    return Array.from(extensionIds)
      .map((id) => this.extensions.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 创建拓展上下文
   */
  private createExtensionContext(extension: Extension): ExtensionContext {
    return {
      ...this.context,
      config: extension.config,
      metadata: extension.metadata,
    };
  }

  /**
   * 获取拓展存储
   */
  getStorage(): ExtensionStorage {
    return this.storage;
  }

  /**
   * 获取事件发射器
   */
  getEvents(): ExtensionEventEmitter {
    return this.events;
  }

  /**
   * 获取日志记录器
   */
  getLogger(): ExtensionLogger {
    return this.logger;
  }

  /**
   * 加载拓展目录
   */
  async loadExtensionsFromDirectory(directory: string): Promise<void> {
    this.logger.info(`Loading extensions from directory: ${directory}`);

    try {
      const extension = await this.loader.load(directory);
      const isValid = await this.loader.validate(extension);

      if (isValid) {
        this.register(extension);
      } else {
        this.logger.error(
          `Extension validation failed: ${extension.metadata.id}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to load extension from ${directory}: ${error}`);
    }
  }

  /**
   * 批量启用拓展
   */
  enableExtensions(extensionIds: string[]): void {
    for (const extensionId of extensionIds) {
      try {
        this.enable(extensionId);
      } catch (error) {
        this.logger.error(
          `Failed to enable extension ${extensionId}: ${error}`
        );
        throw error;
      }
    }
  }

  /**
   * 批量禁用拓展
   */
  disableExtensions(extensionIds: string[]): void {
    for (const extensionId of extensionIds) {
      try {
        this.disable(extensionId);
      } catch (error) {
        this.logger.error(
          `Failed to disable extension ${extensionId}: ${error}`
        );
        throw error;
      }
    }
  }

  /**
   * 获取拓展状态报告
   */
  getStatusReport(): Record<string, any> {
    const report: Record<string, any> = {
      total: this.extensions.size,
      enabled: this.enabledExtensions.size,
      disabled: this.extensions.size - this.enabledExtensions.size,
      extensions: {},
      extensionPoints: {},
    };

    // 拓展状态
    for (const [id, extension] of this.extensions) {
      report.extensions[id] = {
        name: extension.metadata.name,
        version: extension.metadata.version,
        status: extension.status,
        enabled: this.enabledExtensions.has(id),
        error: extension.error?.message,
        extensionPoints: extension.metadata.extensionPoints,
        priority: extension.metadata.priority,
      };
    }

    // 拓展点状态
    for (const [point, extensionIds] of this.extensionPoints) {
      report.extensionPoints[point] = {
        total: extensionIds.size,
        enabled: Array.from(extensionIds).filter((id) =>
          this.enabledExtensions.has(id)
        ).length,
        extensions: Array.from(extensionIds).map(
          (id) => this.extensions.get(id)?.metadata.name
        ),
      };
    }

    return report;
  }

  /**
   * 获取拓展依赖图
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const [id, extension] of this.extensions) {
      graph[id] = extension.config.options?.dependencies || [];
    }

    return graph;
  }

  /**
   * 检查拓展依赖冲突
   */
  checkDependencyConflicts(): string[] {
    const conflicts: string[] = [];
    const graph = this.getDependencyGraph();

    // 这里可以实现依赖冲突检测逻辑
    // 例如：循环依赖、版本冲突等

    return conflicts;
  }

  /**
   * 更新拓展
   */
  async updateExtension(extensionId: string): Promise<void> {
    this.logger.info(`Updating extension: ${extensionId}`);

    try {
      // 禁用拓展
      this.disable(extensionId);

      // 重新加载拓展
      // 这里可以实现拓展更新逻辑

      // 重新启用拓展
      this.enable(extensionId);

      this.logger.info(`Extension ${extensionId} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update extension ${extensionId}: ${error}`);
      throw error;
    }
  }

  /**
   * 备份拓展数据
   */
  async backupExtensionData(extensionId: string): Promise<void> {
    this.logger.info(`Backing up extension data: ${extensionId}`);

    try {
      const keys = await this.storage.keys(extensionId);
      const backup: Record<string, any> = {};

      for (const key of keys) {
        backup[key] = await this.storage.load(extensionId, key);
      }

      await this.storage.save('backup', `${extensionId}_${Date.now()}`, backup);
      this.logger.info(`Extension ${extensionId} data backed up successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to backup extension ${extensionId} data: ${error}`
      );
      throw error;
    }
  }

  /**
   * 恢复拓展数据
   */
  async restoreExtensionData(
    extensionId: string,
    backupId: string
  ): Promise<void> {
    this.logger.info(
      `Restoring extension data: ${extensionId} from ${backupId}`
    );

    try {
      const backup = await this.storage.load('backup', backupId);

      for (const [key, value] of Object.entries(backup)) {
        await this.storage.save(extensionId, key, value);
      }

      this.logger.info(`Extension ${extensionId} data restored successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to restore extension ${extensionId} data: ${error}`
      );
      throw error;
    }
  }
}
