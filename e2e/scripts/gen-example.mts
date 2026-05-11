/**
 * Regenerate codegen for all e2e DApp configs.
 * schemaGen(rootDir, config) outputs to rootDir/src/<name>/sources/codegen
 */
import { schemaGen } from '@0xobelisk/sui-common';
import { exampleConfig } from '../example.config.js';
import { guildConfig } from '../guild.config.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

for (const cfg of [exampleConfig, guildConfig]) {
  await schemaGen(rootDir, cfg);
  console.log(`✅ Generated: ${cfg.name}`);
}
