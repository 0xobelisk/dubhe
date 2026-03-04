import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import glob from 'fast-glob';
import { fileURLToPath } from 'node:url';
import { exists } from '../src/exists';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const packageDir = path.resolve(__dirname, '..');
  const rootDir = path.resolve(packageDir, '../..');

  // TODO: could swap this with `pnpm m ls --json --depth=-1`
  const dubhePackageNames = await (async () => {
    const files = await glob('packages/*/package.json', { cwd: rootDir });
    const packages = await Promise.all(
      files.map(async (file) => JSON.parse(await fs.readFile(path.join(rootDir, file), 'utf-8')))
    );
    return packages.filter((p) => !p.private).map((p) => p.name);
  })();

  const sourceDir = path.join(rootDir, 'templates');
  const destDir = path.join(packageDir, 'templates');

  // clean
  if (await exists(destDir)) {
    await fs.rm(destDir, { recursive: true });
  }

  const files = (await execa('git', ['ls-files'], { cwd: sourceDir })).stdout.trim().split('\n');

  for (const file of files) {
    const sourcePath = path.resolve(sourceDir, file);
    const destPath = path.resolve(destDir, file);

    if (/pnpm-lock\.yaml$/.test(destPath)) {
      continue;
    }

    await fs.mkdir(path.dirname(destPath), { recursive: true });

    if (/package\.json$/.test(destPath)) {
      let source = await fs.readFile(sourcePath, 'utf-8');
      // Replace all Dubhe package links with placeholder that we can use to later replace
      // with the latest Dubhe version number when the template is used.
      source = source.replace(/"([^"]+)":\s*"(link|file):[^"]+"/g, (match, packageName) =>
        dubhePackageNames.includes(packageName) ? `"${packageName}": "{{dubhe-version}}"` : match
      );
      const json = JSON.parse(source);
      // Strip out pnpm overrides
      delete json.pnpm;
      await fs.writeFile(destPath, JSON.stringify(json, null, 2) + '\n');
    }
    // Replace template workspace root `tsconfig.json` files (which have paths relative to monorepo)
    // with one that inherits our base tsconfig.
    else if (/templates\/[^/]+\/tsconfig\.json$/.test(destPath)) {
      await fs.copyFile(path.join(__dirname, 'tsconfig.base.json'), destPath);
    }
    // npm excludes .gitignore files during packaging/publishing, so we move this aside for now.
    // When creating a project from the template, we'll move this back.
    else if (/\.gitignore$/.test(destPath)) {
      await fs.copyFile(sourcePath, destPath.replace(/\.gitignore$/, '.gitignore_'));
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
  }

  // Copy dubhe folder to templates
  const dubheSourcePath = path.join(rootDir, 'framework/src/dubhe');

  if (!(await exists(dubheSourcePath))) {
    console.error(`Source dubhe folder not found at: ${dubheSourcePath}`);
    return;
  }

  const templates = await fs.readdir(destDir);

  for (const template of templates) {
    const templatePath = path.join(destDir, template);
    const isContractTemplate = template.includes('contract');
    const targetPath = isContractTemplate
      ? path.join(templatePath, 'sui-template/src')
      : path.join(templatePath, 'sui-template/packages/contracts/src');
    const dubheDestPath = path.join(targetPath, 'dubhe');

    try {
      await fs.mkdir(targetPath, { recursive: true });
      await fs.cp(dubheSourcePath, dubheDestPath, {
        recursive: true,
        force: true,
        errorOnExist: false
      });

      // Remove .history directory to avoid uploading test data
      const historyPath = path.join(dubheDestPath, '.history');
      if (await exists(historyPath)) {
        await fs.rm(historyPath, { recursive: true });
      }
    } catch (error) {
      console.error(`Error copying dubhe to ${template}: ${error}`);
    }
  }

  // Strip stale localnet env sections from all Move.lock files in the generated templates.
  // When building with --build-env testnet for a fresh localnet deploy, Sui CLI reads
  // Move.lock's [env.testnet] (or [env.localnet] from a previous run on a different chain)
  // and bakes the stored non-zero address into the bytecode, causing PublishErrorNonZeroAddress.
  // Removing localnet sections here ensures templates always start clean.
  const moveLockFiles = await glob('**/Move.lock', { cwd: destDir, dot: true });
  for (const lockFile of moveLockFiles) {
    const lockPath = path.join(destDir, lockFile);
    let content = await fs.readFile(lockPath, 'utf-8');
    // Remove [env.localnet] sections (Move.lock v3 format)
    content = content.replace(/\[env\.localnet\][\s\S]*?(?=\[|$)/g, '');
    // Remove trailing blank lines left by removal
    content = content.trimEnd() + '\n';
    await fs.writeFile(lockPath, content, 'utf-8');
  }
})();
