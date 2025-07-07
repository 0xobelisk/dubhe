// dubhe-mcp 多语言资源管理模块
// 支持：zh（中文）、en（英文）、ja（日文）、ko（韩文）

export type Lang = 'zh' | 'en' | 'ja' | 'ko';

export interface ResourceMap {
  [key: string]: {
    zh: string;
    en: string;
    ja: string;
    ko: string;
  };
}

// 当前语言设置
let currentLang: Lang = 'en';

// 示例资源，可扩展
const resources: ResourceMap = {
  welcome: {
    zh: '欢迎使用 Dubhe MCP AI 助手',
    en: 'Welcome to Dubhe MCP AI Assistant',
    ja: 'Dubhe MCP AIアシスタントへようこそ',
    ko: 'Dubhe MCP AI 어시스턴트에 오신 것을 환영합니다',
  },
  'error.unknown': {
    zh: '发生未知错误',
    en: 'An unknown error occurred',
    ja: '不明なエラーが発生しました',
    ko: '알 수 없는 오류가 발생했습니다',
  },
  // ... 可继续扩展
};

/**
 * 获取指定 key 的多语言文案
 * @param key 资源 key
 * @param lang 语言
 * @returns 对应语言的文案，若无则回退英文
 */
export function t(key: string, lang: Lang): string {
  const item = resources[key];
  if (!item) return key;
  return item[lang] || item['en'] || key;
}

/**
 * 注册/扩展资源
 * @param newResources 新资源对象
 */
export function registerResources(newResources: ResourceMap) {
  Object.assign(resources, newResources);
}

/**
 * 设置当前语言
 * @param lang 语言代码
 */
export function setLanguage(lang: Lang): void {
  currentLang = lang;
}

/**
 * 获取当前语言
 * @returns 当前语言代码
 */
export function getLanguage(): Lang {
  return currentLang;
}
