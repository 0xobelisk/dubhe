#!/usr/bin/env tsx

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, join } from 'path';

interface SyncConfig {
  defaultLocale: string;
  supportedLocales: string[];
  syncOptions: {
    preserveExisting: boolean;
    backupBeforeSync: boolean;
    validateAfterSync: boolean;
  };
}

class TranslationSynchronizer {
  private config: SyncConfig;
  private syncStats = {
    filesProcessed: 0,
    filesCreated: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    errors: 0,
  };

  constructor() {
    this.config = {
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh', 'ja', 'ko'],
      syncOptions: {
        preserveExisting: true,
        backupBeforeSync: true,
        validateAfterSync: true,
      },
    };
  }

  /**
   * Synchronize translations across all locales
   */
  async syncAll(): Promise<void> {
    console.log('🔄 Starting translation synchronization...\n');

    // Get all source files
    const sourceFiles = this.getSourceFiles();
    console.log(`📋 Found ${sourceFiles.length} source files to sync`);

    // Process each source file
    for (const sourceFile of sourceFiles) {
      await this.syncFile(sourceFile);
    }

    // Generate sync report
    this.generateReport();

    // Validate after sync if enabled
    if (this.config.syncOptions.validateAfterSync) {
      console.log('\n🔍 Running post-sync validation...');
      await this.runValidation();
    }
  }

  /**
   * Get all source files from the default locale
   */
  private getSourceFiles(): string[] {
    const sourceDir = 'docs';
    const files: string[] = [];

    try {
      const items = require('fs').readdirSync(sourceDir, { recursive: true });
      for (const item of items) {
        if (typeof item === 'string' && item.endsWith('.md')) {
          files.push(join(sourceDir, item));
        }
      }
    } catch (error) {
      console.error('Error reading source directory:', error);
    }

    return files;
  }

  /**
   * Synchronize a single file across all locales
   */
  async syncFile(sourceFile: string): Promise<void> {
    console.log(`📄 Processing: ${sourceFile}`);

    try {
      this.syncStats.filesProcessed++;

      for (const targetLocale of this.config.supportedLocales) {
        if (targetLocale === this.config.defaultLocale) continue;

        await this.syncFileToLocale(sourceFile, targetLocale);
      }
    } catch (error) {
      console.error(`❌ Error processing ${sourceFile}:`, error);
      this.syncStats.errors++;
    }
  }

  /**
   * Synchronize a file to a specific locale
   */
  async syncFileToLocale(
    sourceFile: string,
    targetLocale: string
  ): Promise<void> {
    const targetFile = this.getTargetFilePath(sourceFile, targetLocale);
    const targetDir = dirname(targetFile);

    // Create target directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Check if target file exists
    const targetExists = existsSync(targetFile);

    if (targetExists && this.config.syncOptions.preserveExisting) {
      // Check if source is newer than target
      if (!this.isSourceNewer(sourceFile, targetFile)) {
        this.syncStats.filesSkipped++;
        return;
      }

      // Backup existing file if enabled
      if (this.config.syncOptions.backupBeforeSync) {
        this.backupFile(targetFile);
      }
    }

    // Copy or update the file
    if (!targetExists) {
      await this.createTranslatedFile(sourceFile, targetFile, targetLocale);
      this.syncStats.filesCreated++;
    } else {
      await this.updateTranslatedFile(sourceFile, targetFile, targetLocale);
      this.syncStats.filesUpdated++;
    }
  }

  /**
   * Get target file path for a locale
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
   * Backup a file before modification
   */
  private backupFile(filePath: string): void {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    try {
      copyFileSync(filePath, backupPath);
      console.log(`   💾 Backed up: ${basename(filePath)}`);
    } catch (error) {
      console.warn(`   ⚠️  Failed to backup ${filePath}:`, error);
    }
  }

  /**
   * Create a new translated file
   */
  async createTranslatedFile(
    sourceFile: string,
    targetFile: string,
    targetLocale: string
  ): Promise<void> {
    const sourceContent = readFileSync(sourceFile, 'utf-8');
    const translatedContent = await this.translateContent(
      sourceContent,
      targetLocale
    );

    writeFileSync(targetFile, translatedContent, 'utf-8');
    console.log(`   ✅ Created: ${basename(targetFile)} (${targetLocale})`);
  }

  /**
   * Update an existing translated file
   */
  async updateTranslatedFile(
    sourceFile: string,
    targetFile: string,
    targetLocale: string
  ): Promise<void> {
    const sourceContent = readFileSync(sourceFile, 'utf-8');
    const existingContent = readFileSync(targetFile, 'utf-8');

    // Merge content (preserve existing translations where possible)
    const mergedContent = await this.mergeContent(
      sourceContent,
      existingContent,
      targetLocale
    );

    writeFileSync(targetFile, mergedContent, 'utf-8');
    console.log(`   🔄 Updated: ${basename(targetFile)} (${targetLocale})`);
  }

  /**
   * Translate content to target locale
   */
  private async translateContent(
    content: string,
    targetLocale: string
  ): Promise<string> {
    // Extract and preserve code blocks
    const codeBlocks: string[] = [];
    let blockIndex = 0;

    content = content.replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${blockIndex++}__`;
    });

    // Extract and preserve links
    const links: string[] = [];
    let linkIndex = 0;

    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
      links.push(match);
      return `__LINK_${linkIndex++}__`;
    });

    // Apply basic translations
    const translations = this.getTranslationMap(targetLocale);
    for (const [english, translated] of Object.entries(translations)) {
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
   * Merge source content with existing translated content
   */
  private async mergeContent(
    sourceContent: string,
    existingContent: string,
    targetLocale: string
  ): Promise<string> {
    // For now, we'll use a simple approach
    // In a more sophisticated implementation, you might want to:
    // 1. Parse both contents into sections
    // 2. Identify which sections have changed
    // 3. Preserve existing translations for unchanged sections
    // 4. Only translate new or modified sections

    // Simple merge: use existing content if it's not empty, otherwise translate
    if (existingContent.trim().length > 100) {
      return existingContent;
    } else {
      return await this.translateContent(sourceContent, targetLocale);
    }
  }

  /**
   * Get translation map for a locale
   */
  private getTranslationMap(locale: string): Record<string, string> {
    const maps: Record<string, Record<string, string>> = {
      zh: {
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
      ja: {
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
      ko: {
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

    return maps[locale] || {};
  }

  /**
   * Generate synchronization report
   */
  private generateReport(): void {
    console.log('\n📊 Synchronization Report');
    console.log('========================\n');

    console.log(`Files processed: ${this.syncStats.filesProcessed}`);
    console.log(`Files created: ${this.syncStats.filesCreated}`);
    console.log(`Files updated: ${this.syncStats.filesUpdated}`);
    console.log(`Files skipped: ${this.syncStats.filesSkipped}`);
    console.log(`Errors: ${this.syncStats.errors}`);

    const successRate =
      this.syncStats.filesProcessed > 0
        ? (
            ((this.syncStats.filesProcessed - this.syncStats.errors) /
              this.syncStats.filesProcessed) *
            100
          ).toFixed(1)
        : '0.0';

    console.log(`Success rate: ${successRate}%`);

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.syncStats,
      successRate: parseFloat(successRate),
    };

    writeFileSync(
      'docs/i18n/sync-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n📄 Report saved to: docs/i18n/sync-report.json');
  }

  /**
   * Run validation after sync
   */
  private async runValidation(): Promise<void> {
    try {
      // Import and run the validation script
      const { TranslationValidator } = await import('./validate-translations');
      const validator = new TranslationValidator();
      await validator.validateAll();
    } catch (error) {
      console.warn('⚠️  Validation failed:', error);
    }
  }
}

async function main() {
  const synchronizer = new TranslationSynchronizer();
  await synchronizer.syncAll();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Synchronization failed:', error);
    process.exit(1);
  });
}
