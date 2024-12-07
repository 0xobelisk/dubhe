import { execSync } from 'child_process';

export async function stopLocalnode() {
	console.log('Stopping local node...');

	try {
		// Choose different commands based on the operating system
		const cmd =
			process.platform === 'win32'
				? `tasklist /FI "IMAGENAME eq aptos.exe" /FO CSV /NH`
				: "ps aux | grep '[a]ptos node run-localnet'";

		const output = execSync(cmd, {
			encoding: 'utf8',
		});

		if (!output) {
			console.log('No running local node process found');
			return;
		}

		// Parse process ID based on the operating system
		let pid;
		if (process.platform === 'win32') {
			// Windows output format: "aptos.exe","1234",... (CSV format)
			const match = output.match(/"aptos\.exe",["']?(\d+)/i);
			pid = match ? match[1] : null;
		} else {
			// Unix system output format: user pid %cpu ...
			pid = output.toString().split(/\s+/)[1];
		}

		if (!pid) {
			console.log('No running local node process found');
			return;
		}

		// Choose the command to terminate the process based on the operating system
		if (process.platform === 'win32') {
			execSync(`taskkill /PID ${pid} /F`);
		} else {
			process.kill(Number(pid));
		}

		console.log('✅ Local node stopped successfully');
	} catch (error: any) {
		if (
			error.code === 'ESRCH' ||
			error.message.includes('no running tasks')
		) {
			console.log('No running local node process found');
		} else {
			console.error('❌ Error stopping local node:', error.message);
		}
	}
}

// stopLocalnode();
