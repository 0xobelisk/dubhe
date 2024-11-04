import chalk from 'chalk';
import { deployContract } from '../common';
import { obeliskConfig } from '../../../obelisk.config';
import fs from 'fs/promises';
import path from 'path';

const TESTNET_FRAMEWORK_ID = '0x3dc2d6239eed38c9798444afbf4bada0998ec98edc365713864405fe64203256';

async function updateObeliskMoveToml(projectName: string) {
  try {
    console.log(chalk.blue(`\n🔍 Updating Move.toml...`));
    const moveTomlPath = path.join(process.cwd(), `contracts/${projectName}/Move.toml`);
    let content = await fs.readFile(moveTomlPath, 'utf8');

    content = content.replace(
      /Obelisk = \{[^}]+\}/,
      `Obelisk = { git = "https://github.com/0xobelisk/obelisk-engine.git", subdir = "packages/obelisk-framework", rev = "main" }`,
    );

    content = content.replace(/^obelisk\s+=\s+"0x[0-9a-fA-F]+"/m, `obelisk = "${TESTNET_FRAMEWORK_ID}"`);

    await fs.writeFile(moveTomlPath, content);
    console.log(chalk.green('  ✅ Move.toml updated successfully'));
  } catch (error) {
    throw new Error(`Failed to update Move.toml: ${error}`);
  }
}

async function main() {
  try {
    await updateObeliskMoveToml(obeliskConfig.name);
    await deployContract('testnet');
    console.log(chalk.green('\n✅ All operations completed successfully'));
  } catch (error) {
    console.error(chalk.red(`\n❌ Execution failed: ${error}`));
    process.exit(1);
  }
}

// Use IIFE (Immediately Invoked Function Expression) to ensure async code executes correctly
(async () => {
  try {
    await main();
  } catch (error) {
    console.error(chalk.red(`\n❌ Main program execution failed: ${error}`));
    process.exit(1);
  }
})();
