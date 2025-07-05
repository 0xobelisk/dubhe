import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join } from 'path';

const locales = ['zh', 'ja', 'ko'];
const baseDir = 'docs';
const mainLocale = 'en';

function getAllMarkdownFiles(dir: string, prefix = ''): string[] {
  let files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files = files.concat(
        getAllMarkdownFiles(join(dir, entry.name), join(prefix, entry.name))
      );
    } else if (
      extname(entry.name) === '.md' ||
      extname(entry.name) === '.mdx'
    ) {
      files.push(join(prefix, entry.name));
    }
  }
  return files;
}

test('各语言文档结构与英文保持一致', async () => {
  const enFiles = getAllMarkdownFiles(join(baseDir));
  for (const locale of locales) {
    const localeDir = join(baseDir, locale);
    const localeFiles = getAllMarkdownFiles(localeDir);
    // 文件名集合一致
    const enSet = new Set(enFiles.map((f) => f.replace(/^\//, '')));
    const localeSet = new Set(localeFiles.map((f) => f.replace(/^\//, '')));
    for (const file of enSet) {
      expect(localeSet.has(file)).toBeTruthy();
    }
  }
});

test('各语言文档主标题与英文结构一致', async () => {
  const enFiles = getAllMarkdownFiles(join(baseDir));
  for (const file of enFiles) {
    const enPath = join(baseDir, file);
    const enContent = readFileSync(enPath, 'utf-8');
    const enTitle = (enContent.match(/^# .+/m) || [''])[0];
    for (const locale of locales) {
      const localePath = join(baseDir, locale, file);
      if (!statSync(localePath).isFile()) continue;
      const localeContent = readFileSync(localePath, 'utf-8');
      const localeTitle = (localeContent.match(/^# .+/m) || [''])[0];
      expect(localeTitle).not.toBe('');
    }
  }
});

// 可扩展：链接、锚点、代码块等一致性校验
