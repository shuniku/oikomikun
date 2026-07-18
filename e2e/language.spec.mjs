import { test, expect } from '@playwright/test'

/**
 * 言語切替機能の E2E テスト。
 * デフォルトはブラウザ言語（playwright.config で ja-JP に固定）から日本語になる。
 */

test('デフォルトは日本語で表示される', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await expect(page.locator('#btn-start')).toHaveText('スタート')
  await expect(page.locator('.lang-btn.is-active')).toHaveText('日本語')
})

test('English に切り替えると全体が英語になる', async ({ page }) => {
  await page.goto('/')

  await page.click('.lang-btn:has-text("English")')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#btn-start')).toHaveText('Start')
  await expect(page.locator('label[for="input-work"]')).toHaveText('Work (sec)')
  await expect(page.locator('.preset-btn').nth(1)).toHaveText('Tabata 20/10 ×8')
})

test('中文 に切り替えると全体が中国語になる', async ({ page }) => {
  await page.goto('/')

  await page.click('.lang-btn:has-text("中文")')

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.locator('#btn-start')).toHaveText('开始')
  await expect(page.locator('label[for="input-work"]')).toHaveText('运动（秒）')
})

test('選んだ言語は再読み込み後も保持される', async ({ page }) => {
  await page.goto('/')
  await page.click('.lang-btn:has-text("English")')

  await page.reload()

  await expect(page.locator('#btn-start')).toHaveText('Start')
  await expect(page.locator('.lang-btn.is-active')).toHaveText('English')
})

test('タイマー画面の文言も選択言語で表示される', async ({ page }) => {
  await page.goto('/')
  await page.click('.lang-btn:has-text("English")')
  await page.fill('#input-prepare', '1')
  await page.fill('#input-work', '60')
  await page.fill('#input-rest', '10')
  await page.fill('#input-sets', '3')

  await page.click('#btn-start')

  await expect(page.locator('#phase-label')).toHaveText('Prepare')
  await expect(page.locator('#set-counter')).toHaveText('3 sets total')
  await expect(page.locator('#btn-pause')).toHaveText('Pause')
  await expect(page.locator('#btn-reset')).toHaveText('Reset')
})

test('エラーメッセージも選択言語で表示される', async ({ page }) => {
  await page.goto('/')
  await page.click('.lang-btn:has-text("English")')
  await page.fill('#input-prepare', '10')
  await page.fill('#input-work', '0')
  await page.fill('#input-rest', '10')
  await page.fill('#input-sets', '8')

  await page.click('#btn-start')

  await expect(page.locator('#error-box')).toHaveText(
    'Work time must be an integer between 1 and 3600'
  )
})
