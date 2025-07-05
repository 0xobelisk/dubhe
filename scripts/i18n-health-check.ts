#!/usr/bin/env tsx

import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

interface I18nHealthCheck {
  totalFiles: number;
  missingFiles: number;
  outdatedFiles: number;
  completionRate: number;
  issues: string[];
}

class I18nHealthChecker {
  private config = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh', 'ja', 'ko'],
    docsDir: 'docs',
    requiredFiles: [
      'README.md',
      'getting-started/quick-start.md',
      'engineering/architecture.md',
      'i18n/README.md',
    ],
  };

  private healthReport: I18nHealthCheck = {
    totalFiles: 0,
    missingFiles: 0,
    outdatedFiles: 0,
    completionRate: 0,
    issues: [],
  };

  /**
   * Run comprehensive i18n health check
   */
  async runHealthCheck(): Promise<I18nHealthCheck> {
    console.log('🔍 Running i18n health check...\n');

    // Check all locales
    for (const locale of this.config.supportedLocales) {
      if (locale === this.config.defaultLocale) continue;
      await this.checkLocale(locale);
    }

    // Calculate completion rate
    this.healthReport.completionRate =
      this.healthReport.totalFiles > 0
        ? ((this.healthReport.totalFiles - this.healthReport.missingFiles) /
            this.healthReport.totalFiles) *
          100
        : 0;

    // Generate report
    this.generateReport();

    return this.healthReport;
  }

  /**
   * Check a specific locale
   */
  private async checkLocale(locale: string): Promise<void> {
    console.log(`📋 Checking ${locale} locale...`);

    const localeDir = join(this.config.docsDir, locale);

    if (!existsSync(localeDir)) {
      this.healthReport.issues.push(
        `❌ Locale directory missing: ${localeDir}`
      );
      return;
    }

    // Check required files
    for (const requiredFile of this.config.requiredFiles) {
      await this.checkFile(locale, requiredFile);
    }

    // Check all files recursively
    await this.checkAllFiles(locale, localeDir);
  }

  /**
   * Check a specific file
   */
  private async checkFile(locale: string, relativePath: string): Promise<void> {
    const sourceFile = join(this.config.docsDir, relativePath);
    const targetFile = join(this.config.docsDir, locale, relativePath);

    this.healthReport.totalFiles++;

    if (!existsSync(targetFile)) {
      this.healthReport.missingFiles++;
      this.healthReport.issues.push(`❌ Missing: ${locale}/${relativePath}`);
      return;
    }

    // Check if file is outdated
    if (existsSync(sourceFile) && this.isFileOutdated(sourceFile, targetFile)) {
      this.healthReport.outdatedFiles++;
      this.healthReport.issues.push(`⚠️  Outdated: ${locale}/${relativePath}`);
    }

    console.log(`   ✅ ${relativePath}`);
  }

  /**
   * Check all files recursively
   */
  private async checkAllFiles(
    locale: string,
    localeDir: string
  ): Promise<void> {
    try {
      const items = readdirSync(localeDir, { recursive: true });

      for (const item of items) {
        if (typeof item === 'string' && item.endsWith('.md')) {
          const relativePath = item.replace(`${locale}/`, '');
          const sourceFile = join(this.config.docsDir, relativePath);
          const targetFile = join(localeDir, relativePath);

          if (existsSync(sourceFile)) {
            this.healthReport.totalFiles++;

            if (!existsSync(targetFile)) {
              this.healthReport.missingFiles++;
              this.healthReport.issues.push(
                `❌ Missing: ${locale}/${relativePath}`
              );
            } else if (this.isFileOutdated(sourceFile, targetFile)) {
              this.healthReport.outdatedFiles++;
              this.healthReport.issues.push(
                `⚠️  Outdated: ${locale}/${relativePath}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading ${localeDir}:`, error);
    }
  }

  /**
   * Check if target file is outdated compared to source
   */
  private isFileOutdated(sourceFile: string, targetFile: string): boolean {
    if (!existsSync(sourceFile) || !existsSync(targetFile)) return false;

    const sourceStats = statSync(sourceFile);
    const targetStats = statSync(targetFile);

    return sourceStats.mtime > targetStats.mtime;
  }

  /**
   * Generate health check report
   */
  private generateReport(): void {
    console.log('\n📊 i18n Health Check Report');
    console.log('==========================\n');

    console.log(`Total files checked: ${this.healthReport.totalFiles}`);
    console.log(`Missing files: ${this.healthReport.missingFiles}`);
    console.log(`Outdated files: ${this.healthReport.outdatedFiles}`);
    console.log(
      `Completion rate: ${this.healthReport.completionRate.toFixed(1)}%`
    );

    if (this.healthReport.issues.length > 0) {
      console.log('\n🚨 Issues Found:');
      this.healthReport.issues.forEach((issue) => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ No issues found!');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      ...this.healthReport,
    };

    writeFileSync('i18n-health-report.json', JSON.stringify(report, null, 2));

    console.log('\n📄 Detailed report saved to: i18n-health-report.json');
  }

  /**
   * Check if health check passes
   */
  isHealthy(): boolean {
    return (
      this.healthReport.completionRate >= 90 &&
      this.healthReport.issues.length === 0
    );
  }
}

async function main() {
  const checker = new I18nHealthChecker();
  const report = await checker.runHealthCheck();

  if (!checker.isHealthy()) {
    console.log('\n❌ i18n health check failed!');
    process.exit(1);
  } else {
    console.log('\n✅ i18n health check passed!');
  }
}

// ESM compatible entry point check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });
}
