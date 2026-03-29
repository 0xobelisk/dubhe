import chalk from 'chalk';

async function waitNode(ms: number) {
  // 1. Start local node
  console.log(chalk.blue('\n🌐 Waiting for node to start...'));
  return new Promise(resolve => setTimeout(resolve, ms));
}

waitNode(3000);
