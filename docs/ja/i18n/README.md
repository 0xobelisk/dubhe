# 国際化 (i18n) ドキュメント

This directory contains the internationalization setup and tools for Dubhe documentation.

## 🌍 Overview

Dubhe documentation supports multiple languages to serve our global community:

- **English (en)** - Primary language, source of truth
- **Chinese (zh)** - 中文文档
- **Japanese (ja)** - 日本語ドキュメント
- **Korean (ko)** - 한국어 문서

## 📁 Directory Structure

```
docs/i18n/
├── config.json              # i18n configuration
├── README.md                # This file
├── scripts/
│   ├── translate-docs.ts    # Automated translation script
│   ├── validate-translations.ts  # Translation validation
│   └── sync-translations.ts # Translation synchronization
├── translation-report.json  # Generated translation status
├── validation-report.json   # Generated validation results
└── sync-report.json        # Generated sync results
```

## ⚙️ 設定

The `config.json` file contains all i18n settings:

```json
{
  "defaultLocale": "en",
  "supportedLocales": ["en", "zh", "ja"],
  "localeNames": {
    "en": "English",
    "zh": "中文",
    "ja": "日本語"
  },
  "localePaths": {
    "en": "",
    "zh": "/zh",
    "ja": "/ja"
  },
  "translationStatus": {
    "en": {
      "completion": 100,
      "lastUpdated": "2024-12-01",
      "maintainers": ["dubhe-team"]
    }
  },
  "priorityPages": ["getting-started/quick-start.md", "getting-started/installation.md"],
  "translationWorkflow": {
    "autoTranslate": true,
    "requireReview": true,
    "reviewers": 2,
    "qualityThreshold": 0.8
  }
}
```

## 🛠️ Tools

### 1. Translation Script (`translate-docs.ts`)

Automatically translates documentation files from English to other languages.

**Usage:**

```bash
npm run translate-docs
```

**Features:**

- Scans for files that need translation
- Preserves code blocks and links
- Applies basic translation mappings
- Generates translation reports
- Prioritizes important pages

### 2. Validation Script (`validate-translations.ts`)

Validates translated files for quality and consistency.

**Usage:**

```bash
npm run validate-translations
```

**Checks:**

- Missing or broken links
- Inconsistent terminology
- Format errors (unclosed code blocks, etc.)
- Missing content
- Translation quality scoring

### 3. Synchronization Script (`sync-translations.ts`)

Synchronizes translations across all locales, preserving existing work.

**Usage:**

```bash
npm run sync-translations
```

**Features:**

- Preserves existing translations
- Backs up files before modification
- Only updates when source is newer
- Merges content intelligently
- Runs validation after sync

## 📋 Translation Workflow

### 1. Initial Setup

1. **Configure languages** in `config.json`
2. **Set up directory structure**:
   ```
   docs/
   ├── README.md          # English (source)
   ├── zh/
   │   └── README.md      # Chinese
   ├── ja/
   │   └── README.md      # Japanese
   └── ko/
    └── README.md      # Korean
   ```

### 2. Translation Process

1. **Create English content** in `docs/` directory
2. **Run translation script**:
   ```bash
   npm run translate-docs
   ```
3. **Review and edit** translated files
4. **Validate quality**:
   ```bash
   npm run validate-translations
   ```
5. **Update translation status** in `config.json`

### 3. Ongoing Maintenance

1. **Update English content** as needed
2. **Sync translations**:
   ```bash
   npm run sync-translations
   ```
3. **Review changes** and ensure quality
4. **Update status** and commit changes

## 📊 Quality Assurance

### Translation Standards

- **Accuracy**: Content must accurately reflect the English source
- **Consistency**: Use consistent terminology across all languages
- **Completeness**: All sections must be translated
- **Format**: Preserve Markdown formatting and structure
- **Links**: Ensure all internal and external links work

### Quality Metrics

- **Completion percentage**: % of files translated
- **Validation score**: 0-100 based on quality checks
- **Review status**: Whether translations have been reviewed
- **Last updated**: When translations were last modified

### Review Process

1. **Automated checks** run on all translations
2. **Manual review** by native speakers
3. **コミュニティ feedback** through GitHub issues
4. **Regular audits** to maintain quality

## 🔧 Customization

### Adding New Languages

1. **Update config.json**:

   ```json
   {
     "supportedLocales": ["en", "zh", "ja", "ko"],
     "localeNames": {
       "ko": "한국어"
     },
     "localePaths": {
       "ko": "/ko"
     }
   }
   ```

2. **Create language directory**:

   ```bash
   mkdir docs/ko
   ```

3. **Add translation mappings** in scripts
4. **Run translation** to generate initial content

### Custom Translation Mappings

Edit the translation maps in the scripts:

```typescript
const translations = {
  'en-ko': {
    'Getting Started': '시작하기',
    Installation: '설치',
    // Add more mappings
  },
};
```

### Quality Thresholds

Adjust quality requirements in `config.json`:

```json
{
  "translationWorkflow": {
    "qualityThreshold": 0.9, // Require 90% quality
    "reviewers": 3 // Require 3 reviewers
  }
}
```

## 📈 モニタリング and Reporting

### Generated Reports

- **translation-report.json**: Status of all translations
- **validation-report.json**: Quality assessment results
- **sync-report.json**: Synchronization statistics

### Metrics Tracked

- Files processed, created, updated, skipped
- Error rates and success percentages
- Quality scores and validation issues
- Translation completion percentages

### Continuous Improvement

- **Regular audits** of translation quality
- **コミュニティ feedback** integration
- **Automated quality checks** in CI/CD
- **パフォーマンス monitoring** of translation tools

## 🤝 コミュニティ Contribution

### How to Contribute

1. **Fork the repository**
2. **Create a branch** for your language
3. **Translate content** following guidelines
4. **Run validation** to ensure quality
5. **Submit a pull request** with your changes

### Translation Guidelines

- **Preserve technical terms** (CLI, API, SDK, etc.)
- **Maintain consistent terminology** across all files
- **Keep code examples unchanged**
- **Update links** to point to correct language versions
- **Add language-specific notes** where appropriate

### Review Process

1. **Automated validation** must pass
2. **Manual review** by maintainers
3. **コミュニティ feedback** period
4. **Final approval** and merge

## 🚀 Best Practices

### Content Management

- **Single source of truth**: English content is the primary source
- **Version control**: All translations are version controlled
- **Backup strategy**: Automatic backups before major changes
- **Rollback capability**: Easy to revert problematic translations

### Quality Control

- **Automated testing**: Scripts run on every change
- **Manual review**: Human oversight for critical content
- **コミュニティ feedback**: Open for community input
- **Regular audits**: Periodic quality assessments

### パフォーマンス

- **Incremental updates**: Only translate changed content
- **Parallel processing**: Multiple languages processed simultaneously
- **Caching**: Cache translation results where appropriate
- **Optimized workflows**: Streamlined processes for efficiency

## 📞 サポート

### Getting Help

- **ドキュメント issues**: Create GitHub issues
- **Translation questions**: Ask in community channels
- **Tool problems**: Check script documentation
- **Quality concerns**: Submit feedback through forms

### Resources

- **Translation memory**: Reuse previous translations
- **Style guides**: Language-specific writing guidelines
- **Glossaries**: Technical term translations
- **Templates**: Standard document structures

## 🗂️ 版本化文档与灰度发布

### 版本化文档结构

- 所有历史版本文档存放于 `docs/versions/vX/` 目录下（如 v1、v2）。
- 每个版本支持多语言（如 `docs/versions/v1/zh/README.md`）。
- 主文档入口 `docs/README.md` 提供版本切换导航。

### 版本切换

- 前端可集成"版本切换"下拉菜单，自动跳转到对应版本目录。
- 也可通过 URL 直接访问，如 `/docs/versions/v1/`。

### 灰度发布与 A/B 测试

- 支持通过 URL 参数、Cookie、用户分组等方式，将部分用户定向到新版本文档，实现灰度发布。
- 可在 CI/CD 流水线中自动部署多版本文档，结合 Nginx/前端路由实现流量分流。
- 支持 A/B 测试：如 `/docs/?ab=2` 跳转到 v2 文档。

### 版本管理建议

- 仅主线文档持续更新，历史版本只做安全修复。
- 版本切换组件建议与 i18n 语言切换组件并列展示。
- 版本目录结构与主线保持一致，便于内容同步和一致性校验。

---

**Last updated**: December 2024  
**Maintainers**: Dubhe Team  
**Version**: 1.0.0
