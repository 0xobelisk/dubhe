import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { TranslationSynchronizer } from './sync-translations';

// Mock the fs module
jest.mock('fs');

describe('TranslationSynchronizer', () => {
  let synchronizer: TranslationSynchronizer;

  beforeEach(() => {
    synchronizer = new TranslationSynchronizer();
  });

  describe('syncAll', () => {
    it('should synchronize all files successfully', async () => {
      const mockFiles = [
        'docs/README.md',
        'docs/getting-started/quick-start.md',
      ];

      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('config.json')) {
          return JSON.stringify({
            defaultLocale: 'en',
            supportedLocales: ['en', 'zh', 'ja'],
          });
        }
        return mockFiles.join('\n');
      });

      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdirSync as jest.Mock).mockImplementation(() => {});
      (writeFileSync as jest.Mock).mockImplementation(() => {});

      await synchronizer.syncAll();

      expect(synchronizer['syncStats'].filesProcessed).toBe(2);
      expect(synchronizer['syncStats'].filesCreated).toBe(4); // 2 files × 2 target locales
      expect(synchronizer['syncStats'].errors).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      await synchronizer.syncAll();

      expect(synchronizer['syncStats'].errors).toBeGreaterThan(0);
    });
  });

  describe('syncFileToLocale', () => {
    it('should create new translated file when target does not exist', async () => {
      const sourceFile = 'docs/README.md';
      const targetLocale = 'zh';
      const sourceContent =
        '# Getting Started\n\nWelcome to Dubhe documentation.';

      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdirSync as jest.Mock).mockImplementation(() => {});
      (readFileSync as jest.Mock).mockReturnValue(sourceContent);
      (writeFileSync as jest.Mock).mockImplementation(() => {});

      await synchronizer['syncFileToLocale'](sourceFile, targetLocale);

      expect(synchronizer['syncStats'].filesCreated).toBe(1);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docs/zh/README.md'),
        expect.stringContaining('快速开始'),
        'utf-8'
      );
    });

    it('should update existing file when source is newer', async () => {
      const sourceFile = 'docs/README.md';
      const targetLocale = 'zh';
      const sourceContent = '# Getting Started\n\nUpdated content.';
      const existingContent = '# 快速开始\n\n旧内容。';

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('zh/README.md')) {
          return existingContent;
        }
        return sourceContent;
      });
      (writeFileSync as jest.Mock).mockImplementation(() => {});

      // Mock that source is newer than target
      const mockSourceStats = { mtime: new Date('2024-12-02') };
      const mockTargetStats = { mtime: new Date('2024-12-01') };
      (require('fs').statSync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path.includes('zh/')) {
            return mockTargetStats;
          }
          return mockSourceStats;
        }
      );

      await synchronizer['syncFileToLocale'](sourceFile, targetLocale);

      expect(synchronizer['syncStats'].filesUpdated).toBe(1);
    });

    it('should skip file when target is up to date', async () => {
      const sourceFile = 'docs/README.md';
      const targetLocale = 'zh';

      (existsSync as jest.Mock).mockReturnValue(true);

      // Mock that target is newer than source
      const mockSourceStats = { mtime: new Date('2024-12-01') };
      const mockTargetStats = { mtime: new Date('2024-12-02') };
      (require('fs').statSync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path.includes('zh/')) {
            return mockTargetStats;
          }
          return mockSourceStats;
        }
      );

      await synchronizer['syncFileToLocale'](sourceFile, targetLocale);

      expect(synchronizer['syncStats'].filesSkipped).toBe(1);
    });

    it('should backup file before modification when enabled', async () => {
      const sourceFile = 'docs/README.md';
      const targetLocale = 'zh';
      const sourceContent = '# Getting Started\n\nUpdated content.';

      synchronizer['config'].syncOptions.backupBeforeSync = true;

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(sourceContent);
      (writeFileSync as jest.Mock).mockImplementation(() => {});
      (copyFileSync as jest.Mock).mockImplementation(() => {});

      // Mock that source is newer than target
      const mockSourceStats = { mtime: new Date('2024-12-02') };
      const mockTargetStats = { mtime: new Date('2024-12-01') };
      (require('fs').statSync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path.includes('zh/')) {
            return mockTargetStats;
          }
          return mockSourceStats;
        }
      );

      await synchronizer['syncFileToLocale'](sourceFile, targetLocale);

      expect(copyFileSync).toHaveBeenCalled();
    });
  });

  describe('translateContent', () => {
    it('should translate content correctly', async () => {
      const content = 'Getting Started\nInstallation\nArchitecture';
      const targetLocale = 'zh';

      const translated = await synchronizer['translateContent'](
        content,
        targetLocale
      );

      expect(translated).toContain('快速开始');
      expect(translated).toContain('安装');
      expect(translated).toContain('架构');
    });

    it('should preserve code blocks during translation', async () => {
      const content =
        '```javascript\nconsole.log("Hello");\n```\n\nGetting Started';
      const targetLocale = 'zh';

      const translated = await synchronizer['translateContent'](
        content,
        targetLocale
      );

      expect(translated).toContain('```javascript');
      expect(translated).toContain('console.log("Hello");');
      expect(translated).toContain('快速开始');
    });

    it('should preserve links during translation', async () => {
      const content = '[Getting Started](./getting-started.md)\n\nInstallation';
      const targetLocale = 'zh';

      const translated = await synchronizer['translateContent'](
        content,
        targetLocale
      );

      expect(translated).toContain('[快速开始](./getting-started.md)');
      expect(translated).toContain('安装');
    });

    it('should handle Japanese translations', async () => {
      const content = 'Getting Started\nInstallation\nArchitecture';
      const targetLocale = 'ja';

      const translated = await synchronizer['translateContent'](
        content,
        targetLocale
      );

      expect(translated).toContain('はじめに');
      expect(translated).toContain('インストール');
      expect(translated).toContain('アーキテクチャ');
    });
  });

  describe('mergeContent', () => {
    it('should use existing content if it is substantial', async () => {
      const sourceContent = '# Getting Started\n\nNew content.';
      const existingContent =
        '# 快速开始\n\n这是一个很长的现有翻译内容，应该被保留。';
      const targetLocale = 'zh';

      const merged = await synchronizer['mergeContent'](
        sourceContent,
        existingContent,
        targetLocale
      );

      expect(merged).toBe(existingContent);
    });

    it('should translate content if existing content is too short', async () => {
      const sourceContent = '# Getting Started\n\nNew content.';
      const existingContent = '# 快速开始\n\n短';
      const targetLocale = 'zh';

      const merged = await synchronizer['mergeContent'](
        sourceContent,
        existingContent,
        targetLocale
      );

      expect(merged).toContain('快速开始');
      expect(merged).not.toBe(existingContent);
    });
  });

  describe('getTranslationMap', () => {
    it('should return correct translation map for Chinese', () => {
      const map = synchronizer['getTranslationMap']('zh');

      expect(map['Getting Started']).toBe('快速开始');
      expect(map['Installation']).toBe('安装');
      expect(map['Architecture']).toBe('架构');
    });

    it('should return correct translation map for Japanese', () => {
      const map = synchronizer['getTranslationMap']('ja');

      expect(map['Getting Started']).toBe('はじめに');
      expect(map['Installation']).toBe('インストール');
      expect(map['Architecture']).toBe('アーキテクチャ');
    });

    it('should return empty map for unsupported locale', () => {
      const map = synchronizer['getTranslationMap']('ko');

      expect(map).toEqual({});
    });
  });

  describe('generateReport', () => {
    it('should generate synchronization report', () => {
      synchronizer['syncStats'] = {
        filesProcessed: 5,
        filesCreated: 3,
        filesUpdated: 1,
        filesSkipped: 1,
        errors: 0,
      };

      (writeFileSync as jest.Mock).mockImplementation(() => {});

      synchronizer['generateReport']();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Synchronization Report')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Success rate: 100.0%')
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        'docs/i18n/sync-report.json',
        expect.stringContaining('"timestamp"'),
        'utf-8'
      );
    });

    it('should calculate success rate correctly', () => {
      synchronizer['syncStats'] = {
        filesProcessed: 10,
        filesCreated: 5,
        filesUpdated: 3,
        filesSkipped: 1,
        errors: 1,
      };

      (writeFileSync as jest.Mock).mockImplementation(() => {});

      synchronizer['generateReport']();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Success rate: 90.0%')
      );
    });
  });

  describe('backupFile', () => {
    it('should backup file successfully', () => {
      const filePath = 'docs/zh/README.md';

      (copyFileSync as jest.Mock).mockImplementation(() => {});

      synchronizer['backupFile'](filePath);

      expect(copyFileSync).toHaveBeenCalledWith(
        filePath,
        expect.stringMatching(/docs\/zh\/README\.md\.backup\.\d+/)
      );
    });

    it('should handle backup errors gracefully', () => {
      const filePath = 'docs/zh/README.md';

      (copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Backup failed');
      });

      synchronizer['backupFile'](filePath);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to backup'),
        expect.any(Error)
      );
    });
  });
});
