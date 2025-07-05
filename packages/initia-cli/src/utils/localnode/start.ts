import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';

export function isInitiaNodeRunning(): boolean {
	try {
		const cmd =
			process.platform === 'win32'
				? `tasklist /FI "IMAGENAME eq initiad.exe" /FO CSV /NH`
				: 'pgrep -f "initiad start"';

		const result = execSync(cmd).toString().trim();
		return process.platform === 'win32'
			? result.toLowerCase().includes('initiad.exe')
			: result.length > 0;
	} catch (error) {
		return false;
	}
}

export async function startLocalnode(background: boolean = false) {
	console.log('\n🔍 Checking Local Node Status...');
	console.log('  ├─ Scanning running processes');

	if (isInitiaNodeRunning()) {
		console.log(chalk.yellow('\n⚠️  Warning: Local Node Already Running'));
		console.log(chalk.yellow('  ├─ Cannot start a new instance'));
		console.log(
			chalk.yellow('  └─ Please stop the existing process first')
		);
		return;
	}

	console.log('\n🚀 Starting Local Node...');
	console.log('  ├─ Mode: ' + (background ? 'Background' : 'Foreground'));
	console.log('  ├─ Faucet: Enabled');
	console.log('  └─ Force Regenesis: Yes');

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
CURRENT_DIR=$(pwd)
BASE_HOME=$CURRENT_DIR/.$\{TESTNET_NAME}
INITIA_HOME=$BASE_HOME/.$\{NODE_NAME}
GENESIS_FILE=$INITIA_HOME/config/genesis.json

$NODE_BIN init --chain-id=$TESTNET_NAME $NODE_MONIKER --home $INITIA_HOME

# Modify genesis.json config to reduce voting period
jq '.app_state.gov.params.voting_period = "10s" | .app_state.gov.params.max_deposit_period = "10s"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.gov.params.threshold = "0.1"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.gov.params.quorum = "0.1"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.gov.params.veto_threshold = "0.1"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.gov.params.emergency_tally_interval = "5s"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# expedited_voting_period should be less than voting period
jq '.app_state.gov.params.expedited_voting_period = "5s"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# Enable API and Swagger
sed -i '' \\
    -e '/^\\[api\\]/,/^\\[grpc\\]/ s/^enable = .*/enable = true/' \\
    -e '/^\\[api\\]/,/^\\[grpc\\]/ s/^swagger = .*/swagger = true/' \\
    -e '/^\\[api\\]/,/^\\[grpc\\]/ s/^enabled-unsafe-cors = .*/enabled-unsafe-cors = true/' \\
    $INITIA_HOME/config/app.toml

# helper functions
add_key() {
  local user=$1
  local key=$2
  $NODE_BIN keys add $user --keyring-backend test --recover --home $INITIA_HOME <<EOF
$key 
EOF
}

add_genesis_account() {
  local user=$1
  local amount=$2
  local address=$($NODE_BIN keys show $user -a --keyring-backend test --home $INITIA_HOME)
  $NODE_BIN genesis add-genesis-account $address $amount --home $INITIA_HOME
}

# User and key arrays 
users=(validator user0 user1)
# These mnemonic phrases cannot be used in a production environment!
keys=(
"rebuild wheat weather rule organ discover knife number suspect purity nut hospital aunt spring border best brave reduce slide light merge brisk vendor trouble"
"space fitness code liar balcony royal series abuse iron thought oven average erupt rival bird dance vocal art patch nice fluid debate school feature"
"trophy mutual trumpet frost betray case amount special guitar viable repeat vibrant enter coffee fog grid alcohol stock wealth ghost lawn hungry season echo"
)

# Adding keys
for i in "\${!users[@]}"; do
  add_key \${users[$i]} "\${keys[$i]}"
done

# Adding genesis accounts
add_genesis_account validator "1000000000000000\${DENOM},1000000000000000uusdc"
for user in "\${users[@]:1}"; do
  add_genesis_account $user "1000000000000000\${DENOM},1000000000000000uusdc"
done

$NODE_BIN genesis gentx validator 100000000000000$DENOM --chain-id $TESTNET_NAME --keyring-backend test --home $INITIA_HOME
$NODE_BIN genesis collect-gentxs --home $INITIA_HOME

$NODE_BIN start --home $INITIA_HOME
`;

		// Write script to a temporary file
		const tempDir = os.tmpdir();
		console.log('  ├─ Temp Directory: ' + tempDir);
		const scriptPath = path.join(tempDir, 'start-localnode.sh');
		console.log('  ├─ Script Path: ' + scriptPath);
		fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

		if (background) {
			spawn('bash', [scriptPath], {
				stdio: 'ignore',
				detached: true,
			}).unref();

			console.log(chalk.green('\n✅ Local Node Started in Background'));
			console.log('\n💡 Helpful Commands:');
			console.log("  ├─ Check Process: pgrep -f 'initiad start'");
			console.log('  └─ Stop Node: kill <process_id>');
		} else {
			const nodeProcess = spawn('bash', [scriptPath], {
				stdio: 'inherit',
			});

			nodeProcess.on('error', error => {
				console.error(chalk.red('\n❌ Failed to Start Local Node'));
				console.error(chalk.red(`  └─ Error: ${error.message}`));
			});

			nodeProcess.on('exit', code => {
				if (code === 0) {
					console.log(chalk.green('\n✅ Local Node Stopped'));
					console.log(chalk.green('  └─ Exit Status: Normal'));
				} else {
					console.error(chalk.red('\n❌ Local Node Crashed'));
					console.error(chalk.red(`  └─ Exit Code: ${code}`));
				}
			});

			console.log(chalk.cyan('\n📡 Local Node Running'));
			console.log(chalk.cyan('  └─ Press Ctrl+C to stop'));

			await new Promise(() => {});
		}
	} catch (error: any) {
		console.error(chalk.red('\n❌ Failed to Start Local Node'));
		console.error(chalk.red(`  └─ Error: ${error.message}`));
	}
}
