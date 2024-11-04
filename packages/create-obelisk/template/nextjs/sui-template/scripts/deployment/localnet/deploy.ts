import chalk from 'chalk';
import { deployFramework } from '../../framework/deploy';
import { validateAndUpdatePackageId } from '../../framework/parse-history';
import { deployContract } from '../common';

async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    // 1. Deploy framework contract
    console.log(chalk.blue('\n🏗️  Deploying framework contract...'));
    await deployFramework();
    console.log(chalk.green('  ✅ Framework contract deployed successfully'));
    await delay(1000);

    // 2. Parse framework information
    console.log(chalk.blue('\n🔍 Parsing framework information...'));
    const deploymentData = await validateAndUpdatePackageId();
    console.log(chalk.green('  ✅ Framework information parsed successfully'));
    await delay(1000);

    // 3. Deploy contract
    const dappsObjectId = deploymentData.dappsObjectId;
    await deployContract('localnet', dappsObjectId);
    // console.log(chalk.green(`  ✅ ${obeliskConfig.name} contract deployed successfully`));
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
