// dubhe-mcp AI 调用和工具管理系统

import logger from './logger';
import type { PromptResult } from './prompts';
import { type Lang } from './resources';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface AITool {
  id: string;
  name: string;
  description: string;
  category: string;
  execute: (params: any, context: AIContext) => Promise<any>;
  parameters?: Record<string, any>;
}

export interface AIContext {
  lang: Lang;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AIRequest {
  prompt: string | PromptResult;
  model?: string;
  tools?: string[];
  context: AIContext;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

export interface AIResponse {
  content: string;
  model: string;
  tools?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: Date;
  requestId: string;
}

export interface AICallHistory {
  requestId: string;
  request: AIRequest;
  response: AIResponse;
  duration: number;
  success: boolean;
  error?: string;
}

class AIService {
  private models: Map<string, AIModel> = new Map();
  private tools: Map<string, AITool> = new Map();
  private history: AICallHistory[] = [];
  private maxHistorySize = 1000;

  /**
   * 注册 AI 模型
   */
  registerModel(model: AIModel): void {
    this.models.set(model.id, model);
    logger.info(`Registered AI model: ${model.id} (${model.provider})`);
  }

  /**
   * 注册 AI 工具
   */
  registerTool(tool: AITool): void {
    this.tools.set(tool.id, tool);
    logger.info(`Registered AI tool: ${tool.id}`);
  }

  /**
   * 调用 AI
   */
  async call(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 获取模型
      const modelId = request.model || 'default';
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`AI model ${modelId} not found`);
      }

      // 处理 prompt
      const promptContent =
        typeof request.prompt === 'string'
          ? request.prompt
          : request.prompt.content;

      // 执行工具调用
      const toolResults = await this.executeTools(
        request.tools || [],
        request.context
      );

      // 模拟 AI 响应（实际项目中会调用真实的 AI API）
      const response: AIResponse = {
        content: this.generateMockResponse(
          promptContent,
          toolResults,
          request.context.lang
        ),
        model: modelId,
        tools: toolResults,
        usage: {
          promptTokens: Math.ceil(promptContent.length / 4),
          completionTokens: Math.ceil(promptContent.length / 8),
          totalTokens: Math.ceil(promptContent.length / 3),
        },
        timestamp: new Date(),
        requestId,
      };

      // 记录历史
      this.recordHistory({
        requestId,
        request,
        response,
        duration: Date.now() - startTime,
        success: true,
      });

      logger.info(`AI call completed: ${requestId} (${response.duration}ms)`);
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      this.recordHistory({
        requestId,
        request,
        response: {
          content: '',
          model: request.model || 'unknown',
          timestamp: new Date(),
          requestId,
        },
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg,
      });

      logger.error(`AI call failed: ${requestId} - ${errorMsg}`);
      throw error;
    }
  }

  /**
   * 执行工具调用
   */
  private async executeTools(
    toolIds: string[],
    context: AIContext
  ): Promise<any[]> {
    const results = [];

    for (const toolId of toolIds) {
      const tool = this.tools.get(toolId);
      if (tool) {
        try {
          const result = await tool.execute({}, context);
          results.push({
            toolId,
            result,
            success: true,
          });
        } catch (error) {
          results.push({
            toolId,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
          });
        }
      }
    }

    return results;
  }

  /**
   * 生成模拟响应（实际项目中会调用真实的 AI API）
   */
  private generateMockResponse(
    prompt: string,
    toolResults: any[],
    lang: Lang
  ): string {
    const responses = {
      zh: `基于您的请求，我生成了以下响应：\n\n${prompt}\n\n工具执行结果：${JSON.stringify(toolResults, null, 2)}`,
      en: `Based on your request, I generated the following response:\n\n${prompt}\n\nTool execution results: ${JSON.stringify(toolResults, null, 2)}`,
      ja: `ご要望に基づいて、以下の応答を生成しました：\n\n${prompt}\n\nツール実行結果：${JSON.stringify(toolResults, null, 2)}`,
      ko: `요청에 따라 다음 응답을 생성했습니다:\n\n${prompt}\n\n도구 실행 결과: ${JSON.stringify(toolResults, null, 2)}`,
    };

    return responses[lang] || responses.en;
  }

  /**
   * 记录调用历史
   */
  private recordHistory(record: AICallHistory): void {
    this.history.push(record);

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取调用历史
   */
  getHistory(limit?: number): AICallHistory[] {
    const history = [...this.history].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取模型列表
   */
  getModels(): AIModel[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取工具列表
   */
  getTools(category?: string): AITool[] {
    const tools = Array.from(this.tools.values());
    return category ? tools.filter((t) => t.category === category) : tools;
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
    logger.info('Cleared AI call history');
  }
}

// 全局 AI 服务实例
export const aiService = new AIService();

// 预定义的 AI 模型
const defaultModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    capabilities: ['text-generation', 'code-generation', 'analysis'],
    maxTokens: 8192,
    temperature: 0.7,
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    provider: 'Anthropic',
    capabilities: ['text-generation', 'code-generation', 'analysis'],
    maxTokens: 100000,
    temperature: 0.7,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    capabilities: ['text-generation', 'code-generation', 'analysis'],
    maxTokens: 32768,
    temperature: 0.7,
  },
];

// 预定义的 AI 工具
const defaultTools: AITool[] = [
  {
    id: 'code-analyzer',
    name: '代码分析器',
    description: '分析代码质量和性能',
    category: 'development',
    async execute(params: any, context: AIContext) {
      logger.info('Executing code analyzer tool');
      return {
        quality: 'good',
        suggestions: [
          'Consider adding more comments',
          'Optimize variable naming',
        ],
        score: 85,
      };
    },
  },
  {
    id: 'security-scanner',
    name: '安全扫描器',
    description: '扫描代码安全漏洞',
    category: 'security',
    async execute(params: any, context: AIContext) {
      logger.info('Executing security scanner tool');
      return {
        vulnerabilities: [],
        riskLevel: 'low',
        recommendations: ['Keep dependencies updated'],
      };
    },
  },
  {
    id: 'performance-analyzer',
    name: '性能分析器',
    description: '分析代码性能瓶颈',
    category: 'performance',
    async execute(params: any, context: AIContext) {
      logger.info('Executing performance analyzer tool');
      return {
        bottlenecks: [],
        optimization: ['Use caching for expensive operations'],
        score: 90,
      };
    },
  },
];

// 注册默认模型和工具
defaultModels.forEach((model) => aiService.registerModel(model));
defaultTools.forEach((tool) => aiService.registerTool(tool));

// 导出便捷函数
export function registerAIModel(model: AIModel): void {
  aiService.registerModel(model);
}

export function registerAITool(tool: AITool): void {
  aiService.registerTool(tool);
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
  return aiService.call(request);
}

export function getAIHistory(limit?: number): AICallHistory[] {
  return aiService.getHistory(limit);
}

export function getAIModels(): AIModel[] {
  return aiService.getModels();
}

export function getAITools(category?: string): AITool[] {
  return aiService.getTools(category);
}
