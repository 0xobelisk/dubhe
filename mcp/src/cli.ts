// dubhe-mcp 命令行界面

import * as readline from 'readline';
import {
  callAI,
  getAIHistory,
  getAIModels,
  getAITools,
  type AIRequest,
} from './ai';
import { logger } from './logger';
import { listPrompts, renderPrompt, searchPrompts } from './prompts';
import { t, type Lang } from './resources';
import {
  getConfig,
  loadConfig,
  saveConfig,
  setConfig,
  StringUtils,
} from './utils';

export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[]) => Promise<void>;
}

export interface CLIOptions {
  lang?: Lang;
  interactive?: boolean;
  configPath?: string;
}

class CLI {
  private rl: readline.Interface;
  private commands: Map<string, CLICommand> = new Map();
  private lang: Lang = 'en';
  private isInteractive: boolean = false;

  constructor(options: CLIOptions = {}) {
    this.lang = options.lang || 'en';
    this.isInteractive = options.interactive || false;

    if (this.isInteractive) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }

    this.registerCommands();
  }

  /**
   * 注册命令
   */
  private registerCommands(): void {
    const commands: CLICommand[] = [
      {
        name: 'help',
        description: '显示帮助信息',
        usage: 'help [command]',
        execute: async (args) => this.showHelp(args[0]),
      },
      {
        name: 'config',
        description: '配置管理',
        usage: 'config [get|set] [key] [value]',
        execute: async (args) => this.handleConfig(args),
      },
      {
        name: 'prompt',
        description: 'Prompt 管理',
        usage: 'prompt [list|search|render|register] [args...]',
        execute: async (args) => this.handlePrompt(args),
      },
      {
        name: 'ai',
        description: 'AI 调用',
        usage: 'ai [call|history|models|tools] [args...]',
        execute: async (args) => this.handleAI(args),
      },
      {
        name: 'lang',
        description: '设置语言',
        usage: 'lang [zh|en|ja|ko]',
        execute: async (args) => this.setLanguage(args[0]),
      },
      {
        name: 'exit',
        description: '退出程序',
        usage: 'exit',
        execute: async () => this.exit(),
      },
    ];

    commands.forEach((cmd) => this.commands.set(cmd.name, cmd));
  }

  /**
   * 启动 CLI
   */
  async start(): Promise<void> {
    try {
      await loadConfig();
      logger.info(t('welcome', this.lang));

      if (this.isInteractive) {
        await this.startInteractive();
      } else {
        // 非交互模式，处理命令行参数
        const args = process.argv.slice(2);
        if (args.length === 0) {
          this.showHelp();
          return;
        }
        await this.executeCommand(args[0], args.slice(1));
      }
    } catch (error) {
      logger.error('CLI startup failed:', error);
      process.exit(1);
    }
  }

  /**
   * 启动交互模式
   */
  private async startInteractive(): Promise<void> {
    const prompt = `dubhe-mcp (${this.lang})> `;

    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
      });
    };

    while (true) {
      try {
        const input = await askQuestion();
        if (!input) continue;

        const parts = input.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        if (command === 'exit' || command === 'quit') {
          break;
        }

        await this.executeCommand(command, args);
      } catch (error) {
        logger.error('Command execution failed:', error);
      }
    }

    this.exit();
  }

  /**
   * 执行命令
   */
  private async executeCommand(command: string, args: string[]): Promise<void> {
    const cmd = this.commands.get(command);
    if (!cmd) {
      logger.error(`Unknown command: ${command}`);
      this.showHelp();
      return;
    }

    try {
      await cmd.execute(args);
    } catch (error) {
      logger.error(`Command '${command}' failed:`, error);
    }
  }

  /**
   * 显示帮助信息
   */
  private showHelp(commandName?: string): void {
    if (commandName) {
      const cmd = this.commands.get(commandName);
      if (cmd) {
        console.log(`\n${cmd.name}: ${cmd.description}`);
        console.log(`Usage: ${cmd.usage}`);
      } else {
        console.log(`Unknown command: ${commandName}`);
      }
      return;
    }

    console.log('\nDubhe MCP AI Assistant - Available Commands:\n');

    for (const cmd of this.commands.values()) {
      console.log(`  ${cmd.name.padEnd(10)} ${cmd.description}`);
    }

    console.log('\nExamples:');
    console.log('  help                    - Show this help');
    console.log('  config get language     - Get configuration value');
    console.log('  prompt list             - List all prompt templates');
    console.log('  ai call "Hello world"   - Call AI with text');
    console.log('  lang zh                 - Set language to Chinese');
  }

  /**
   * 处理配置命令
   */
  private async handleConfig(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log('Config commands: get, set');
      return;
    }

    const action = args[0];

    switch (action) {
      case 'get':
        if (args.length < 2) {
          console.log('Usage: config get <key>');
          return;
        }
        const value = getConfig(args[1]);
        console.log(`${args[1]}: ${JSON.stringify(value)}`);
        break;

      case 'set':
        if (args.length < 3) {
          console.log('Usage: config set <key> <value>');
          return;
        }
        setConfig(args[1], args[2]);
        await saveConfig();
        console.log(`Configuration updated: ${args[1]} = ${args[2]}`);
        break;

      default:
        console.log('Unknown config action. Use: get, set');
    }
  }

  /**
   * 处理 Prompt 命令
   */
  private async handlePrompt(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log('Prompt commands: list, search, render, register');
      return;
    }

    const action = args[0];

    switch (action) {
      case 'list':
        const category = args[1];
        const prompts = listPrompts(category);
        console.log(`\nPrompt Templates${category ? ` (${category})` : ''}:`);
        prompts.forEach((p) => {
          console.log(`  ${p.id.padEnd(20)} ${p.name} - ${p.description}`);
        });
        break;

      case 'search':
        if (args.length < 2) {
          console.log('Usage: prompt search <query>');
          return;
        }
        const results = searchPrompts(args[1]);
        console.log(`\nSearch results for "${args[1]}":`);
        results.forEach((p) => {
          console.log(`  ${p.id.padEnd(20)} ${p.name} - ${p.description}`);
        });
        break;

      case 'render':
        if (args.length < 2) {
          console.log('Usage: prompt render <id> [variables...]');
          return;
        }
        const variables: Record<string, any> = {};
        for (let i = 2; i < args.length; i += 2) {
          if (i + 1 < args.length) {
            variables[args[i]] = args[i + 1];
          }
        }

        try {
          const result = renderPrompt(args[1], {
            lang: this.lang,
            variables,
          });
          console.log('\nRendered prompt:');
          console.log(result.content);
        } catch (error) {
          logger.error('Failed to render prompt:', error);
        }
        break;

      case 'register':
        console.log('Prompt registration not implemented in CLI yet');
        break;

      default:
        console.log(
          'Unknown prompt action. Use: list, search, render, register'
        );
    }
  }

  /**
   * 处理 AI 命令
   */
  private async handleAI(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log('AI commands: call, history, models, tools');
      return;
    }

    const action = args[0];

    switch (action) {
      case 'call':
        if (args.length < 2) {
          console.log('Usage: ai call <prompt> [model] [tools...]');
          return;
        }

        const prompt = args[1];
        const model = args[2] || 'gpt-4';
        const tools = args.slice(3);

        try {
          const request: AIRequest = {
            prompt,
            model,
            tools,
            context: {
              lang: this.lang,
              sessionId: StringUtils.randomString(8),
            },
          };

          console.log('Calling AI...');
          const response = await callAI(request);
          console.log('\nAI Response:');
          console.log(response.content);
        } catch (error) {
          logger.error('AI call failed:', error);
        }
        break;

      case 'history':
        const limit = args[1] ? parseInt(args[1]) : 10;
        const history = getAIHistory(limit);
        console.log(`\nAI Call History (last ${limit}):`);
        history.forEach((record, index) => {
          console.log(
            `  ${index + 1}. ${record.requestId} - ${record.duration}ms`
          );
          console.log(`     Model: ${record.response.model}`);
          console.log(`     Success: ${record.success}`);
          if (record.error) {
            console.log(`     Error: ${record.error}`);
          }
        });
        break;

      case 'models':
        const models = getAIModels();
        console.log('\nAvailable AI Models:');
        models.forEach((m) => {
          console.log(`  ${m.id.padEnd(15)} ${m.name} (${m.provider})`);
        });
        break;

      case 'tools':
        const toolCategory = args[1];
        const availableTools = getAITools(toolCategory);
        console.log(
          `\nAvailable AI Tools${toolCategory ? ` (${toolCategory})` : ''}:`
        );
        availableTools.forEach((t) => {
          console.log(`  ${t.id.padEnd(20)} ${t.name} - ${t.description}`);
        });
        break;

      default:
        console.log('Unknown AI action. Use: call, history, models, tools');
    }
  }

  /**
   * 设置语言
   */
  private setLanguage(lang: string): void {
    const validLangs: Lang[] = ['zh', 'en', 'ja', 'ko'];
    if (validLangs.includes(lang as Lang)) {
      this.lang = lang as Lang;
      setConfig('language', lang);
      console.log(`Language set to: ${lang}`);
    } else {
      console.log('Invalid language. Use: zh, en, ja, ko');
    }
  }

  /**
   * 退出程序
   */
  private exit(): void {
    if (this.rl) {
      this.rl.close();
    }
    console.log('Goodbye!');
    process.exit(0);
  }
}

// 导出 CLI 类和便捷函数
export { CLI };

export async function startCLI(options: CLIOptions = {}): Promise<void> {
  const cli = new CLI(options);
  await cli.start();
}

// 如果直接运行此文件，启动 CLI
if (require.main === module) {
  const options: CLIOptions = {
    interactive: true,
    lang: 'en',
  };

  startCLI(options).catch((error) => {
    logger.error('CLI startup failed:', error);
    process.exit(1);
  });
}
