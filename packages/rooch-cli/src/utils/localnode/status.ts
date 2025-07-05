import { execSync } from 'child_process';
import chalk from 'chalk';

export async function checkLocalNodeStatus() {
	console.log('\n🔍 Checking Local Node Status...');

	try {
		const cmd =
			process.platform === 'win32'
				? `tasklist /FI "IMAGENAME eq rooch.exe" /FO CSV /NH`
				: "ps aux | grep '[r]ooch server start'";

		const output = execSync(cmd, {
			encoding: 'utf8',
		});

		const isRunning =
			process.platform === 'win32'
				? output.toLowerCase().includes('rooch.exe')
				: output.split('\n').filter(Boolean).length > 0;

		if (isRunning) {
			console.log(chalk.green('\n✅ Node Status: Running'));
			console.log(chalk.gray('\n📊 Process Details:'));
			console.log(chalk.gray(`  └─ ${output.trim()}`));
		} else {
			console.log(chalk.red('\n❌ Node Status: Not Running'));
			console.log(chalk.yellow('\n💡 Quick Start:'));
			console.log(chalk.yellow('  └─ Run `dubhe localnode start`'));
		}
	} catch (error) {
		console.log(chalk.red('\n❌ Node Status: Not Running'));
		console.log(chalk.yellow('\n💡 Quick Start:'));
		console.log(chalk.yellow('  └─ Run `dubhe localnode start`'));
	}
}

// checkLocalNodeStatus();
