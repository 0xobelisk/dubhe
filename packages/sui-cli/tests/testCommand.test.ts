import { describe, it, expect } from 'vitest';
import { buildSuiMoveTestArgv } from '../src/commands/test';

describe('buildSuiMoveTestArgv', () => {
  it('places filter as the last positional (not --test)', () => {
    const argv = buildSuiMoveTestArgv({
      projectPath: '/proj/src/dubhe',
      gasLimit: '100000000',
      buildEnv: 'testnet',
      filter: 'storage_test::test_set_record_creates_record'
    });
    expect(argv).toEqual([
      'move',
      'test',
      '--build-env',
      'testnet',
      '--path',
      '/proj/src/dubhe',
      '--gas-limit',
      '100000000',
      'storage_test::test_set_record_creates_record'
    ]);
    expect(argv.join(' ')).not.toMatch(/--test/);
  });

  it('omits filter when list is true', () => {
    const argv = buildSuiMoveTestArgv({
      projectPath: '/pkg',
      gasLimit: '100000000',
      buildEnv: 'testnet',
      filter: 'ignored',
      list: true
    });
    expect(argv).toContain('-l');
    expect(argv).not.toContain('ignored');
  });

  it('omits build-env when not set', () => {
    const argv = buildSuiMoveTestArgv({
      projectPath: '/pkg',
      gasLimit: '100000000'
    });
    expect(argv).not.toContain('--build-env');
  });
});
