/**
 * Schemagen tests: errors field
 *
 * When `errors` is defined in DubheConfig, schemaGen generates error.move
 * inside sources/codegen/ containing:
 *   - `#[error] const EErrorName: vector<u8> = b"message";`
 *   - `public fun error_name(condition: bool) { assert!(condition, EErrorName) }`
 */

import { describe, it, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  runSchemaGen,
  cleanupDir,
  readGenerated,
  assertFileExists,
  assertContains,
  defineConfig
} from './helpers.js';

describe('Schemagen: errors field', () => {
  const temps: string[] = [];

  afterAll(() => temps.forEach(cleanupDir));

  it('single error — generates error.move with #[error] const and getter function', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {},
      errors: {
        invalid_increment: "Number can't be incremented, must be more than 0"
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'error.move');
    const content = readGenerated(codegenDir, 'error.move');

    assertContains(content, 'module testpkg::error');
    assertContains(content, '#[error]');
    assertContains(content, 'EInvalidIncrement');
    assertContains(content, 'invalid_increment');
    assertContains(content, "Number can't be incremented, must be more than 0");
  });

  it('multiple errors — all appear in generated error.move', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {},
      errors: {
        not_found: 'Resource not found',
        unauthorized: 'Caller is not authorized',
        overflow: 'Value overflow'
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    assertFileExists(codegenDir, 'error.move');
    const content = readGenerated(codegenDir, 'error.move');

    assertContains(content, 'ENotFound');
    assertContains(content, 'not_found');
    assertContains(content, 'EUnauthorized');
    assertContains(content, 'unauthorized');
    assertContains(content, 'EOverflow');
    assertContains(content, 'overflow');
    assertContains(content, 'Resource not found');
    assertContains(content, 'Caller is not authorized');
    assertContains(content, 'Value overflow');
  });

  it('error constant names use EPascalCase with E prefix', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {},
      errors: {
        my_custom_error: 'Something went wrong'
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'error.move');
    assertContains(content, 'EMyCustomError');
    assertContains(content, 'my_custom_error');
  });

  it('each error generates an assert wrapper function accepting bool', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {},
      errors: {
        bad_input: 'Bad input provided'
      }
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const content = readGenerated(codegenDir, 'error.move');
    assertContains(content, 'EBadInput');
    assertContains(content, 'public fun bad_input(condition: bool)');
  });

  it('object syntax { message } is equivalent to plain string', async () => {
    const configString = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {},
      errors: {
        my_error: 'Something failed'
      }
    });

    const configObject = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: {},
      errors: {
        my_error: { message: 'Something failed' }
      }
    });

    const { tempDir: tmp1, codegenDir: dir1 } = await runSchemaGen(configString);
    const { tempDir: tmp2, codegenDir: dir2 } = await runSchemaGen(configObject);
    temps.push(tmp1, tmp2);

    const content1 = readGenerated(dir1, 'error.move');
    const content2 = readGenerated(dir2, 'error.move');

    assertContains(content1, 'EMyError');
    assertContains(content2, 'EMyError');
    assertContains(content1, 'Something failed');
    assertContains(content2, 'Something failed');
  });

  it('no error.move when errors field is undefined', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { value: 'u32' }
      // no errors field
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const errorPath = path.join(codegenDir, 'error.move');
    expect(fs.existsSync(errorPath)).toBe(false);
  });
});
