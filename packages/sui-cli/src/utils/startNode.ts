import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import { printDubhe } from './printDubhe';
import { delay, DubheCliError, validatePrivateKey } from '../utils';
import { Dubhe } from '@0xobelisk/sui-client';
import * as fs from 'fs';

export function stopLocalNode(): void {
  console.log(chalk.yellow('🔔 Stopping existing Local Node...'));

  let processStopped = false;

  if (process.platform === 'win32') {
    // Windows: Kill all sui.exe processes
    try {
      execSync('taskkill /F /IM sui.exe', { stdio: 'ignore' });
      processStopped = true;
    } catch (error) {
      // Process not found
    }
  } else {
    // Unix-like systems: Try multiple patterns to find sui processes
    const patterns = [
      'sui start', // Exact match
      'sui.*start', // Pattern with any flags
      '^sui', // Any sui command
      'sui.*--with-faucet' // Match our specific startup pattern
    ];

    for (const pattern of patterns) {
      try {
        const result = execSync(`pgrep -f "${pattern}"`, { stdio: 'pipe' }).toString().trim();
        if (result) {
          const pids = result.split('\n').filter((pid) => pid);
          console.log(chalk.cyan(`  ├─ Found ${pids.length} process(es) matching "${pattern}"`));

          pids.forEach((pid) => {
            try {
              // First try graceful termination
              execSync(`kill -TERM ${pid}`, { stdio: 'ignore' });
              console.log(chalk.cyan(`  ├─ Sent SIGTERM to process ${pid}`));
            } catch (error) {
              // If graceful termination fails, force kill
              try {
                execSync(`kill -KILL ${pid}`, { stdio: 'ignore' });
                console.log(chalk.cyan(`  ├─ Force killed process ${pid}`));
              } catch (killError) {
                console.log(chalk.gray(`  ├─ Process ${pid} already terminated`));
              }
            }
          });
          processStopped = true;
          break; // Stop after first successful pattern match
        }
      } catch (error) {
        // This pattern didn't match any processes, continue to next pattern
        continue;
      }
    }
  }

  if (processStopped) {
    console.log(chalk.green('  └─ Local Node stopped successfully'));
  } else {
    console.log(chalk.gray('  └─ No running Local Node found'));
  }
}

export function removeDirectory(dirPath: string): void {
  try {
    if (fs.existsSync(dirPath)) {
      console.log(chalk.yellow(`🗑️  Removing directory: ${dirPath}`));
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(chalk.green('  └─ Directory removed successfully'));
    } else {
      console.log(chalk.gray(`  └─ Directory ${dirPath} does not exist`));
    }
  } catch (error: any) {
    console.error(chalk.red(`  └─ Error removing directory: ${error.message}`));
  }
}

function isSuiStartRunning(): boolean {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`tasklist /FI "IMAGENAME eq sui.exe" /FO CSV /NH`).toString().trim();
      return result.toLowerCase().includes('sui.exe');
    } else {
      // Try multiple patterns to detect running sui processes
      const patterns = ['sui start', 'sui.*start', '^sui', 'sui.*--with-faucet'];

      for (const pattern of patterns) {
        try {
          const result = execSync(`pgrep -f "${pattern}"`, { stdio: 'pipe' }).toString().trim();
          if (result && result.length > 0) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function printAccounts() {
  // These private keys are used for testing purposes only, do not use them in production.
  const privateKeys = [
    'suiprivkey1qq3ez3dje66l8pypgxynr7yymwps6uhn7vyczespj84974j3zya0wdpu76v',
    'suiprivkey1qp6vcyg8r2x88fllmjmxtpzjl95gd9dugqrgz7xxf50w6rqdqzetg7x4d7s',
    'suiprivkey1qpy3a696eh3m55fwa8h38ss063459u4n2dm9t24w2hlxxzjp2x34q8sdsnc',
    'suiprivkey1qzxwp29favhzrjd95f6uj9nskjwal6nh9g509jpun395y6g72d6jqlmps4c',
    'suiprivkey1qzhq4lv38sesah4uzsqkkmeyjx860xqjdz8qgw36tmrdd5tnle3evxpng57',
    'suiprivkey1qzez45sjjsepjgtksqvpq6jw7dzw3zq0dx7a4sulfypd73acaynw5jl9x2c'
  ];
  console.log('📝Accounts');
  console.log('==========');
  privateKeys.forEach((privateKey, index) => {
    const dubhe = new Dubhe({ secretKey: privateKey });
    const keypair = dubhe.getSigner();
    spawn(
      'curl',
      [
        '--location',
        '--request',
        'POST',
        'http://127.0.0.1:9123/gas',
        '--header',
        'Content-Type: application/json',
        '--data-raw',
        `{"FixedAmountRequest": {"recipient": "${keypair.toSuiAddress()}"}}`
      ],
      {
        env: { ...process.env },
        stdio: 'ignore',
        detached: true
      }
    );
    console.log(`  ┌─ Account #${index}: ${keypair.toSuiAddress()}(1000 SUI)`);
    console.log(`  └─ Private Key: ${privateKey}`);
  });
  console.log('==========');
  console.log(
    chalk.yellow('ℹ️ WARNING: These accounts, and their private keys, are publicly known.')
  );
  console.log(
    chalk.yellow('Any funds sent to them on Mainnet or any other live network WILL BE LOST.')
  );
}

function handleProcessSignals(suiProcess: ReturnType<typeof spawn> | null) {
  const cleanup = () => {
    console.log(chalk.yellow('\n🔔 Stopping Local Node...'));
    if (suiProcess) {
      suiProcess.kill('SIGINT');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

export async function startLocalNode(data_dir: string, force?: boolean) {
  if (force) {
    console.log(chalk.cyan('\n🔄 Force mode enabled'));
    stopLocalNode();
    console.log(chalk.yellow('  ├─ Waiting for processes to terminate...'));
    await delay(3000); // Wait longer for process to fully stop
    removeDirectory(data_dir);
    console.log('');
  } else if (isSuiStartRunning()) {
    console.log(chalk.yellow('\n⚠️  Warning: Local Node Already Running'));
    console.log(chalk.yellow('  ├─ Cannot start a new instance'));
    console.log(chalk.yellow('  └─ Please stop the existing process first'));
    return;
  }

  printDubhe();
  console.log('🚀 Starting Local Node...');
  let suiProcess: ReturnType<typeof spawn> | null = null;
  try {
    const args = ['start', '--with-faucet'];
    if (force) {
      args.push('--force-regenesis');
    }
    args.push('--data-ingestion-dir', data_dir);

    suiProcess = spawn('sui', args, {
      env: { ...process.env, RUST_LOG: 'off,sui_node=info' },
      stdio: 'ignore'
    });

    suiProcess.on('error', (error) => {
      console.error(chalk.red('\n❌ Failed to Start Local Node'));
      console.error(chalk.red(`  └─ Error: ${error.message}`));
    });
    await delay(5000);
    console.log('  ├─ Faucet: Enabled');
    console.log(`  ├─ Force Regenesis: ${force ? 'Yes' : 'No'}`);
    console.log('  ├─ RPC server: http://127.0.0.1:9000/');
    console.log('  └─ Faucet server: http://127.0.0.1:9123/');

    await printAccounts();

    await delay(2000);

    const privateKeyFormat = validatePrivateKey(
      'suiprivkey1qzez45sjjsepjgtksqvpq6jw7dzw3zq0dx7a4sulfypd73acaynw5jl9x2c'
    );
    if (privateKeyFormat === false) {
      throw new DubheCliError(`Please check your privateKey.`);
    }

    console.log(chalk.green('🎉 Local environment is ready!'));

    handleProcessSignals(suiProcess);

    await new Promise<void>((resolve) => {
      suiProcess?.on('exit', () => resolve());
    });
  } catch (error: any) {
    console.error(chalk.red('\n❌ Failed to Start Local Node'));
    console.error(chalk.red(`  └─ Error: ${error.message}`));
    if (suiProcess) {
      suiProcess.kill('SIGINT');
    }
    process.exit(1);
  }
}
