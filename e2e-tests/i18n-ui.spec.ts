import { expect, test } from '@playwright/test';

const locales = ['en', 'zh', 'ja', 'ko'];
const localeNames = {
  en: 'Dubhe Documentation',
  zh: 'Dubhe 文档',
  ja: 'Dubhe ドキュメント',
  ko: 'Dubhe 문서',
};

for (const locale of locales) {
  test.describe(`${locale} UI`, () => {
    test(`renders home page in ${locale}`, async ({ page }) => {
      await page.goto(`/docs/${locale === 'en' ? '' : locale + '/'}`);
      // 检查主标题
      await expect(page.locator('h1')).toContainText(localeNames[locale]);
      // 检查导航栏存在
      await expect(page.locator('nav')).toBeVisible();
      // 检查菜单项（示例）
      await expect(page.locator('body')).toContainText([
        'Getting Started',
        '快速开始',
        'はじめに',
        '시작하기',
      ]);
    });
  });
}

test('language switcher works', async ({ page }) => {
  await page.goto('/docs/');
  // 假设有语言切换按钮
  await page.click('button[aria-label="Language"]');
  await page.click('text=한국어');
  await expect(page.locator('h1')).toContainText('Dubhe 문서');
});
