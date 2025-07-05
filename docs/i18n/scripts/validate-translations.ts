#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  file: string;
  locale: string;
  issues: ValidationIssue[];
  score: number;
}

interface ValidationIssue {
  type:
    | 'missing_link'
    | 'broken_link'
    | 'inconsistent_term'
    | 'format_error'
    | 'missing_content';
  message: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
}

class TranslationValidator {
  private config: any;
  private results: ValidationResult[] = [];

  constructor() {
    this.config = JSON.parse(readFileSync('docs/i18n/config.json', 'utf-8'));
  }

  /**
   * Validate all translations
   */
  async validateAll(): Promise<void> {
    console.log('🔍 Validating translations...\n');

    for (const locale of this.config.supportedLocales) {
      if (locale === this.config.defaultLocale) continue;

      const localeDir = join('docs', locale);
      if (!existsSync(localeDir)) continue;

      const files = this.getMarkdownFiles(localeDir);
      for (const file of files) {
        await this.validateFile(file, locale);
      }
    }

    this.generateReport();
  }

  /**
   * Get all markdown files in a directory
   */
  private getMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const items = require('fs').readdirSync(dir, { recursive: true });
      for (const item of items) {
        if (typeof item === 'string' && item.endsWith('.md')) {
          files.push(join(dir, item));
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Validate a single translation file
   */
  async validateFile(filePath: string, locale: string): Promise<void> {
    console.log(`📄 Validating: ${filePath}`);

    const content = readFileSync(filePath, 'utf-8');
    const issues: ValidationIssue[] = [];

    // Check for missing links
    issues.push(...this.checkMissingLinks(content, filePath, locale));

    // Check for broken links
    issues.push(...this.checkBrokenLinks(content, filePath, locale));

    // Check for inconsistent terms
    issues.push(...this.checkInconsistentTerms(content, locale));

    // Check for format errors
    issues.push(...this.checkFormatErrors(content, filePath));

    // Check for missing content
    issues.push(...this.checkMissingContent(content, filePath, locale));

    // Calculate score
    const score = this.calculateScore(issues);

    this.results.push({
      file: filePath,
      locale,
      issues,
      score,
    });
  }

  /**
   * Check for missing links
   */
  private checkMissingLinks(
    content: string,
    filePath: string,
    locale: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);

      if (linkMatches) {
        for (const match of linkMatches) {
          const [, text, url] = match.match(/\[([^\]]+)\]\(([^)]+)\)/) || [];

          if (url && !url.startsWith('http') && !url.startsWith('#')) {
            const targetPath = this.resolveLinkPath(url, filePath, locale);
            if (!existsSync(targetPath)) {
              issues.push({
                type: 'missing_link',
                message: `Missing link target: ${url}`,
                line: i + 1,
                severity: 'error',
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check for broken links
   */
  private checkBrokenLinks(
    content: string,
    filePath: string,
    locale: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);

      if (linkMatches) {
        for (const match of linkMatches) {
          const [, text, url] = match.match(/\[([^\]]+)\]\(([^)]+)\)/) || [];

          if (url && url.startsWith('http')) {
            // Check if external link is accessible (simplified check)
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
              issues.push({
                type: 'broken_link',
                message: `External link may be broken: ${url}`,
                line: i + 1,
                severity: 'warning',
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check for inconsistent terms
   */
  private checkInconsistentTerms(
    content: string,
    locale: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Define term consistency rules
    const termRules: Record<string, string[]> = {
      zh: [
        ['Dubhe', 'Dubhe'], // Should not be translated
        ['CLI', 'CLI'], // Should not be translated
        ['API', 'API'], // Should not be translated
        ['SDK', 'SDK'], // Should not be translated
        ['GraphQL', 'GraphQL'], // Should not be translated
      ],
      ja: [
        ['Dubhe', 'Dubhe'], // Should not be translated
        ['CLI', 'CLI'], // Should not be translated
        ['API', 'API'], // Should not be translated
        ['SDK', 'SDK'], // Should not be translated
        ['GraphQL', 'GraphQL'], // Should not be translated
      ],
      ko: [
        ['Dubhe', 'Dubhe'], // Should not be translated
        ['CLI', 'CLI'], // Should not be translated
        ['API', 'API'], // Should not be translated
        ['SDK', 'SDK'], // Should not be translated
        ['GraphQL', 'GraphQL'], // Should not be translated
      ],
    };

    const rules = termRules[locale] || [];
    for (const [expected, actual] of rules) {
      if (content.includes(actual) && actual !== expected) {
        issues.push({
          type: 'inconsistent_term',
          message: `Inconsistent term: expected "${expected}", found "${actual}"`,
          severity: 'warning',
        });
      }
    }

    return issues;
  }

  /**
   * Check for format errors
   */
  private checkFormatErrors(
    content: string,
    filePath: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for unclosed code blocks
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      issues.push({
        type: 'format_error',
        message: 'Unclosed code block detected',
        severity: 'error',
      });
    }

    // Check for unclosed links
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push({
        type: 'format_error',
        message: 'Unclosed link brackets detected',
        severity: 'error',
      });
    }

    // Check for missing headers
    if (!content.includes('# ')) {
      issues.push({
        type: 'format_error',
        message: 'Missing main header (H1)',
        severity: 'warning',
      });
    }

    return issues;
  }

  /**
   * Check for missing content
   */
  private checkMissingContent(
    content: string,
    filePath: string,
    locale: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if file is too short (likely incomplete translation)
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 10) {
      issues.push({
        type: 'missing_content',
        message: 'File appears to be incomplete (too few lines)',
        severity: 'warning',
      });
    }

    // Check for TODO or FIXME comments
    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push({
        type: 'missing_content',
        message: 'Contains TODO or FIXME comments',
        severity: 'info',
      });
    }

    return issues;
  }

  /**
   * Resolve link path
   */
  private resolveLinkPath(
    url: string,
    currentFile: string,
    locale: string
  ): string {
    if (url.startsWith('./') || url.startsWith('../')) {
      return join(dirname(currentFile), url);
    }

    if (url.startsWith('/')) {
      return join('docs', locale, url.slice(1));
    }

    return join('docs', locale, url);
  }

  /**
   * Calculate validation score
   */
  private calculateScore(issues: ValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 10;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Generate validation report
   */
  private generateReport(): void {
    console.log('\n📊 Translation Validation Report');
    console.log('================================\n');

    let totalFiles = 0;
    let totalIssues = 0;
    let averageScore = 0;

    for (const result of this.results) {
      totalFiles++;
      totalIssues += result.issues.length;
      averageScore += result.score;

      console.log(`📄 ${result.file}`);
      console.log(`   Locale: ${result.locale}`);
      console.log(`   Score: ${result.score}/100`);
      console.log(`   Issues: ${result.issues.length}`);

      if (result.issues.length > 0) {
        for (const issue of result.issues) {
          const icon =
            issue.severity === 'error'
              ? '❌'
              : issue.severity === 'warning'
                ? '⚠️'
                : 'ℹ️';
          const lineInfo = issue.line ? ` (line ${issue.line})` : '';
          console.log(`   ${icon} ${issue.message}${lineInfo}`);
        }
      }
      console.log('');
    }

    if (totalFiles > 0) {
      averageScore = averageScore / totalFiles;

      console.log('📈 Summary');
      console.log('==========');
      console.log(`Total files validated: ${totalFiles}`);
      console.log(`Total issues found: ${totalIssues}`);
      console.log(`Average score: ${averageScore.toFixed(1)}/100`);

      if (averageScore >= 90) {
        console.log('🎉 Excellent translation quality!');
      } else if (averageScore >= 80) {
        console.log('✅ Good translation quality');
      } else if (averageScore >= 70) {
        console.log('⚠️  Translation quality needs improvement');
      } else {
        console.log(
          '❌ Translation quality is poor and needs significant work'
        );
      }
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles,
        totalIssues,
        averageScore: totalFiles > 0 ? averageScore : 0,
      },
      results: this.results,
    };

    require('fs').writeFileSync(
      'docs/i18n/validation-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log(
      '\n📄 Detailed report saved to: docs/i18n/validation-report.json'
    );
  }
}

async function main() {
  const validator = new TranslationValidator();
  await validator.validateAll();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}
