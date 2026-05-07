/**
 * sync-dubhe.ts
 *
 * Copies framework sources to the e2e packages unconditionally.
 *
 *   dubhe:  framework/src/dubhe/sources → e2e/src/dubhe/sources
 *
 * Run before any test command so the e2e packages always use the latest
 * framework sources without maintaining duplicate tracked copies:
 *
 *   tsx scripts/sync-dubhe.ts
 *
 * The destination source directories are listed in .gitignore, so only
 * Move.toml and Move.lock (which are e2e-environment-specific) remain
 * tracked in git.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRAMEWORK_ROOT = path.resolve(__dirname, '../../framework/src');

// ── dubhe sources ────────────────────────────────────────────────────────────
const FRAMEWORK_DUBHE_SOURCES = path.resolve(FRAMEWORK_ROOT, 'dubhe/sources');
const E2E_DUBHE_SOURCES = path.resolve(__dirname, '../src/dubhe/sources');

if (!fs.existsSync(FRAMEWORK_DUBHE_SOURCES)) {
  console.error(`Source not found: ${FRAMEWORK_DUBHE_SOURCES}`);
  process.exit(1);
}

fs.rmSync(E2E_DUBHE_SOURCES, { recursive: true, force: true });
fs.cpSync(FRAMEWORK_DUBHE_SOURCES, E2E_DUBHE_SOURCES, { recursive: true });
console.log(`Synced: framework/src/dubhe/sources → e2e/src/dubhe/sources`);
