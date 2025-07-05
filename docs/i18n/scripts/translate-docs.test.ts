import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { DocumentationTranslator } from './translate-docs';

// Mock the fs module
jest.mock('fs');

describe('DocumentationTranslator', () => {
  let translator: DocumentationTranslator;
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
    translator = new DocumentationTranslator();
  });

  describe('scanForTranslation', () => {
    it('should scan for files that need translation', () => {
      const mockFiles = [
        'docs/README.md',
        'docs/getting-started/quick-start.md',
      ];
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('config.json')) {
          return JSON.stringify(mockConfig);
        }
        return mockFiles.join('\n');
      });
      (existsSync as jest.Mock).mockReturnValue(false);

      translator.scanForTranslation();

      expect(translator['tasks']).toHaveLength(4); // 2 files × 2 target locales
    });

    it('should skip files that are up to date', () => {
      const mockFiles = ['docs/README.md'];
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('config.json')) {
          return JSON.stringify(mockConfig);
        }
        return mockFiles.join('\n');
      });
      (existsSync as jest.Mock).mockReturnValue(true);

      translator.scanForTranslation();

      expect(translator['tasks']).toHaveLength(0);
    });
  });

  describe('translateFile', () => {
    it('should translate a file successfully', async () => {
      const task = {
        sourceFile: 'docs/README.md',
        targetFile: 'docs/zh/README.md',
        sourceLocale: 'en',
        targetLocale: 'zh',
        priority: 1,
      };

      const sourceContent =
        '# Getting Started\n\nWelcome to Dubhe documentation.';
      (readFileSync as jest.Mock).mockReturnValue(sourceContent);
      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdirSync as jest.Mock).mockImplementation(() => {});
      (writeFileSync as jest.Mock).mockImplementation(() => {});

      await translator.translateFile(task);

      expect(writeFileSync).toHaveBeenCalledWith(
        task.targetFile,
        expect.stringContaining('快速开始'),
        'utf-8'
      );
    });

    it('should handle translation errors gracefully', async () => {
      const task = {
        sourceFile: 'docs/README.md',
        targetFile: 'docs/zh/README.md',
        sourceLocale: 'en',
        targetLocale: 'zh',
        priority: 1,
      };

      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      await translator.translateFile(task);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to translate'),
        expect.any(Error)
      );
    });
  });

  describe('translateContent', () => {
    it('should preserve code blocks during translation', async () => {
      const content =
        '```javascript\nconsole.log("Hello");\n```\n\nGetting Started';
      const translated = await translator['translateContent'](
        content,
        'en',
        'zh'
      );

      expect(translated).toContain('```javascript');
      expect(translated).toContain('console.log("Hello");');
      expect(translated).toContain('快速开始');
    });

    it('should preserve links during translation', async () => {
      const content = '[Getting Started](./getting-started.md)\n\nInstallation';
      const translated = await translator['translateContent'](
        content,
        'en',
        'zh'
      );

      expect(translated).toContain('[快速开始](./getting-started.md)');
      expect(translated).toContain('安装');
    });

    it('should apply translation mappings correctly', async () => {
      const content = 'Getting Started\nInstallation\nArchitecture';
      const translated = await translator['translateContent'](
        content,
        'en',
        'zh'
      );

      expect(translated).toContain('快速开始');
      expect(translated).toContain('安装');
      expect(translated).toContain('架构');
    });
  });

  describe('generateReport', () => {
    it('should generate a translation report', () => {
      translator['tasks'] = [
        {
          sourceFile: 'docs/README.md',
          targetFile: 'docs/zh/README.md',
          sourceLocale: 'en',
          targetLocale: 'zh',
          priority: 1,
        },
        {
          sourceFile: 'docs/README.md',
          targetFile: 'docs/ja/README.md',
          sourceLocale: 'en',
          targetLocale: 'ja',
          priority: 1,
        },
      ];

      (writeFileSync as jest.Mock).mockImplementation(() => {});

      translator.generateReport();

      expect(writeFileSync).toHaveBeenCalledWith(
        'docs/i18n/translation-report.json',
        expect.stringContaining('"timestamp"'),
        'utf-8'
      );
    });
  });
});
