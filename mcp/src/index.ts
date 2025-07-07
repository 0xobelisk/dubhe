// dubhe-mcp 主入口

// 核心模块
export { logger } from './logger';
export { registerResources, t } from './resources';
export type { Lang, ResourceMap } from './resources';

// Prompt 管理
export {
  defaultPrompts,
  listPrompts,
  promptRegistry,
  registerPrompt,
  renderPrompt,
  searchPrompts,
} from './prompts';
export type { PromptContext, PromptResult, PromptTemplate } from './prompts';

// AI 服务
export {
  aiService,
  callAI,
  getAIHistory,
  getAIModels,
  getAITools,
  registerAIModel,
  registerAITool,
} from './ai';
export type {
  AICallHistory,
  AIContext,
  AIModel,
  AIRequest,
  AIResponse,
  AITool,
} from './ai';

// 工具函数
export {
  CryptoUtils,
  FileUtils,
  HttpUtils,
  StringUtils,
  TimeUtils,
  ValidationUtils,
  configManager,
  getConfig,
  loadConfig,
  saveConfig,
  setConfig,
} from './utils';
export type { Config } from './utils';

// CLI 界面
export { CLI, startCLI } from './cli';
export type { CLICommand, CLIOptions } from './cli';

// 便捷函数
export async function initialize(
  options: {
    lang?: Lang;
    configPath?: string;
  } = {}
): Promise<void> {
  await loadConfig();

  if (options.lang) {
    setConfig('language', options.lang);
  }

  if (options.configPath) {
    setConfig('configPath', options.configPath);
  }

  logger.info('Dubhe MCP initialized successfully');
}

// 默认导出
export default {
  logger,
  t,
  registerResources,
  registerPrompt,
  renderPrompt,
  callAI,
  initialize,
  startCLI,
};
