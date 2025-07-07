import { World } from '@0xobelisk/ecs';
import { Dubhe } from '@0xobelisk/sui-client';

/**
 * 拓展点类型
 */
export enum ExtensionPoint {
  /** 交易处理前 */
  BEFORE_TRANSACTION = 'before_transaction',

  /** 交易处理后 */
  AFTER_TRANSACTION = 'after_transaction',

  /** NFT转移前 */
  BEFORE_NFT_TRANSFER = 'before_nft_transfer',

  /** NFT转移后 */
  AFTER_NFT_TRANSFER = 'after_nft_transfer',

  /** 钱包连接前 */
  BEFORE_WALLET_CONNECT = 'before_wallet_connect',

  /** 钱包连接后 */
  AFTER_WALLET_CONNECT = 'after_wallet_connect',

  /** 数据验证 */
  DATA_VALIDATION = 'data_validation',

  /** 错误处理 */
  ERROR_HANDLING = 'error_handling',

  /** 日志记录 */
  LOGGING = 'logging',

  /** 缓存处理 */
  CACHE_HANDLING = 'cache_handling',

  /** 自定义拓展点 */
  CUSTOM = 'custom',
}

/**
 * 拓展优先级
 */
export enum ExtensionPriority {
  /** 最高优先级 */
  HIGHEST = 1000,

  /** 高优先级 */
  HIGH = 100,

  /** 正常优先级 */
  NORMAL = 0,

  /** 低优先级 */
  LOW = -100,

  /** 最低优先级 */
  LOWEST = -1000,
}

/**
 * 拓展上下文
 */
export interface ExtensionContext {
  /** Dubhe实例 */
  dubhe: Dubhe;

  /** ECS世界实例 */
  world: World;

  /** 拓展管理器 */
  extensionManager: ExtensionManager;

  /** 拓展配置 */
  config: ExtensionConfig;

  /** 拓展元数据 */
  metadata: ExtensionMetadata;

  /** 日志记录器 */
  logger: ExtensionLogger;

  /** 事件发射器 */
  events: ExtensionEventEmitter;

  /** 当前执行的数据 */
  data?: any;

  /** 执行结果 */
  result?: any;

  /** 错误信息 */
  error?: Error;
}

/**
 * 拓展配置
 */
export interface ExtensionConfig {
  /** 拓展名称 */
  name: string;

  /** 拓展版本 */
  version: string;

  /** 拓展描述 */
  description?: string;

  /** 拓展作者 */
  author?: string;

  /** 拓展点 */
  extensionPoints: ExtensionPoint[];

  /** 优先级 */
  priority?: ExtensionPriority;

  /** 是否启用 */
  enabled?: boolean;

  /** 配置选项 */
  options?: Record<string, any>;

  /** 环境变量 */
  env?: Record<string, string>;
}

/**
 * 拓展元数据
 */
export interface ExtensionMetadata {
  /** 拓展ID */
  id: string;

  /** 拓展名称 */
  name: string;

  /** 拓展版本 */
  version: string;

  /** 拓展描述 */
  description?: string;

  /** 拓展作者 */
  author?: string;

  /** 拓展主页 */
  homepage?: string;

  /** 拓展许可证 */
  license?: string;

  /** 拓展标签 */
  tags?: string[];

  /** 拓展图标 */
  icon?: string;

  /** 拓展点 */
  extensionPoints: ExtensionPoint[];

  /** 优先级 */
  priority: ExtensionPriority;

  /** 兼容性 */
  compatibility?: {
    dubhe?: string;
    node?: string;
    platform?: string[];
  };
}

/**
 * 拓展接口
 */
export interface Extension {
  /** 拓展元数据 */
  metadata: ExtensionMetadata;

  /** 拓展配置 */
  config: ExtensionConfig;

  /** 拓展状态 */
  status: ExtensionStatus;

  /** 拓展错误 */
  error?: Error;

  /** 执行拓展 */
  execute(context: ExtensionContext): Promise<any> | any;

  /** 拓展初始化 */
  initialize?(context: ExtensionContext): Promise<void> | void;

  /** 拓展清理 */
  cleanup?(context: ExtensionContext): Promise<void> | void;
}

/**
 * 拓展状态
 */
export enum ExtensionStatus {
  /** 未注册 */
  UNREGISTERED = 'unregistered',

  /** 已注册 */
  REGISTERED = 'registered',

  /** 已启用 */
  ENABLED = 'enabled',

  /** 已禁用 */
  DISABLED = 'disabled',

  /** 错误状态 */
  ERROR = 'error',

  /** 执行中 */
  EXECUTING = 'executing',
}

/**
 * 拓展管理器接口
 */
export interface ExtensionManager {
  /** 注册拓展 */
  register(extension: Extension): void;

  /** 注销拓展 */
  unregister(extensionId: string): void;

  /** 启用拓展 */
  enable(extensionId: string): void;

  /** 禁用拓展 */
  disable(extensionId: string): void;

  /** 获取拓展 */
  getExtension(extensionId: string): Extension | undefined;

  /** 获取所有拓展 */
  getAllExtensions(): Extension[];

  /** 获取已启用的拓展 */
  getEnabledExtensions(): Extension[];

  /** 检查拓展是否启用 */
  isEnabled(extensionId: string): boolean;

  /** 执行拓展点 */
  executeExtensionPoint(
    point: ExtensionPoint,
    context: ExtensionContext
  ): Promise<any[]>;

  /** 获取拓展点拓展 */
  getExtensionsForPoint(point: ExtensionPoint): Extension[];
}

/**
 * 拓展日志记录器
 */
export interface ExtensionLogger {
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
 * 拓展事件发射器
 */
export interface ExtensionEventEmitter {
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
 * 拓展加载器接口
 */
export interface ExtensionLoader {
  /** 加载拓展 */
  load(extensionPath: string): Promise<Extension>;

  /** 验证拓展 */
  validate(extension: Extension): Promise<boolean>;

  /** 获取拓展信息 */
  getInfo(extensionPath: string): Promise<ExtensionMetadata>;
}

/**
 * 拓展存储接口
 */
export interface ExtensionStorage {
  /** 保存拓展数据 */
  save(extensionId: string, key: string, data: any): Promise<void>;

  /** 加载拓展数据 */
  load(extensionId: string, key: string): Promise<any>;

  /** 删除拓展数据 */
  delete(extensionId: string, key: string): Promise<void>;

  /** 检查数据是否存在 */
  exists(extensionId: string, key: string): Promise<boolean>;

  /** 获取所有数据键 */
  keys(extensionId: string): Promise<string[]>;
}

/**
 * 拓展API接口
 */
export interface ExtensionAPI {
  /** 获取Dubhe实例 */
  getDubhe(): Dubhe;

  /** 获取ECS世界 */
  getWorld(): World;

  /** 获取拓展管理器 */
  getExtensionManager(): ExtensionManager;

  /** 获取拓展存储 */
  getStorage(): ExtensionStorage;

  /** 获取事件发射器 */
  getEvents(): ExtensionEventEmitter;

  /** 获取日志记录器 */
  getLogger(): ExtensionLogger;
}

/**
 * 拓展工厂接口
 */
export interface ExtensionFactory {
  /** 创建拓展实例 */
  create(config: ExtensionConfig): Extension;

  /** 验证拓展配置 */
  validate(config: ExtensionConfig): boolean;
}

/**
 * 拓展注册表
 */
export interface ExtensionRegistry {
  /** 注册拓展工厂 */
  registerFactory(name: string, factory: ExtensionFactory): void;

  /** 获取拓展工厂 */
  getFactory(name: string): ExtensionFactory | undefined;

  /** 创建拓展实例 */
  create(name: string, config: ExtensionConfig): Extension;

  /** 列出所有可用的拓展类型 */
  listAvailable(): string[];
}

/**
 * 拓展执行结果
 */
export interface ExtensionResult {
  /** 拓展ID */
  extensionId: string;

  /** 执行结果 */
  result: any;

  /** 执行时间 */
  executionTime: number;

  /** 是否成功 */
  success: boolean;

  /** 错误信息 */
  error?: Error;
}

/**
 * 拓展点执行上下文
 */
export interface ExtensionPointContext extends ExtensionContext {
  /** 拓展点 */
  point: ExtensionPoint;

  /** 执行结果列表 */
  results: ExtensionResult[];

  /** 是否继续执行 */
  continue: boolean;

  /** 中断执行 */
  break(): void;

  /** 跳过后续拓展 */
  skip(): void;
}
