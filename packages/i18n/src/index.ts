import { EventEmitter } from 'events';

export interface I18nConfig {
  defaultLocale: string;
  fallbackLocale: string;
  locales: string[];
  namespace?: string;
  debug?: boolean;
}

export interface TranslationData {
  [key: string]: string | TranslationData;
}

export interface I18nInstance {
  t(key: string, params?: Record<string, any>): string;
  setLocale(locale: string): void;
  getLocale(): string;
  hasLocale(locale: string): boolean;
  addTranslation(locale: string, data: TranslationData): void;
  removeTranslation(locale: string): void;
}

/**
 * Internationalization manager for Dubhe
 */
export class I18n extends EventEmitter implements I18nInstance {
  private config: Required<I18nConfig>;
  private translations: Map<string, TranslationData> = new Map();
  private currentLocale: string;

  constructor(config: I18nConfig) {
    super();
    this.config = {
      defaultLocale: config.defaultLocale || 'en',
      fallbackLocale: config.fallbackLocale || 'en',
      locales: config.locales || ['en'],
      namespace: config.namespace || 'dubhe',
      debug: config.debug || false,
    };
    this.currentLocale = this.config.defaultLocale;
  }

  /**
   * Translate a key with optional parameters
   */
  t(key: string, params?: Record<string, any>): string {
    const translation = this.getTranslation(key);
    
    if (!translation) {
      if (this.config.debug) {
        console.warn(`Translation key not found: ${key}`);
      }
      return key;
    }

    return this.interpolate(translation, params);
  }

  /**
   * Set the current locale
   */
  setLocale(locale: string): void {
    if (!this.hasLocale(locale)) {
      throw new Error(`Locale not supported: ${locale}`);
    }
    
    const previousLocale = this.currentLocale;
    this.currentLocale = locale;
    
    this.emit('localeChanged', {
      previous: previousLocale,
      current: locale,
    });
  }

  /**
   * Get the current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Check if a locale is supported
   */
  hasLocale(locale: string): boolean {
    return this.config.locales.includes(locale);
  }

  /**
   * Add translation data for a locale
   */
  addTranslation(locale: string, data: TranslationData): void {
    if (!this.hasLocale(locale)) {
      this.config.locales.push(locale);
    }
    
    this.translations.set(locale, data);
    this.emit('translationAdded', { locale, data });
  }

  /**
   * Remove translation data for a locale
   */
  removeTranslation(locale: string): void {
    this.translations.delete(locale);
    this.emit('translationRemoved', { locale });
  }

  /**
   * Get translation for a key
   */
  private getTranslation(key: string): string | null {
    // Try current locale
    const currentTranslation = this.getNestedValue(
      this.translations.get(this.currentLocale),
      key
    );
    
    if (currentTranslation) {
      return currentTranslation;
    }

    // Try fallback locale
    if (this.currentLocale !== this.config.fallbackLocale) {
      const fallbackTranslation = this.getNestedValue(
        this.translations.get(this.config.fallbackLocale),
        key
      );
      
      if (fallbackTranslation) {
        return fallbackTranslation;
      }
    }

    return null;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): string | null {
    if (!obj) return null;
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : null;
    }, obj);
  }

  /**
   * Interpolate parameters into translation string
   */
  private interpolate(text: string, params?: Record<string, any>): string {
    if (!params) return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Load translations from file
   */
  async loadTranslations(locale: string, path: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(path, 'utf-8');
      const translations = JSON.parse(data);
      this.addTranslation(locale, translations);
    } catch (error) {
      throw new Error(`Failed to load translations for ${locale}: ${error}`);
    }
  }

  /**
   * Export translations to file
   */
  async exportTranslations(locale: string, path: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const translations = this.translations.get(locale);
      if (!translations) {
        throw new Error(`No translations found for locale: ${locale}`);
      }
      
      await fs.writeFile(path, JSON.stringify(translations, null, 2));
    } catch (error) {
      throw new Error(`Failed to export translations for ${locale}: ${error}`);
    }
  }

  /**
   * Get all supported locales
   */
  getSupportedLocales(): string[] {
    return [...this.config.locales];
  }

  /**
   * Get translation statistics
   */
  getTranslationStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const locale of this.config.locales) {
      const translations = this.translations.get(locale);
      stats[locale] = translations ? this.countKeys(translations) : 0;
    }
    
    return stats;
  }

  /**
   * Count keys in translation object
   */
  private countKeys(obj: any): number {
    let count = 0;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        count++;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += this.countKeys(obj[key]);
        }
      }
    }
    
    return count;
  }
}

/**
 * Predefined translations for Dubhe
 */
export const defaultTranslations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      refresh: 'Refresh',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
    },
    blockchain: {
      address: 'Address',
      balance: 'Balance',
      transaction: 'Transaction',
      block: 'Block',
      gas: 'Gas',
      fee: 'Fee',
      confirmations: 'Confirmations',
      pending: 'Pending',
      confirmed: 'Confirmed',
      failed: 'Failed',
      network: 'Network',
      mainnet: 'Mainnet',
      testnet: 'Testnet',
      devnet: 'Devnet',
    },
    dubhe: {
      title: 'Dubhe - The Fabric of Autonomous Worlds',
      description: 'Build and deploy autonomous worlds with ease',
      welcome: 'Welcome to Dubhe',
      gettingStarted: 'Getting Started',
      documentation: 'Documentation',
      examples: 'Examples',
      community: 'Community',
      support: 'Support',
    },
    errors: {
      networkError: 'Network error occurred',
      invalidAddress: 'Invalid address format',
      insufficientBalance: 'Insufficient balance',
      transactionFailed: 'Transaction failed',
      connectionFailed: 'Connection failed',
      timeout: 'Request timeout',
      unknown: 'Unknown error occurred',
    },
  },
  zh: {
    common: {
      loading: '加载中...',
      error: '发生错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      add: '添加',
      search: '搜索',
      filter: '筛选',
      sort: '排序',
      refresh: '刷新',
      close: '关闭',
      back: '返回',
      next: '下一步',
      previous: '上一步',
    },
    blockchain: {
      address: '地址',
      balance: '余额',
      transaction: '交易',
      block: '区块',
      gas: '燃料费',
      fee: '手续费',
      confirmations: '确认数',
      pending: '待处理',
      confirmed: '已确认',
      failed: '失败',
      network: '网络',
      mainnet: '主网',
      testnet: '测试网',
      devnet: '开发网',
    },
    dubhe: {
      title: 'Dubhe - 自主世界的基石',
      description: '轻松构建和部署自主世界',
      welcome: '欢迎使用 Dubhe',
      gettingStarted: '开始使用',
      documentation: '文档',
      examples: '示例',
      community: '社区',
      support: '支持',
    },
    errors: {
      networkError: '网络错误',
      invalidAddress: '地址格式无效',
      insufficientBalance: '余额不足',
      transactionFailed: '交易失败',
      connectionFailed: '连接失败',
      timeout: '请求超时',
      unknown: '发生未知错误',
    },
  },
  ja: {
    common: {
      loading: '読み込み中...',
      error: 'エラーが発生しました',
      success: '成功',
      cancel: 'キャンセル',
      confirm: '確認',
      save: '保存',
      delete: '削除',
      edit: '編集',
      add: '追加',
      search: '検索',
      filter: 'フィルター',
      sort: '並び替え',
      refresh: '更新',
      close: '閉じる',
      back: '戻る',
      next: '次へ',
      previous: '前へ',
    },
    blockchain: {
      address: 'アドレス',
      balance: '残高',
      transaction: 'トランザクション',
      block: 'ブロック',
      gas: 'ガス',
      fee: '手数料',
      confirmations: '確認数',
      pending: '保留中',
      confirmed: '確認済み',
      failed: '失敗',
      network: 'ネットワーク',
      mainnet: 'メインネット',
      testnet: 'テストネット',
      devnet: '開発ネット',
    },
    dubhe: {
      title: 'Dubhe - 自律世界の基盤',
      description: '自律世界を簡単に構築・展開',
      welcome: 'Dubheへようこそ',
      gettingStarted: 'はじめに',
      documentation: 'ドキュメント',
      examples: '例',
      community: 'コミュニティ',
      support: 'サポート',
    },
    errors: {
      networkError: 'ネットワークエラー',
      invalidAddress: '無効なアドレス形式',
      insufficientBalance: '残高不足',
      transactionFailed: 'トランザクション失敗',
      connectionFailed: '接続失敗',
      timeout: 'リクエストタイムアウト',
      unknown: '不明なエラーが発生しました',
    },
  },
};

/**
 * Create a default I18n instance
 */
export function createI18n(config?: Partial<I18nConfig>): I18n {
  const i18n = new I18n({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    locales: ['en', 'zh', 'ja'],
    ...config,
  });

  // Add default translations
  for (const [locale, translations] of Object.entries(defaultTranslations)) {
    i18n.addTranslation(locale, translations);
  }

  return i18n;
} 