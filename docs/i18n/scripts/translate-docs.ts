#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';

interface TranslationConfig {
  defaultLocale: string;
  supportedLocales: string[];
  localeNames: Record<string, string>;
  localePaths: Record<string, string>;
  translationStatus: Record<string, any>;
  priorityPages: string[];
  translationWorkflow: {
    autoTranslate: boolean;
    requireReview: boolean;
    reviewers: number;
    qualityThreshold: number;
  };
}

interface TranslationTask {
  sourceFile: string;
  targetFile: string;
  sourceLocale: string;
  targetLocale: string;
  priority: number;
}

class DocumentationTranslator {
  private config: TranslationConfig;
  private tasks: TranslationTask[] = [];

  constructor() {
    this.config = JSON.parse(readFileSync('docs/i18n/config.json', 'utf-8'));
  }

  /**
   * Scan for files that need translation
   */
  scanForTranslation(): void {
    console.log('🔍 Scanning for files that need translation...');

    const sourceDir = 'docs';
    const sourceFiles = this.getMarkdownFiles(sourceDir);

    for (const sourceFile of sourceFiles) {
      for (const targetLocale of this.config.supportedLocales) {
        if (targetLocale === this.config.defaultLocale) continue;

        const targetFile = this.getTargetFilePath(sourceFile, targetLocale);

        if (
          !existsSync(targetFile) ||
          this.isSourceNewer(sourceFile, targetFile)
        ) {
          const priority = this.getPriority(sourceFile);
          this.tasks.push({
            sourceFile,
            targetFile,
            sourceLocale: this.config.defaultLocale,
            targetLocale,
            priority,
          });
        }
      }
    }

    console.log(`📋 Found ${this.tasks.length} files that need translation`);
  }

  /**
   * Get all markdown files in a directory recursively
   */
  private getMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const items = readFileSync(dir, 'utf-8').split('\n');
      for (const item of items) {
        if (item.endsWith('.md')) {
          files.push(join(dir, item));
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Get target file path for translation
   */
  private getTargetFilePath(sourceFile: string, targetLocale: string): string {
    const relativePath = sourceFile.replace('docs/', '');
    return join('docs', targetLocale, relativePath);
  }

  /**
   * Check if source file is newer than target file
   */
  private isSourceNewer(sourceFile: string, targetFile: string): boolean {
    if (!existsSync(targetFile)) return true;

    const sourceStats = require('fs').statSync(sourceFile);
    const targetStats = require('fs').statSync(targetFile);

    return sourceStats.mtime > targetStats.mtime;
  }

  /**
   * Get priority for a file
   */
  private getPriority(filePath: string): number {
    const relativePath = filePath.replace('docs/', '');
    const priorityIndex = this.config.priorityPages.indexOf(relativePath);
    return priorityIndex >= 0 ? priorityIndex + 1 : 999;
  }

  /**
   * Sort tasks by priority
   */
  sortTasks(): void {
    this.tasks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Translate a single file
   */
  async translateFile(task: TranslationTask): Promise<void> {
    console.log(`🔄 Translating: ${task.sourceFile} -> ${task.targetFile}`);

    try {
      // Read source content
      const sourceContent = readFileSync(task.sourceFile, 'utf-8');

      // Create target directory if it doesn't exist
      const targetDir = dirname(task.targetFile);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // Translate content
      const translatedContent = await this.translateContent(
        sourceContent,
        task.sourceLocale,
        task.targetLocale
      );

      // Write translated content
      writeFileSync(task.targetFile, translatedContent, 'utf-8');

      console.log(`✅ Translated: ${basename(task.sourceFile)}`);
    } catch (error) {
      console.error(`❌ Failed to translate ${task.sourceFile}:`, error);
    }
  }

  /**
   * Translate content using machine translation
   */
  private async translateContent(
    content: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<string> {
    // For now, we'll use a simple approach
    // In production, you might want to use Google Translate API, DeepL, etc.

    // Extract code blocks and preserve them
    const codeBlocks: string[] = [];
    let blockIndex = 0;

    content = content.replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${blockIndex++}__`;
    });

    // Extract links and preserve them
    const links: string[] = [];
    let linkIndex = 0;

    content = content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, text, url) => {
        links.push(match);
        return `__LINK_${linkIndex++}__`;
      }
    );

    // Simple translation mapping (you would replace this with actual translation API)
    const translations: Record<string, Record<string, string>> = {
      'en-zh': {
        'Getting Started': '快速开始',
        Installation: '安装',
        Configuration: '配置',
        Architecture: '架构',
        Development: '开发',
        'API Reference': 'API 参考',
        Examples: '示例',
        Security: '安全',
        Contributing: '贡献',
        Support: '支持',
        Documentation: '文档',
        'Quick Start': '快速开始',
        'First Project': '第一个项目',
        'CLI Commands': 'CLI 命令',
        'SDK Usage': 'SDK 使用',
        Testing: '测试',
        Debugging: '调试',
        Deployment: '部署',
        Monitoring: '监控',
        Performance: '性能',
        Benchmarking: '基准测试',
        Internationalization: '国际化',
        FAQ: '常见问题',
        Troubleshooting: '故障排除',
        Community: '社区',
        Contact: '联系我们',
      },
      'en-ja': {
        'Getting Started': 'はじめに',
        Installation: 'インストール',
        Configuration: '設定',
        Architecture: 'アーキテクチャ',
        Development: '開発',
        'API Reference': 'APIリファレンス',
        Examples: 'サンプル',
        Security: 'セキュリティ',
        Contributing: '貢献',
        Support: 'サポート',
        Documentation: 'ドキュメント',
        'Quick Start': 'クイックスタート',
        'First Project': '最初のプロジェクト',
        'CLI Commands': 'CLIコマンド',
        'SDK Usage': 'SDK使用法',
        Testing: 'テスト',
        Debugging: 'デバッグ',
        Deployment: 'デプロイメント',
        Monitoring: 'モニタリング',
        Performance: 'パフォーマンス',
        Benchmarking: 'ベンチマーク',
        Internationalization: '国際化',
        FAQ: 'よくある質問',
        Troubleshooting: 'トラブルシューティング',
        Community: 'コミュニティ',
        Contact: 'お問い合わせ',
      },
      'en-ko': {
        'Getting Started': '시작하기',
        Installation: '설치',
        Configuration: '설정',
        Architecture: '아키텍처',
        Development: '개발',
        'API Reference': 'API 참조',
        Examples: '예제',
        Security: '보안',
        Contributing: '기여',
        Support: '지원',
        Documentation: '문서',
        'Quick Start': '빠른 시작',
        'First Project': '첫 번째 프로젝트',
        'CLI Commands': 'CLI 명령어',
        'SDK Usage': 'SDK 사용법',
        Testing: '테스트',
        Debugging: '디버깅',
        Deployment: '배포',
        Monitoring: '모니터링',
        Performance: '성능',
        Benchmarking: '벤치마크',
        Internationalization: '국제화',
        FAQ: '자주 묻는 질문',
        Troubleshooting: '문제 해결',
        Community: '커뮤니티',
        Contact: '문의하기',
      },
    };

    const translationKey = `${sourceLocale}-${targetLocale}`;
    const translationMap = translations[translationKey] || {};

    // Apply translations
    for (const [english, translated] of Object.entries(translationMap)) {
      content = content.replace(new RegExp(english, 'g'), translated);
    }

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      content = content.replace(`__CODE_BLOCK_${index}__`, block);
    });

    // Restore links
    links.forEach((link, index) => {
      content = content.replace(`__LINK_${index}__`, link);
    });

    return content;
  }

  /**
   * Generate translation report
   */
  generateReport(): void {
    console.log('\n📊 Translation Report');
    console.log('===================');

    const stats: Record<
      string,
      { total: number; translated: number; pending: number }
    > = {};

    for (const locale of this.config.supportedLocales) {
      if (locale === this.config.defaultLocale) continue;

      const localeTasks = this.tasks.filter(
        (task) => task.targetLocale === locale
      );
      stats[locale] = {
        total: localeTasks.length,
        translated: 0,
        pending: localeTasks.length,
      };
    }

    for (const [locale, stat] of Object.entries(stats)) {
      const percentage =
        stat.total > 0
          ? ((stat.translated / stat.total) * 100).toFixed(1)
          : '0.0';
      console.log(
        `${this.config.localeNames[locale]}: ${stat.translated}/${stat.total} (${percentage}%)`
      );
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      tasks: this.tasks.map((task) => ({
        sourceFile: task.sourceFile,
        targetFile: task.targetFile,
        targetLocale: task.targetLocale,
        priority: task.priority,
      })),
    };

    writeFileSync(
      'docs/i18n/translation-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n📄 Report saved to: docs/i18n/translation-report.json');
  }

  /**
   * Run the translation process
   */
  async run(): Promise<void> {
    console.log('🚀 Starting documentation translation...\n');

    // Scan for files that need translation
    this.scanForTranslation();

    if (this.tasks.length === 0) {
      console.log('✅ All documentation is up to date!');
      return;
    }

    // Sort tasks by priority
    this.sortTasks();

    // Translate files
    for (const task of this.tasks) {
      await this.translateFile(task);
    }

    // Generate report
    this.generateReport();

    console.log('\n🎉 Translation completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Review translated files for accuracy');
    console.log('2. Update translation status in config.json');
    console.log('3. Commit changes and create PR for review');
  }
}

async function main() {
  const translator = new DocumentationTranslator();
  await translator.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Translation failed:', error);
    process.exit(1);
  });
}
