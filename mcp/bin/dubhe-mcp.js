#!/usr/bin/env node

// dubhe-mcp 命令行入口

const { startCLI } = require('../dist/cli');

async function main() {
  try {
    // 检查是否以交互模式运行
    const args = process.argv.slice(2);
    const isInteractive =
      args.length === 0 ||
      args.includes('--interactive') ||
      args.includes('-i');

    if (isInteractive) {
      // 交互模式
      await startCLI({ interactive: true });
    } else {
      // 非交互模式，直接执行命令
      await startCLI({ interactive: false });
    }
  } catch (error) {
    console.error('Failed to start dubhe-mcp:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 启动程序
main();
