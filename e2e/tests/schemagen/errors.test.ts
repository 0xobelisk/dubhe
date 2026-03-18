/**
 * Schemagen tests: errors field
 *
 * When `errors` is defined in DubheConfig, schemaGen generates errors.move
 * inside sources/codegen/ containing:
 *   - `#[error] const ERROR_NAME: vector<u8> = b"message";`
 *   - `public fun error_name_error(condition: bool) { ... }`
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

  it('single error — generates errors.move with #[error] const and helper function', async () => {
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

    assertFileExists(codegenDir, 'errors.move');
    const content = readGenerated(codegenDir, 'errors.move');

    assertContains(content, 'module testpkg::errors');
    assertContains(content, '#[error]');
    assertContains(content, 'INVALID_INCREMENT');
    assertContains(content, 'invalid_increment_error');
    assertContains(content, "Number can't be incremented, must be more than 0");
  });

  it('multiple errors — all appear in generated errors.move', async () => {
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

    assertFileExists(codegenDir, 'errors.move');
    const content = readGenerated(codegenDir, 'errors.move');

    assertContains(content, 'NOT_FOUND');
    assertContains(content, 'not_found_error');
    assertContains(content, 'UNAUTHORIZED');
    assertContains(content, 'unauthorized_error');
    assertContains(content, 'OVERFLOW');
    assertContains(content, 'overflow_error');
    assertContains(content, 'Resource not found');
    assertContains(content, 'Caller is not authorized');
    assertContains(content, 'Value overflow');
  });

  it('error names are uppercased in the const identifier', async () => {
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

    const content = readGenerated(codegenDir, 'errors.move');
    // The const is uppercased
    assertContains(content, 'MY_CUSTOM_ERROR');
    // The helper function keeps the original name
    assertContains(content, 'my_custom_error_error');
  });

  it('each error helper uses assert! with the const', async () => {
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

    const content = readGenerated(codegenDir, 'errors.move');
    assertContains(content, 'assert!');
    assertContains(content, 'BAD_INPUT');
    assertContains(content, 'condition: bool');
  });

  it('no errors.move when errors field is undefined', async () => {
    const config = defineConfig({
      name: 'testpkg',
      description: 'test',
      resources: { value: 'u32' }
      // no errors field
    });

    const { tempDir, codegenDir } = await runSchemaGen(config);
    temps.push(tempDir);

    const errorsPath = path.join(codegenDir, 'errors.move');
    expect(fs.existsSync(errorsPath)).toBe(false);
  });
});
