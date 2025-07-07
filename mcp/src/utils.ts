// dubhe-mcp 通用工具函数

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

// 配置管理
export interface Config {
  [key: string]: any;
}

class ConfigManager {
  private config: Config = {};
  private configPath: string;

  constructor(configPath: string = './dubhe-mcp.config.json') {
    this.configPath = configPath;
  }

  /**
   * 加载配置文件
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      logger.info('Configuration loaded successfully');
    } catch (error) {
      logger.warn('Configuration file not found, using defaults');
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 保存配置文件
   */
  async save(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info('Configuration saved successfully');
    } catch (error) {
      logger.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * 获取配置值
   */
  get(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  /**
   * 设置配置值
   */
  set(key: string, value: any): void {
    this.config[key] = value;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): Config {
    return {
      language: 'en',
      logLevel: 'info',
      maxHistorySize: 1000,
      aiModels: {
        default: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096,
      },
      tools: {
        enabled: true,
        categories: ['development', 'security', 'performance'],
      },
    };
  }
}

// 文件操作工具
export class FileUtils {
  /**
   * 确保目录存在
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 读取文件内容
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 写入文件内容
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 复制文件
   */
  static async copyFile(src: string, dest: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(dest));
      await fs.copyFile(src, dest);
    } catch (error) {
      logger.error(`Failed to copy file: ${src} -> ${dest}`, error);
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(filePath: string): Promise<{
    size: number;
    modified: Date;
    exists: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
        exists: true,
      };
    } catch {
      return {
        size: 0,
        modified: new Date(),
        exists: false,
      };
    }
  }

  /**
   * 递归读取目录
   */
  static async readDirRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentPath: string) {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await scan(dirPath);
    return files;
  }
}

// 网络请求工具
export class HttpUtils {
  /**
   * GET 请求
   */
  static async get(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`GET request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * POST 请求
   */
  static async post(
    url: string,
    data: any,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`POST request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  static async download(url: string, destPath: string): Promise<void> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await FileUtils.writeFile(
        destPath,
        Buffer.from(buffer).toString('binary')
      );

      logger.info(`File downloaded: ${destPath}`);
    } catch (error) {
      logger.error(`Download failed: ${url}`, error);
      throw error;
    }
  }
}

// 数据验证工具
export class ValidationUtils {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证 URL 格式
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证对象结构
   */
  static validateObject(
    obj: any,
    schema: Record<string, string>
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [key, type] of Object.entries(schema)) {
      if (!(key in obj)) {
        errors.push(`Missing required field: ${key}`);
        continue;
      }

      const value = obj[key];
      const actualType = typeof value;

      if (actualType !== type) {
        errors.push(
          `Invalid type for ${key}: expected ${type}, got ${actualType}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证字符串长度
   */
  static validateStringLength(str: string, min: number, max: number): boolean {
    return str.length >= min && str.length <= max;
  }
}

// 加密解密工具
export class CryptoUtils {
  private static algorithm = 'aes-256-cbc';
  private static keyLength = 32;
  private static ivLength = 16;

  /**
   * 生成随机密钥
   */
  static generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * 加密数据
   */
  static encrypt(text: string, key: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * 解密数据
   */
  static decrypt(encryptedText: string, key: string): string {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipher(this.algorithm, key);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * 生成哈希
   */
  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * 生成 MD5
   */
  static md5(data: string): string {
    return this.hash(data, 'md5');
  }
}

// 时间工具
export class TimeUtils {
  /**
   * 格式化时间
   */
  static formatDate(
    date: Date,
    format: string = 'YYYY-MM-DD HH:mm:ss'
  ): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 获取相对时间
   */
  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }

  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 字符串工具
export class StringUtils {
  /**
   * 生成随机字符串
   */
  static randomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 转换为驼峰命名
   */
  static toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 转换为短横线命名
   */
  static toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * 截断字符串
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * 转义 HTML
   */
  static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// 导出全局配置管理器实例
export const configManager = new ConfigManager();

// 导出便捷函数
export async function loadConfig(): Promise<void> {
  await configManager.load();
}

export async function saveConfig(): Promise<void> {
  await configManager.save();
}

export function getConfig(key: string, defaultValue?: any): any {
  return configManager.get(key, defaultValue);
}

export function setConfig(key: string, value: any): void {
  configManager.set(key, value);
}
