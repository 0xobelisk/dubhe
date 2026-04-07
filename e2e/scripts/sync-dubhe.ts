/**
 * sync-dubhe.ts
 *
 * Copies framework/src/dubhe/sources → e2e/src/dubhe/sources unconditionally.
 *
 * Run before any test command so the e2e package always uses the latest
 * framework sources without maintaining a duplicate tracked copy:
 *
 *   tsx scripts/sync-dubhe.ts
 *
 * The destination is listed in .gitignore, so only Move.toml and Move.lock
 * (which are specific to the e2e environment) remain tracked in git.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRAMEWORK_SOURCES = path.resolve(__dirname, '../../framework/src/dubhe/sources');
const E2E_DUBHE_SOURCES = path.resolve(__dirname, '../src/dubhe/sources');

if (!fs.existsSync(FRAMEWORK_SOURCES)) {
  console.error(`Source not found: ${FRAMEWORK_SOURCES}`);
  process.exit(1);
}

fs.rmSync(E2E_DUBHE_SOURCES, { recursive: true, force: true });
fs.cpSync(FRAMEWORK_SOURCES, E2E_DUBHE_SOURCES, { recursive: true });

console.log(`Synced: framework/src/dubhe/sources → e2e/src/dubhe/sources`);
