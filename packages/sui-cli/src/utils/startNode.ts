import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import { printDubhe } from './printDubhe';
import { delay, DubheCliError, validatePrivateKey } from '../utils';
import { Dubhe } from '@0xobelisk/sui-client';

function isSuiStartRunning(): boolean {
  try {
    const cmd =
      process.platform === 'win32'
        ? `tasklist /FI "IMAGENAME eq sui.exe" /FO CSV /NH`
        : 'pgrep -f "sui start"';

    const result = execSync(cmd).toString().trim();
    return process.platform === 'win32'
      ? result.toLowerCase().includes('sui.exe')
      : result.length > 0;
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

export async function startLocalNode() {
  if (isSuiStartRunning()) {
    console.log(chalk.yellow('\n⚠️  Warning: Local Node Already Running'));
    console.log(chalk.yellow('  ├─ Cannot start a new instance'));
    console.log(chalk.yellow('  └─ Please stop the existing process first'));
    return;
  }

  printDubhe();
  console.log('🚀 Starting Local Node...');
  let suiProcess: ReturnType<typeof spawn> | null = null;
  try {
    suiProcess = spawn('sui', ['start', '--with-faucet', '--force-regenesis'], {
      env: { ...process.env, RUST_LOG: 'off,sui_node=info' },
      stdio: 'ignore'
    });

    suiProcess.on('error', (error) => {
      console.error(chalk.red('\n❌ Failed to Start Local Node'));
      console.error(chalk.red(`  └─ Error: ${error.message}`));
    });
    await delay(5000);
    console.log('  ├─ Faucet: Enabled');
    console.log('  └─ Force Regenesis: Yes');
    console.log('  └─ HTTP server: http://127.0.0.1:9000/');
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