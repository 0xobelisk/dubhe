import { existsSync, readFileSync } from 'fs';
import { TranslationValidator } from './validate-translations';

// Mock the fs module
jest.mock('fs');

describe('TranslationValidator', () => {
  let validator: TranslationValidator;
  const mockConfig = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh', 'ja'],
    localeNames: {
      en: 'English',
      zh: '中文',
      ja: '日本語',
    },
    localePaths: {
      en: '',
      zh: '/zh',
      ja: '/ja',
    },
    translationStatus: {
      en: {
        completion: 100,
        lastUpdated: '2024-12-01',
        maintainers: ['dubhe-team'],
      },
    },
    priorityPages: [
      'getting-started/quick-start.md',
      'getting-started/installation.md',
    ],
    translationWorkflow: {
      autoTranslate: true,
      requireReview: true,
      reviewers: 2,
      qualityThreshold: 0.8,
    },
  };

  beforeEach(() => {
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
    validator = new TranslationValidator();
  });

  describe('validateFile', () => {
    it('should validate a file with no issues', async () => {
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';
      const content =
        '# Dubhe 文档\n\n欢迎来到 Dubhe 文档。\n\n## 快速开始\n\n[快速开始指南](./getting-started/quick-start.md)';

      (readFileSync as jest.Mock).mockReturnValue(content);
      (existsSync as jest.Mock).mockReturnValue(true);

      await validator.validateFile(filePath, locale);

      expect(validator['results']).toHaveLength(1);
      expect(validator['results'][0].score).toBe(100);
      expect(validator['results'][0].issues).toHaveLength(0);
    });

    it('should detect missing links', async () => {
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';
      const content = '# Dubhe 文档\n\n[不存在的链接](./missing-file.md)';

      (readFileSync as jest.Mock).mockReturnValue(content);
      (existsSync as jest.Mock).mockReturnValue(false);

      await validator.validateFile(filePath, locale);

      expect(validator['results'][0].issues).toHaveLength(1);
      expect(validator['results'][0].issues[0].type).toBe('missing_link');
      expect(validator['results'][0].score).toBe(90); // 100 - 10 for error
    });

    it('should detect format errors', async () => {
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';
      const content =
        '# Dubhe 文档\n\n```javascript\nconsole.log("Hello");\n\n[未闭合的链接';

      (readFileSync as jest.Mock).mockReturnValue(content);
      (existsSync as jest.Mock).mockReturnValue(true);

      await validator.validateFile(filePath, locale);

      expect(validator['results'][0].issues).toHaveLength(2);
      expect(validator['results'][0].issues[0].type).toBe('format_error');
      expect(validator['results'][0].issues[1].type).toBe('format_error');
      expect(validator['results'][0].score).toBe(80); // 100 - 10 - 10 for two errors
    });

    it('should detect inconsistent terms', async () => {
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';
      const content = '# Dubhe 文档\n\nCLI 命令\nAPI 参考\nSDK 使用';

      (readFileSync as jest.Mock).mockReturnValue(content);
      (existsSync as jest.Mock).mockReturnValue(true);

      await validator.validateFile(filePath, locale);

      // Should not have issues since these terms are correctly preserved
      expect(validator['results'][0].issues).toHaveLength(0);
    });

    it('should detect missing content', async () => {
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';
      const content = '# Dubhe 文档\n\nTODO: 需要翻译';

      (readFileSync as jest.Mock).mockReturnValue(content);
      (existsSync as jest.Mock).mockReturnValue(true);

      await validator.validateFile(filePath, locale);

      expect(validator['results'][0].issues).toHaveLength(2);
      expect(validator['results'][0].issues[0].type).toBe('missing_content');
      expect(validator['results'][0].issues[1].type).toBe('missing_content');
      expect(validator['results'][0].score).toBe(94); // 100 - 5 - 1 for warning and info
    });
  });

  describe('checkMissingLinks', () => {
    it('should detect missing internal links', () => {
      const content = '[链接文本](./missing-file.md)';
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';

      (existsSync as jest.Mock).mockReturnValue(false);

      const issues = validator['checkMissingLinks'](content, filePath, locale);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_link');
      expect(issues[0].message).toContain('Missing link target');
    });

    it('should ignore external links', () => {
      const content = '[外部链接](https://example.com)';
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';

      const issues = validator['checkMissingLinks'](content, filePath, locale);

      expect(issues).toHaveLength(0);
    });

    it('should ignore anchor links', () => {
      const content = '[锚点链接](#section)';
      const filePath = 'docs/zh/README.md';
      const locale = 'zh';

      const issues = validator['checkMissingLinks'](content, filePath, locale);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkFormatErrors', () => {
    it('should detect unclosed code blocks', () => {
      const content = '```javascript\nconsole.log("Hello");\n';
      const filePath = 'docs/zh/README.md';

      const issues = validator['checkFormatErrors'](content, filePath);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('format_error');
      expect(issues[0].message).toContain('Unclosed code block');
    });

    it('should detect unclosed link brackets', () => {
      const content = '[未闭合的链接';
      const filePath = 'docs/zh/README.md';

      const issues = validator['checkFormatErrors'](content, filePath);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('format_error');
      expect(issues[0].message).toContain('Unclosed link brackets');
    });

    it('should detect missing main header', () => {
      const content = '## 二级标题\n\n内容';
      const filePath = 'docs/zh/README.md';

      const issues = validator['checkFormatErrors'](content, filePath);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('format_error');
      expect(issues[0].message).toContain('Missing main header');
    });
  });

  describe('calculateScore', () => {
    it('should calculate correct score for different issue types', () => {
      const issues = [
        { type: 'error', severity: 'error' as const, message: 'Error 1' },
        { type: 'warning', severity: 'warning' as const, message: 'Warning 1' },
        { type: 'info', severity: 'info' as const, message: 'Info 1' },
      ];

      const score = validator['calculateScore'](issues);

      expect(score).toBe(84); // 100 - 10 - 5 - 1
    });

    it('should not return negative score', () => {
      const issues = Array(20).fill({
        type: 'error',
        severity: 'error' as const,
        message: 'Error',
      });

      const score = validator['calculateScore'](issues);

      expect(score).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('should generate a validation report', () => {
      validator['results'] = [
        {
          file: 'docs/zh/README.md',
          locale: 'zh',
          issues: [],
          score: 100,
        },
        {
          file: 'docs/ja/README.md',
          locale: 'ja',
          issues: [
            {
              type: 'missing_link',
              severity: 'error' as const,
              message: 'Missing link',
            },
          ],
          score: 90,
        },
      ];

      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      validator.generateReport();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Translation Validation Report')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Average score: 95.0/100')
      );
    });
  });
});
