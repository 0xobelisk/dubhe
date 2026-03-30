#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const DOCS_PAGES = path.join(ROOT, 'docs/pages');
const DOCS_PUBLIC = path.join(ROOT, 'docs/public');
const COMMANDS_INDEX = path.join(ROOT, 'packages/sui-cli/src/commands/index.ts');

const MARKDOWN_EXTS = new Set(['.md', '.mdx']);
const EXTERNAL_LINK = /^(https?:|mailto:|tel:|#)/i;
const ABSOLUTE_MACHINE_PATH = /(\/Volumes\/|\/Users\/[A-Za-z0-9._-]+\/)/;
const LEGACY_CONFIG_GUARDED_FILE = /^(docs\/pages\/dubhe\/sui\/tutorials\/.+\.(md|mdx)|docs\/pages\/dubhe\/sui\/client\.mdx)$/;
const LEGACY_CONFIG_PATTERNS = [
  {
    pattern: /import\s*{[^}]*\bDubheConfig\b[^}]*}\s*from\s*['"]@0xobelisk\/sui-common['"]/g,
    message: 'legacy config import detected (use defineConfig)'
  },
  {
    pattern: /\bstorage\s*\(/g,
    message: 'legacy storage() helper detected (use resources)'
  },
  {
    pattern: /\bschemas\s*:/g,
    message: 'legacy schemas key detected (use resources)'
  }
];

function walkFiles(startDir, predicate, out = []) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    if (['.git', 'node_modules', '.next', '.turbo', 'dist', 'target'].includes(entry.name))
      continue;
    const full = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, out);
      continue;
    }
    if (predicate(full)) out.push(full);
  }
  return out;
}

function existsDocRoute(routePath) {
  const clean = routePath.replace(/^\/+|\/+$/g, '');
  if (!clean) return true;
  const candidates = [
    path.join(DOCS_PAGES, `${clean}.mdx`),
    path.join(DOCS_PAGES, `${clean}.md`),
    path.join(DOCS_PAGES, clean, 'index.mdx'),
    path.join(DOCS_PAGES, clean, 'index.md')
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function existsRelativeDocTarget(fromDir, rel) {
  const target = path.resolve(fromDir, rel);
  const candidates = [
    target,
    `${target}.mdx`,
    `${target}.md`,
    path.join(target, 'index.mdx'),
    path.join(target, 'index.md')
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function lineNumberForOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function collectPackageScripts() {
  const packageJsonFiles = walkFiles(ROOT, (full) => path.basename(full) === 'package.json');

  const scripts = new Set();
  for (const file of packageJsonFiles) {
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const key of Object.keys(json.scripts || {})) scripts.add(key);
    } catch {
      // skip malformed package.json (none expected)
    }
  }
  return scripts;
}

function collectActiveDubheCommands() {
  const indexText = fs.readFileSync(COMMANDS_INDEX, 'utf8');
  const importMap = new Map();

  for (const m of indexText.matchAll(/import\s+(\w+)\s+from\s+'\.\/(\w+)'/g)) {
    importMap.set(m[1], m[2]);
  }

  const arrayMatch = indexText.match(/export const commands[\s\S]*?=\s*\[([\s\S]*?)\];/);
  const usedVars = new Set();
  if (arrayMatch) {
    for (const m of arrayMatch[1].matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
      usedVars.add(m[1]);
    }
  }

  const commands = new Set();
  for (const [importVar, fileName] of importMap.entries()) {
    if (!usedVars.has(importVar)) continue;
    const cmdFile = path.join(ROOT, 'packages/sui-cli/src/commands', `${fileName}.ts`);
    if (!fs.existsSync(cmdFile)) continue;
    const text = fs.readFileSync(cmdFile, 'utf8');
    const match = text.match(/command\s*:\s*'([^']+)'/);
    if (match) commands.add(match[1]);
  }
  return commands;
}

function main() {
  const markdownFiles = walkFiles(DOCS_PAGES, (full) => MARKDOWN_EXTS.has(path.extname(full)));

  const errors = [];
  const allScripts = collectPackageScripts();
  const activeDubheCommands = collectActiveDubheCommands();

  for (const file of markdownFiles) {
    const relFile = path.relative(ROOT, file);
    const text = fs.readFileSync(file, 'utf8');
    const dir = path.dirname(file);

    if (ABSOLUTE_MACHINE_PATH.test(text)) {
      errors.push(`${relFile}: contains machine-specific absolute path (/Volumes or /Users)`);
    }

    for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = (m[1] || '').trim().replace(/^<|>$/g, '');
      if (!raw || EXTERNAL_LINK.test(raw)) continue;

      const link = raw.split('#')[0].split('?')[0];
      if (!link) continue;

      const line = lineNumberForOffset(text, m.index ?? 0);

      if (link.startsWith('/')) {
        const asRoute = existsDocRoute(link);
        if (asRoute) continue;

        const asAsset = path.join(DOCS_PUBLIC, link.replace(/^\/+/, ''));
        if (!fs.existsSync(asAsset)) {
          errors.push(`${relFile}:${line} broken link/asset: ${link}`);
        }
        continue;
      }

      if (!existsRelativeDocTarget(dir, link)) {
        errors.push(`${relFile}:${line} broken relative link: ${link}`);
      }
    }

    for (const m of text.matchAll(/pnpm(?:\s+--dir\s+\S+)?\s+run\s+([A-Za-z0-9:_-]+)/g)) {
      const script = m[1];
      if (!allScripts.has(script)) {
        const line = lineNumberForOffset(text, m.index ?? 0);
        errors.push(`${relFile}:${line} unknown pnpm script: ${script}`);
      }
    }

    if (relFile.startsWith('docs/pages/dubhe/sui/')) {
      const cmdPatterns = [
        /\bpnpm\s+dubhe\s+([a-z][a-z0-9-]*)\b/g,
        /`dubhe\s+([a-z][a-z0-9-]*)[^`]*`/g,
        /^\s*dubhe\s+([a-z][a-z0-9-]*)\b/gm
      ];

      const seen = new Set();
      for (const pattern of cmdPatterns) {
        for (const m of text.matchAll(pattern)) {
          const cmd = m[1];
          const offset = m.index ?? 0;
          const key = `${cmd}@${offset}`;
          if (seen.has(key)) continue;
          seen.add(key);

          if (!activeDubheCommands.has(cmd)) {
            const line = lineNumberForOffset(text, offset);
            errors.push(`${relFile}:${line} unknown dubhe command: ${cmd}`);
          }
        }
      }
    }

    if (LEGACY_CONFIG_GUARDED_FILE.test(relFile)) {
      for (const { pattern, message } of LEGACY_CONFIG_PATTERNS) {
        for (const m of text.matchAll(pattern)) {
          const line = lineNumberForOffset(text, m.index ?? 0);
          errors.push(`${relFile}:${line} ${message}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ Docs consistency checks failed:\n');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log('✅ Docs consistency checks passed');
  console.log(`Checked ${markdownFiles.length} docs files`);
  console.log(`Known pnpm scripts: ${allScripts.size}`);
  console.log(`Active dubhe commands: ${activeDubheCommands.size}`);
}

main();
