import { test, expect } from '@playwright/test'

/**
 * 全画面切替ボタンの E2E テスト。
 * Fullscreen API はブラウザでしか動かないため、状態の追従はここで検証する。
 */

const isFullscreen = (page) => page.evaluate(() => document.fullscreenElement !== null)

test('ボタンで全画面に入り、もう一度押すと解除される', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('#btn-fullscreen')).toBeVisible()
  await page.click('#btn-fullscreen')

  await expect.poll(() => isFullscreen(page)).toBe(true)
  await expect(page.locator('#btn-fullscreen')).toHaveClass(/is-fullscreen/)
  await expect(page.locator('#btn-fullscreen')).toHaveAttribute('aria-label', '全画面表示を終了')

  await page.click('#btn-fullscreen')

  await expect.poll(() => isFullscreen(page)).toBe(false)
  await expect(page.locator('#btn-fullscreen')).not.toHaveClass(/is-fullscreen/)
  await expect(page.locator('#btn-fullscreen')).toHaveAttribute('aria-label', '全画面表示')
})

test('タイマー画面でも全画面に切り替えられる', async ({ page }) => {
  await page.goto('/')
  await page.fill('#input-prepare', '0')
  await page.fill('#input-work', '60')
  await page.fill('#input-rest', '10')
  await page.fill('#input-sets', '1')

  await page.click('#btn-start')
  await page.click('#btn-fullscreen')

  await expect.poll(() => isFullscreen(page)).toBe(true)
  await expect(page.locator('#timer-screen')).toBeVisible()
})

test('言語を切り替えるとラベルも切り替わる', async ({ page }) => {
  await page.goto('/')

  await page.click('.lang-btn:has-text("English")')

  await expect(page.locator('#btn-fullscreen')).toHaveAttribute('aria-label', 'Enter fullscreen')
})
