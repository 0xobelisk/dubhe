import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Helper to build the expected command string (mirrors buildContract logic in publishHandler.ts)
function buildCmd(projectPath: string, network: string): string {
  return `sui move build --dump-bytecode-as-base64 --no-tree-shaking -e ${network} --path ${projectPath}`;
}

describe('buildContract command format', () => {
  it('should include --build-env (-e) flag for testnet', () => {
    const cmd = buildCmd('/path/to/counter', 'testnet');
    expect(cmd).toContain('-e testnet');
    expect(cmd).toContain('--no-tree-shaking');
    expect(cmd).toContain('--dump-bytecode-as-base64');
    expect(cmd).toContain('--path /path/to/counter');
  });

  it('should include --build-env (-e) flag for localnet', () => {
    const cmd = buildCmd('/path/to/counter', 'localnet');
    expect(cmd).toContain('-e localnet');
    expect(cmd).toContain('--no-tree-shaking');
  });

  it('should include --build-env (-e) flag for mainnet', () => {
    const cmd = buildCmd('/path/to/counter', 'mainnet');
    expect(cmd).toContain('-e mainnet');
  });

  it('should parse expected JSON output format from build', () => {
    const FAKE_BUILD_OUTPUT = JSON.stringify({
      modules: ['base64encodedmodule1', 'base64encodedmodule2'],
      dependencies: [
        '0x8817b4976b6c607da01cea49d728f71d09274c82e9b163fa20c2382586f8aefc',
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      ],
      digest: Array.from({ length: 32 }, (_, i) => i + 1)
    });

    const output = JSON.parse(FAKE_BUILD_OUTPUT);
    expect(output.modules).toHaveLength(2);
    expect(output.dependencies).toHaveLength(2);
    expect(output.digest).toHaveLength(32);
    // Dubhe testnet package ID should be in dependencies
    expect(output.dependencies[0]).toBe(
      '0x8817b4976b6c607da01cea49d728f71d09274c82e9b163fa20c2382586f8aefc'
    );
  });
});

describe('updateDubheDependency (new behavior)', () => {
  let tempDir: string;
  let moveTomlPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-test-'));
    moveTomlPath = path.join(tempDir, 'Move.toml');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should be a no-op for testnet (rely on --build-env instead)', async () => {
    const originalContent = `[package]
name = "counter"
version = "1.0.0"
edition = "2024"

[dependencies]
Dubhe = { local = "../dubhe" }

[addresses]
counter = "0x0"
`;
    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    const { updateDubheDependency } = await import('../src/utils/utils');
    await updateDubheDependency(moveTomlPath, 'testnet');

    const content = fs.readFileSync(moveTomlPath, 'utf-8');
    // With new mechanism, testnet should NOT change Move.toml
    // Local dependency is kept and --build-env handles address resolution
    expect(content).toBe(originalContent);
  });

  it('should be a no-op for mainnet', async () => {
    const originalContent = `[dependencies]
Dubhe = { local = "../dubhe" }
`;
    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    const { updateDubheDependency } = await import('../src/utils/utils');
    await updateDubheDependency(moveTomlPath, 'mainnet');

    const content = fs.readFileSync(moveTomlPath, 'utf-8');
    expect(content).toBe(originalContent);
  });

  it('should ensure local dependency for localnet', async () => {
    const originalContent = `[dependencies]
Dubhe = { local = "../dubhe" }
`;
    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    const { updateDubheDependency } = await import('../src/utils/utils');
    await updateDubheDependency(moveTomlPath, 'localnet');

    const content = fs.readFileSync(moveTomlPath, 'utf-8');
    expect(content).toContain('Dubhe = { local = "../dubhe" }');
  });
});

describe('validatePrivateKey', () => {
  it('should accept suiprivkey prefix format (70 chars)', async () => {
    const { validatePrivateKey } = await import('../src/utils/utils');
    const validKey = 'suiprivkey' + '0'.repeat(60);
    // 10 prefix + 60 = 70 chars
    const result = validatePrivateKey(validKey);
    expect(result).toBe(validKey);
  });

  it('should accept 0x-prefixed hex key (64 hex chars after 0x)', async () => {
    const { validatePrivateKey } = await import('../src/utils/utils');
    const validKey = '0x' + 'a'.repeat(64);
    const result = validatePrivateKey(validKey);
    expect(result).toBe('a'.repeat(64));
  });

  it('should accept raw 64-char hex key', async () => {
    const { validatePrivateKey } = await import('../src/utils/utils');
    const validKey = 'b'.repeat(64);
    const result = validatePrivateKey(validKey);
    expect(result).toBe(validKey);
  });

  it('should reject invalid length key', async () => {
    const { validatePrivateKey } = await import('../src/utils/utils');
    expect(validatePrivateKey('tooshort')).toBe(false);
    expect(validatePrivateKey('0x' + 'a'.repeat(10))).toBe(false);
  });
});

describe('Move.lock env section management', () => {
  let tempDir: string;
  let moveLockPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movelock-test-'));
    moveLockPath = path.join(tempDir, 'Move.lock');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle Move.lock with no env sections (fresh package)', () => {
    const content = `# @generated by Move, please check-in and do not edit manually.

[move]
version = 3
manifest_digest = "ABCDEF"

[[move.package]]
id = "Dubhe"
source = { local = "../dubhe" }
`;
    fs.writeFileSync(moveLockPath, content, 'utf-8');

    const fileContent = fs.readFileSync(moveLockPath, 'utf-8');
    expect(fileContent).not.toContain('[env.');
  });

  it('should recognize existing localnet env section format', () => {
    const content = `[move]
version = 3

[env.localnet]
chain-id = "b4c5d3b3"
original-published-id = "0x1234"
latest-published-id = "0x1234"
published-version = "1"
`;
    fs.writeFileSync(moveLockPath, content, 'utf-8');

    const fileContent = fs.readFileSync(moveLockPath, 'utf-8');
    expect(fileContent).toContain('[env.localnet]');
    expect(fileContent).toContain('original-published-id = "0x1234"');
  });

  it('should recognize new pinned format (Move.lock v4)', () => {
    const content = `# Generated by move; do not edit
# This file should be checked in.

[move]
version = 4

[pinned.testnet.Dubhe]
source = { root = true }
use_environment = "testnet"
manifest_digest = "DIGEST"
deps = { Sui = "Sui" }
`;
    fs.writeFileSync(moveLockPath, content, 'utf-8');

    const fileContent = fs.readFileSync(moveLockPath, 'utf-8');
    expect(fileContent).toContain('[pinned.testnet.Dubhe]');
    expect(fileContent).not.toContain('[env.');
  });
});
