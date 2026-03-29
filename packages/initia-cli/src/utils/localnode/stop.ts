import { execSync } from 'child_process';
import chalk from 'chalk';

export async function stopLocalnode() {
  console.log('Stopping local node...');

  try {
    // Choose different commands based on OS
    const cmd =
      process.platform === 'win32'
        ? `tasklist /FI "IMAGENAME eq initiad.exe" /FO CSV /NH`
        : "ps aux | grep '[i]nitiad start'";

    const output = execSync(cmd, {
      encoding: 'utf8'
    });

    if (!output) {
      console.log('No running local node process found');
      return;
    }

    // Parse process ID based on OS
    let pid;
    if (process.platform === 'win32') {
      // Windows output format: "initiad.exe","1234",... (CSV format)
      const match = output.match(/"initiad\.exe",["']?(\d+)/i);
      pid = match ? match[1] : null;
    } else {
      // Unix system output format: user pid %cpu ...
      pid = output.toString().split(/\s+/)[1];
    }

    if (!pid) {
      console.log('No running local node process found');
      return;
    }

    // Kill process based on OS
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`);
    } else {
      process.kill(Number(pid));
    }

    console.log(chalk.green('✅ Local node stopped successfully'));
  } catch (error: any) {
    if (error.code === 'ESRCH' || error.message.includes('no running tasks')) {
      console.log('No running local node process found');
    } else {
      console.error(chalk.red('❌ Error stopping local node:'), error.message);
    }
  }
}
