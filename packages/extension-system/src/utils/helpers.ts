import {
  ExtensionPoint,
  ExtensionPriority,
  ExtensionStatus,
} from '../core/types';

/**
 * 拓展系统工具函数
 */

/**
 * 验证拓展点是否有效
 */
export function isValidExtensionPoint(point: string): point is ExtensionPoint {
  return Object.values(ExtensionPoint).includes(point as ExtensionPoint);
}

/**
 * 验证优先级是否有效
 */
export function isValidPriority(
  priority: number
): priority is ExtensionPriority {
  return Object.values(ExtensionPriority).includes(
    priority as ExtensionPriority
  );
}

/**
 * 验证状态是否有效
 */
export function isValidStatus(status: string): status is ExtensionStatus {
  return Object.values(ExtensionStatus).includes(status as ExtensionStatus);
}

/**
 * 获取拓展点描述
 */
export function getExtensionPointDescription(point: ExtensionPoint): string {
  const descriptions: Record<ExtensionPoint, string> = {
    [ExtensionPoint.BEFORE_TRANSACTION]: '交易处理前',
    [ExtensionPoint.AFTER_TRANSACTION]: '交易处理后',
    [ExtensionPoint.BEFORE_NFT_TRANSFER]: 'NFT转移前',
    [ExtensionPoint.AFTER_NFT_TRANSFER]: 'NFT转移后',
    [ExtensionPoint.BEFORE_WALLET_CONNECT]: '钱包连接前',
    [ExtensionPoint.AFTER_WALLET_CONNECT]: '钱包连接后',
    [ExtensionPoint.DATA_VALIDATION]: '数据验证',
    [ExtensionPoint.ERROR_HANDLING]: '错误处理',
    [ExtensionPoint.LOGGING]: '日志记录',
    [ExtensionPoint.CACHE_HANDLING]: '缓存处理',
    [ExtensionPoint.CUSTOM]: '自定义拓展点',
  };

  return descriptions[point] || '未知拓展点';
}

/**
 * 获取优先级描述
 */
export function getPriorityDescription(priority: ExtensionPriority): string {
  const descriptions: Record<ExtensionPriority, string> = {
    [ExtensionPriority.HIGHEST]: '最高优先级',
    [ExtensionPriority.HIGH]: '高优先级',
    [ExtensionPriority.NORMAL]: '正常优先级',
    [ExtensionPriority.LOW]: '低优先级',
    [ExtensionPriority.LOWEST]: '最低优先级',
  };

  return descriptions[priority] || '未知优先级';
}

/**
 * 获取状态描述
 */
export function getStatusDescription(status: ExtensionStatus): string {
  const descriptions: Record<ExtensionStatus, string> = {
    [ExtensionStatus.UNREGISTERED]: '未注册',
    [ExtensionStatus.REGISTERED]: '已注册',
    [ExtensionStatus.ENABLED]: '已启用',
    [ExtensionStatus.DISABLED]: '已禁用',
    [ExtensionStatus.ERROR]: '错误状态',
    [ExtensionStatus.EXECUTING]: '执行中',
  };

  return descriptions[status] || '未知状态';
}

/**
 * 生成拓展ID
 */
export function generateExtensionId(name: string, version: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${version}`;
}

/**
 * 验证拓展ID格式
 */
export function isValidExtensionId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id) && id.length > 0 && id.length <= 100;
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        result[key] || {},
        source[key] as Record<string, any>
      );
    } else {
      result[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 异步重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

/**
 * 生成唯一标识符
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array)
    return obj.map((item) => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL格式
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证版本号格式
 */
export function isValidVersion(version: string): boolean {
  const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
  return versionRegex.test(version);
}

/**
 * 比较版本号
 */
export function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) =>
    v.replace(/^[v\s]+/, '').replace(/[^\d.-]/g, '');
  const parts1 = normalize(v1).split('.').map(Number);
  const parts2 = normalize(v2).split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * 检查兼容性
 */
export function checkCompatibility(
  required: string,
  current: string
): { compatible: boolean; reason?: string } {
  const comparison = compareVersions(current, required);

  if (comparison >= 0) {
    return { compatible: true };
  } else {
    return {
      compatible: false,
      reason: `Current version ${current} is lower than required version ${required}`,
    };
  }
}

/**
 * 创建错误对象
 */
export function createError(
  message: string,
  code?: string,
  details?: any
): Error {
  const error = new Error(message) as any;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * 解析错误信息
 */
export function parseError(error: any): {
  message: string;
  code?: string;
  details?: any;
} {
  return {
    message: error.message || 'Unknown error',
    code: error.code,
    details: error.details || error.stack,
  };
}
