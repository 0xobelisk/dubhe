import { isInitiaNodeRunning } from './start';
import { spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function cleanLocalNodeState() {
  console.log('\n🔍 Checking Local Node Status...');
  console.log('  ├─ Scanning running processes');

  if (isInitiaNodeRunning()) {
    console.log(chalk.yellow('\n⚠️  Warning: Local Node Already Running'));
    console.log(chalk.yellow('  └─ Please stop the existing process first'));
    return;
  }

  console.log('\n🚀 Cleaning Local Node State...');

  try {
    // Script content as a string
    const scriptContent = `
#!/bin/bash

NODE_NAME="initia"
DENOM="uinit"

## DO NOT CHANGE BELOW THIS LINE

TESTNET_NAME="local-\${NODE_NAME}"
NODE_MONIKER="local-\${NODE_NAME}"
NODE_BIN="\${NODE_NAME}d"
HOME=$(pwd)
BASE_HOME=$HOME/.${TESTNET_NAME}
INITIA_HOME=$BASE_HOME/.$NODE_NAME
GENESIS_FILE=$INITIA_HOME/config/genesis.json

# Remove existing data
rm $INITIA_HOME/config/genesis.json
rm -r $INITIA_HOME/config/gentx/*
$NODE_BIN tendermint unsafe-reset-all --home $INITIA_HOME
rm -rf $BASE_HOME
`;

    // Write script to a temporary file
    const tempDir = os.tmpdir();
    console.log('  ├─ Temp Directory: ' + tempDir);
    const scriptPath = path.join(tempDir, 'clean-localnode.sh');
    console.log('  ├─ Script Path: ' + scriptPath);
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    const nodeProcess = spawn('bash', [scriptPath], {
      stdio: 'inherit'
    });

    nodeProcess.on('error', (error) => {
      console.error(chalk.red('\n❌ Failed to Clean Local Node State'));
      console.error(chalk.red(`  └─ Error: ${error.message}`));
    });

    nodeProcess.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✅ Local Node State Cleaned Successfully'));
        console.log(chalk.green('  └─ Status: Completed'));
      } else {
        console.error(chalk.red('\n❌ Failed to Clean Local Node State'));
        console.error(chalk.red(`  └─ Error Code: ${code}`));
      }
    });

    await new Promise(() => {});
  } catch (error: any) {
    console.error(chalk.red('\n❌ Failed to Clean Local Node State'));
    console.error(chalk.red(`  └─ Error: ${error.message}`));
  }
}
