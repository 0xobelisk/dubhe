import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';

/**
 * 插件生命周期钩子
 */
export interface PluginLifecycle {
  /** 插件安装时调用 */
  onInstall?(context: PluginContext): Promise<void> | void;

  /** 插件启用时调用 */
  onEnable?(context: PluginContext): Promise<void> | void;

  /** 插件禁用时调用 */
  onDisable?(context: PluginContext): Promise<void> | void;

  /** 插件卸载时调用 */
  onUninstall?(context: PluginContext): Promise<void> | void;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** Dubhe实例 */
  dubhe: Dubhe;

  /** ECS世界实例 */
  world: World;

  /** 插件管理器 */
  pluginManager: PluginManager;

  /** 插件配置 */
  config: PluginConfig;

  /** 插件元数据 */
  metadata: PluginMetadata;

  /** 日志记录器 */
  logger: PluginLogger;

  /** 事件发射器 */
  events: PluginEventEmitter;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  /** 插件名称 */
  name: string;

  /** 插件版本 */
  version: string;

  /** 插件描述 */
  description?: string;

  /** 插件作者 */
  author?: string;

  /** 插件依赖 */
  dependencies?: string[];

  /** 插件配置选项 */
  options?: Record<string, any>;

  /** 环境变量 */
  env?: Record<string, string>;

  /** API密钥配置 */
  apiKeys?: Record<string, string>;
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  /** 插件ID */
  id: string;

  /** 插件名称 */
  name: string;

  /** 插件版本 */
  version: string;

  /** 插件描述 */
  description?: string;

  /** 插件作者 */
  author?: string;

  /** 插件主页 */
  homepage?: string;

  /** 插件许可证 */
  license?: string;

  /** 插件标签 */
  tags?: string[];

  /** 插件图标 */
  icon?: string;

  /** 插件截图 */
  screenshots?: string[];

  /** 插件依赖 */
  dependencies?: PluginDependency[];

  /** 插件兼容性 */
  compatibility?: {
    dubhe?: string;
    node?: string;
    platform?: string[];
  };
}

/**
 * 插件依赖
 */
export interface PluginDependency {
  /** 依赖名称 */
  name: string;

  /** 依赖版本范围 */
  version: string;

  /** 依赖类型 */
  type: 'required' | 'optional' | 'peer';
}

/**
 * 插件接口
 */
export interface Plugin extends PluginLifecycle {
  /** 插件元数据 */
  metadata: PluginMetadata;

  /** 插件配置 */
  config: PluginConfig;

  /** 插件状态 */
  status: PluginStatus;

  /** 插件错误 */
  error?: Error;
}

/**
 * 插件状态
 */
export enum PluginStatus {
  /** 未安装 */
  UNINSTALLED = 'uninstalled',

  /** 已安装但未启用 */
  INSTALLED = 'installed',

  /** 已启用 */
  ENABLED = 'enabled',

  /** 已禁用 */
  DISABLED = 'disabled',

  /** 错误状态 */
  ERROR = 'error',

  /** 加载中 */
  LOADING = 'loading',
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  /** 注册插件 */
  register(plugin: Plugin): void;

  /** 卸载插件 */
  unregister(pluginId: string): void;

  /** 启用插件 */
  enable(pluginId: string): Promise<void>;

  /** 禁用插件 */
  disable(pluginId: string): Promise<void>;

  /** 获取插件 */
  getPlugin(pluginId: string): Plugin | undefined;

  /** 获取所有插件 */
  getAllPlugins(): Plugin[];

  /** 获取已启用的插件 */
  getEnabledPlugins(): Plugin[];

  /** 检查插件是否启用 */
  isEnabled(pluginId: string): boolean;

  /** 获取插件依赖 */
  getDependencies(pluginId: string): Plugin[];

  /** 解析插件依赖 */
  resolveDependencies(pluginId: string): Promise<void>;
}

/**
 * 插件日志记录器
 */
export interface PluginLogger {
  /** 调试日志 */
  debug(message: string, ...args: any[]): void;

  /** 信息日志 */
  info(message: string, ...args: any[]): void;

  /** 警告日志 */
  warn(message: string, ...args: any[]): void;

  /** 错误日志 */
  error(message: string, ...args: any[]): void;

  /** 致命错误日志 */
  fatal(message: string, ...args: any[]): void;
}

/**
 * 插件事件发射器
 */
export interface PluginEventEmitter {
  /** 监听事件 */
  on(event: string, listener: (...args: any[]) => void): void;

  /** 监听事件（一次性） */
  once(event: string, listener: (...args: any[]) => void): void;

  /** 移除事件监听器 */
  off(event: string, listener: (...args: any[]) => void): void;

  /** 发射事件 */
  emit(event: string, ...args: any[]): void;

  /** 移除所有事件监听器 */
  removeAllListeners(event?: string): void;
}

/**
 * 插件加载器接口
 */
export interface PluginLoader {
  /** 加载插件 */
  load(pluginPath: string): Promise<Plugin>;

  /** 验证插件 */
  validate(plugin: Plugin): Promise<boolean>;

  /** 获取插件信息 */
  getInfo(pluginPath: string): Promise<PluginMetadata>;
}

/**
 * 插件存储接口
 */
export interface PluginStorage {
  /** 保存插件数据 */
  save(pluginId: string, key: string, data: any): Promise<void>;

  /** 加载插件数据 */
  load(pluginId: string, key: string): Promise<any>;

  /** 删除插件数据 */
  delete(pluginId: string, key: string): Promise<void>;

  /** 检查数据是否存在 */
  exists(pluginId: string, key: string): Promise<boolean>;

  /** 获取所有数据键 */
  keys(pluginId: string): Promise<string[]>;
}

/**
 * 插件API接口
 */
export interface PluginAPI {
  /** 获取Dubhe实例 */
  getDubhe(): Dubhe;

  /** 获取ECS世界 */
  getWorld(): World;

  /** 获取插件管理器 */
  getPluginManager(): PluginManager;

  /** 获取插件存储 */
  getStorage(): PluginStorage;

  /** 获取事件发射器 */
  getEvents(): PluginEventEmitter;

  /** 获取日志记录器 */
  getLogger(): PluginLogger;
}

/**
 * 插件工厂接口
 */
export interface PluginFactory {
  /** 创建插件实例 */
  create(config: PluginConfig): Plugin;

  /** 验证插件配置 */
  validate(config: PluginConfig): boolean;
}

/**
 * 插件注册表
 */
export interface PluginRegistry {
  /** 注册插件工厂 */
  registerFactory(name: string, factory: PluginFactory): void;

  /** 获取插件工厂 */
  getFactory(name: string): PluginFactory | undefined;

  /** 创建插件实例 */
  create(name: string, config: PluginConfig): Plugin;

  /** 列出所有可用的插件类型 */
  listAvailable(): string[];
}
