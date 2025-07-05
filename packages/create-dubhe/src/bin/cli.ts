import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import glob from 'fast-glob';
import yargsInteractive from 'yargs-interactive';
import { CHAINS } from '../config/chains';
import packageJson from '../../package.json';
import { exists } from '../exists';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cwd = process.cwd();

const defaultTargetDir = 'dubhe-template-project';

const init = async () => {
  // Prepare chain options
  const chainChoices = CHAINS.map(({ title, description, value }) => ({
    name: `${title} - ${description}`,
    value
  }));

  // Step 1: Choose project name and chain
  const firstStep = await yargsInteractive()
    .usage('$0 [args]')
    .interactive({
      interactive: { default: true },
      projectName: {
        describe: 'Name your project',
        type: 'input'
      },
      chain: {
        describe: 'Pick your chain',
        type: 'list',
        choices: chainChoices.map((c) => c.value)
      },
      dubheVersion: {
        describe: 'The version of Dubhe packages to use, defaults to latest',
        type: 'input',
        default: packageJson.version
      }
    });

  const { projectName, chain, dubheVersion } = firstStep;
  if (!projectName) throw new Error('No project name provided.');

  // Get available templates based on the selected chain
  const selectedChain = CHAINS.find((c) => c.value === chain);
  if (!selectedChain) {
    throw new Error('Invalid chain selection');
  }

  // Prepare platform options
  const platformChoices = selectedChain.supportedTemplates.map(({ title, description, value }) => ({
    name: `${title} - ${description}`,
    value
  }));

  // Step 2: Choose platform
  const secondStep = await yargsInteractive()
    .usage('$0 [args]')
    .interactive({
      interactive: { default: true },
      platform: {
        describe: 'Pick your platform',
        type: 'list',
        choices: platformChoices.map((c) => c.value)
      }
    });

  const { platform } = secondStep;

  const selectedTemplate = selectedChain.supportedTemplates.find((t) => t.value === platform);
  if (!selectedTemplate) {
    throw new Error('Invalid platform selection');
  }

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm';

  const sourceDir = path.join(
    __dirname,
    '..',
    'templates',
    selectedTemplate.path.replace('{chain}', chain)
  );

  if (!(await exists(sourceDir))) {
    throw new Error(`Template directory not found: ${sourceDir}`);
  }

  const destDir = path.join(process.cwd(), projectName);
  if (await exists(destDir)) {
    throw new Error(`Target directory "${destDir}" already exists.`);
  }

  const files = await glob('**/*', { cwd: sourceDir, dot: true });

  for (const filename of files) {
    const sourceFile = path.join(sourceDir, filename);
    const destFile = path.join(destDir, filename);

    await fs.mkdir(path.dirname(destFile), { recursive: true });

    if (/package\.json$/.test(sourceFile)) {
      const source = await fs.readFile(sourceFile, 'utf-8');
      await fs.writeFile(destFile, source.replaceAll(/{{dubhe-version}}/g, dubheVersion), 'utf-8');
    } else if (/\.gitignore_$/.test(sourceFile)) {
      await fs.copyFile(sourceFile, destFile.replace(/_$/, ''));
    } else {
      await fs.copyFile(sourceFile, destFile);
    }
  }

  const cdProjectName = path.relative(cwd, destDir);

  const styles = {
    success: '\x1b[32m%s\x1b[0m',
    info: '\x1b[36m%s\x1b[0m',
    command: '\x1b[33m%s\x1b[0m',
    separator: '\x1b[90m%s\x1b[0m'
  };

  console.log('\n' + '='.repeat(60));
  console.log(styles.success, '🎉 Project creation successful!');
  console.log(styles.info, `📁 Project location: ${destDir}`);
  console.log(styles.separator, '-'.repeat(60));
  console.log(styles.info, 'Next steps:\n');

  if (destDir !== cwd) {
    console.log(
      styles.command,
      `  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`
    );
  }

  const actualTemplate = selectedTemplate.value;

  switch (actualTemplate) {
    case '101':
    case 'web':
      console.log(styles.command, `  ${pkgManager} install`);
      console.log(styles.command, `  ${pkgManager} dubhe doctor`);
      console.log(styles.command, `  ${pkgManager} run dev`);
      break;
    case 'contract':
      console.log(styles.command, `  ${pkgManager} install`);
      console.log(styles.command, `  ${pkgManager} dubhe doctor`);
      break;
  }

  console.log(styles.separator, '\n' + '='.repeat(60) + '\n');
};

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1]
  };
}

init().catch((e) => {
  console.error(e);
});
