/**
 * Move framework tests: orchestrate `sui move test` for each e2e Move package.
 *
 * Before each test run, this suite:
 *   1. Syncs framework/src/dubhe/sources → each package's dubhe/sources dir
 *   2. Runs generate for counter/example/template packages (always fresh codegen)
 *   3. Runs `sui move test` on each package
 *
 * Packages tested:
 *   - e2e/src/counter                           — counter increment tests (e2e)
 *   - e2e/src/dubhe                             — core framework unit tests
 *   - e2e/src/example                           — all resource/component type coverage tests
 *   - e2e/src/guild                             — annotation codegen regression (objects/scenes/annotations)
 *   - templates/101/sui-template counter        — 101 starter template
 *   - templates/nextjs/sui-template counter     — nextjs starter template
 *
 * Prerequisites:
 *   - sui CLI installed (`sui --version`)
 *   - Network access for first-time dependency download
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { schemaGen } from '@0xobelisk/sui-common';
import { dubheConfig as counterConfig } from '../../counter.config.js';
import { exampleConfig } from '../../example.config.js';
import { guildConfig } from '../../guild.config.js';
import { dubheConfig as template101Config } from '../../../templates/101/sui-template/packages/contracts/dubhe.config.js';
import { dubheConfig as templateNextjsConfig } from '../../../templates/nextjs/sui-template/packages/contracts/dubhe.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_DIR = path.resolve(__dirname, '../../');
const FRAMEWORK_DIR = path.resolve(__dirname, '../../../framework/src/dubhe');
const TEMPLATE_101_CONTRACTS = path.resolve(
  __dirname,
  '../../../templates/101/sui-template/packages/contracts'
);
const TEMPLATE_NEXTJS_CONTRACTS = path.resolve(
  __dirname,
  '../../../templates/nextjs/sui-template/packages/contracts'
);

function isSuiCliInstalled(): boolean {
  try {
    execSync('sui --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const suiAvailable = isSuiCliInstalled();

if (!suiAvailable) {
  console.warn('\n⚠  Skipping Move framework tests: sui CLI not found in PATH.');
  console.warn(
    '   Install from: https://docs.sui.io/guides/developer/getting-started/sui-install\n'
  );
}

function runMoveTest(packagePath: string, buildEnv: string = 'testnet', filter?: string): string {
  const quotedPath = JSON.stringify(packagePath);
  const filterSuffix = filter ? ` ${JSON.stringify(filter)}` : '';
  return execSync(
    `sui move test --path ${quotedPath} --build-env ${buildEnv} --gas-limit 1000000000${filterSuffix}`,
    {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: path.dirname(packagePath),
      timeout: 300_000
    }
  );
}

/** Sync the latest framework sources into a target dubhe package directory. */
function syncFramework(targetContractsRoot: string): void {
  const targetDubheDir = path.join(targetContractsRoot, 'src', 'dubhe');

  // Ensure src/dubhe/ exists — it is not tracked in git for template packages,
  // so on a fresh CI checkout the directory does not exist.
  mkdirSync(targetDubheDir, { recursive: true });

  // Sync Move.toml — required for `sui move test` to recognise ../dubhe as a
  // valid Move package.
  const frameworkMoveToml = path.join(FRAMEWORK_DIR, 'Move.toml');
  const targetMoveToml = path.join(targetDubheDir, 'Move.toml');
  cpSync(frameworkMoveToml, targetMoveToml);

  // Sync sources directory
  const frameworkSourcesDir = path.join(FRAMEWORK_DIR, 'sources');
  const targetDubheSourcesDir = path.join(targetDubheDir, 'sources');
  rmSync(targetDubheSourcesDir, { recursive: true, force: true });
  cpSync(frameworkSourcesDir, targetDubheSourcesDir, { recursive: true });
}

describe.skipIf(!suiAvailable)('Move framework: setup', () => {
  it('sync framework sources and regenerate codegen for all packages', async () => {
    // ── e2e packages ──────────────────────────────────────────────────────────
    console.log('  [e2e] Syncing framework sources...');
    syncFramework(E2E_DIR);
    console.log('  [e2e] Running generate for counter...');
    await schemaGen(E2E_DIR, counterConfig);
    console.log('  [e2e] Running generate for example...');
    await schemaGen(E2E_DIR, exampleConfig);
    console.log('  [e2e] Running generate for guild (annotation regression)...');
    await schemaGen(E2E_DIR, guildConfig);
    console.log('  [e2e] Setup complete.');

    // ── templates/101 ─────────────────────────────────────────────────────────
    console.log('  [template-101] Syncing framework sources...');
    syncFramework(TEMPLATE_101_CONTRACTS);
    console.log('  [template-101] Running generate for counter...');
    await schemaGen(TEMPLATE_101_CONTRACTS, template101Config);
    console.log('  [template-101] Setup complete.');

    // ── templates/nextjs ──────────────────────────────────────────────────────
    console.log('  [template-nextjs] Syncing framework sources...');
    syncFramework(TEMPLATE_NEXTJS_CONTRACTS);
    console.log('  [template-nextjs] Running generate for counter...');
    await schemaGen(TEMPLATE_NEXTJS_CONTRACTS, templateNextjsConfig);
    console.log('  [template-nextjs] Setup complete.');

    expect(true).toBe(true);
  }, 180_000);
});

describe.skipIf(!suiAvailable)('Move framework: sui move test', () => {
  // ─── e2e/counter ──────────────────────────────────────────────────────────

  it('e2e counter package — Move unit tests pass', () => {
    const pkgPath = path.join(E2E_DIR, 'src', 'counter');
    const output = runMoveTest(pkgPath);

    expect(output).toMatch(/Test result:\s*OK/i);
    console.log(`  counter: ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 300_000);

  // ─── e2e/dubhe framework ──────────────────────────────────────────────────

  it('e2e dubhe framework package — core tests pass', () => {
    const pkgPath = path.join(E2E_DIR, 'src', 'dubhe');
    const output = runMoveTest(pkgPath);

    expect(output).toMatch(/Test result:\s*OK/i);
    const resultLine = output.match(/Test result:.+/)?.[0]?.trim();
    console.log(`  dubhe: ${resultLine}`);
  }, 300_000);

  it('e2e dubhe framework — filter runs one storage_test only', () => {
    const pkgPath = path.join(E2E_DIR, 'src', 'dubhe');
    const output = runMoveTest(pkgPath, 'testnet', 'test_set_record_creates_record');

    expect(output).toMatch(/Test result:\s*OK/i);
    expect(output).toMatch(/Total tests:\s*1/i);
    expect(output).toContain('dubhe::storage_test::test_set_record_creates_record');
    console.log(`  dubhe (filtered): ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 300_000);

  // ─── e2e/example ──────────────────────────────────────────────────────────

  it('e2e example package — all type coverage tests pass', () => {
    const pkgPath = path.join(E2E_DIR, 'src', 'example');
    const output = runMoveTest(pkgPath);

    expect(output).toMatch(/Test result:\s*OK/i);
    console.log(`  example: ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 300_000);

  // ─── e2e/guild: annotation codegen regression ─────────────────────────────

  it('e2e guild package — objects/scenes/annotation codegen compiles and passes', () => {
    const pkgPath = path.join(E2E_DIR, 'src', 'guild');
    const output = runMoveTest(pkgPath);

    expect(output).toMatch(/Test result:\s*OK/i);
    console.log(`  guild: ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 300_000);

  // ─── templates/101 counter ────────────────────────────────────────────────

  it('template-101 counter — Move unit tests pass', () => {
    const pkgPath = path.join(TEMPLATE_101_CONTRACTS, 'src', 'counter');
    const output = runMoveTest(pkgPath);

    expect(output).toMatch(/Test result:\s*OK/i);
    console.log(`  template-101: ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 300_000);

  // ─── templates/nextjs counter ─────────────────────────────────────────────

  it('template-nextjs counter — Move unit tests pass', () => {
    const pkgPath = path.join(TEMPLATE_NEXTJS_CONTRACTS, 'src', 'counter');
    const output = runMoveTest(pkgPath);

    expect(output).toMatch(/Test result:\s*OK/i);
    console.log(`  template-nextjs: ${output.match(/Test result:.+/)?.[0]?.trim()}`);
  }, 300_000);
});

describe.skipIf(!suiAvailable)('Move framework: sui CLI version check', () => {
  it('sui CLI is installed and reports a version', () => {
    const version = execSync('sui --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    expect(version).toMatch(/sui/i);
    console.log(`  sui version: ${version}`);
  });
});
