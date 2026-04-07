/**
 * Shared helpers for generate (schemagen) output tests.
 * Each test calls runSchemaGen() in a fresh temp directory and then asserts
 * on the generated files without touching the real e2e source tree.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { schemaGen, defineConfig, type DubheConfig } from '@0xobelisk/sui-common';

export type { DubheConfig };
export { defineConfig };

export interface SchemaGenResult {
  /** The temporary directory where files were generated */
  tempDir: string;
  /** Absolute path to the generated src/<name> Move package */
  packageDir: string;
  /** Absolute path to sources/codegen inside the package */
  codegenDir: string;
}

/**
 * Run schemaGen in a freshly-created temporary directory.
 * The temp directory is set up so that schemaGen writes to:
 *   <tempDir>/src/<config.name>/sources/codegen/...
 */
export async function runSchemaGen(config: DubheConfig): Promise<SchemaGenResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-generate-test-'));
  await schemaGen(tempDir, config);
  const packageDir = path.join(tempDir, 'src', config.name);
  const codegenDir = path.join(packageDir, 'sources', 'codegen');
  return { tempDir, packageDir, codegenDir };
}

/** Clean up a temp directory created by runSchemaGen */
export function cleanupDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Read a generated file and return its contents */
export function readGenerated(codegenDir: string, ...parts: string[]): string {
  return fs.readFileSync(path.join(codegenDir, ...parts), 'utf-8');
}

/** Assert that a file exists */
export function assertFileExists(codegenDir: string, ...parts: string[]): void {
  const fullPath = path.join(codegenDir, ...parts);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Expected file to exist: ${fullPath}`);
  }
}

/** Assert that a file does NOT exist */
export function assertFileNotExists(codegenDir: string, ...parts: string[]): void {
  const fullPath = path.join(codegenDir, ...parts);
  if (fs.existsSync(fullPath)) {
    throw new Error(`Expected file NOT to exist but it does: ${fullPath}`);
  }
}

/** Assert that generated file content includes the given substring */
export function assertContains(content: string, substring: string, hint?: string): void {
  if (!content.includes(substring)) {
    throw new Error(
      `Expected generated content to contain: "${substring}"${
        hint ? ` (${hint})` : ''
      }\n\nActual:\n${content.slice(0, 2000)}`
    );
  }
}

/** Assert that generated file content does NOT include the given substring */
export function assertNotContains(content: string, substring: string, hint?: string): void {
  if (content.includes(substring)) {
    throw new Error(
      `Expected generated content NOT to contain: "${substring}"${
        hint ? ` (${hint})` : ''
      }\n\nActual:\n${content.slice(0, 2000)}`
    );
  }
}
