import { test, expect } from '@playwright/test'

/**
 * UI（app.js）の E2E テスト。フェーズを短秒数に設定して実時間で検証する。
 * ロジックの網羅は test/timer.test.js（ユニット）が担い、
 * ここでは画面切替・フェーズ遷移・入力検証などブラウザでしか確認できない部分を見る。
 */

async function fillConfig(page, { prepare, work, rest, sets }) {
  await page.fill('#input-prepare', String(prepare))
  await page.fill('#input-work', String(work))
  await page.fill('#input-rest', String(rest))
  await page.fill('#input-sets', String(sets))
}

test('初期表示は設定画面のみが見える', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('#setup-screen')).toBeVisible()
  await expect(page.locator('#timer-screen')).toBeHidden()
})

test('スタートすると設定画面が隠れタイマー画面に切り替わる', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 1, work: 1, rest: 1, sets: 2 })

  await page.click('#btn-start')

  await expect(page.locator('#timer-screen')).toBeVisible()
  await expect(page.locator('#setup-screen')).toBeHidden()
})

test('準備→運動→休憩と遷移し完了まで到達する', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 1, work: 1, rest: 1, sets: 2 })

  await page.click('#btn-start')

  await expect(page.locator('body')).toHaveClass('phase-prepare')
  await expect(page.locator('body')).toHaveClass('phase-work', { timeout: 3000 })
  await expect(page.locator('body')).toHaveClass('phase-rest', { timeout: 3000 })
  await expect(page.locator('body')).toHaveClass('phase-finished', { timeout: 5000 })
  await expect(page.locator('#phase-label')).toHaveText('完了！')
})

test('一時停止と再開ができる', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 0, work: 60, rest: 10, sets: 1 })

  await page.click('#btn-start')
  await page.click('#btn-pause')
  await expect(page.locator('#btn-pause')).toHaveText('再開')

  await page.click('#btn-pause')
  await expect(page.locator('#btn-pause')).toHaveText('一時停止')
})

test('リセットで設定画面に戻る', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 0, work: 60, rest: 10, sets: 1 })

  await page.click('#btn-start')
  await page.click('#btn-reset')

  await expect(page.locator('#setup-screen')).toBeVisible()
  await expect(page.locator('#timer-screen')).toBeHidden()
})

test('プリセットをタップすると入力欄に反映される', async ({ page }) => {
  await page.goto('/')

  await page.click('.preset-btn:has-text("タバタ")')

  await expect(page.locator('#input-prepare')).toHaveValue('10')
  await expect(page.locator('#input-work')).toHaveValue('20')
  await expect(page.locator('#input-rest')).toHaveValue('10')
  await expect(page.locator('#input-sets')).toHaveValue('8')
})

test('マイセットを現在の設定で上書き保存でき、再読み込み後も保持される', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 2, work: 50, rest: 25, sets: 4 })

  await page.click('#btn-save-personal')

  const personalButton = page.locator('.preset-btn').first()
  await expect(personalButton).toHaveText('マイセット 50/25 ×4')

  await page.reload()
  await expect(page.locator('.preset-btn').first()).toHaveText('マイセット 50/25 ×4')

  // 別の値にした後マイセットをタップすると保存値が復元される
  await page.click('.preset-btn:has-text("タバタ")')
  await page.click('.preset-btn:has-text("マイセット")')
  await expect(page.locator('#input-prepare')).toHaveValue('2')
  await expect(page.locator('#input-work')).toHaveValue('50')
  await expect(page.locator('#input-rest')).toHaveValue('25')
  await expect(page.locator('#input-sets')).toHaveValue('4')
})

test('不正な入力ではマイセットに保存されない', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 10, work: 0, rest: 10, sets: 8 })

  await page.click('#btn-save-personal')

  await expect(page.locator('#error-box')).toBeVisible()
  await expect(page.locator('.preset-btn').first()).toHaveText('マイセット 240/180 ×6')
})

test('不正な入力ではエラーを表示して開始しない', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 10, work: 0, rest: 10, sets: 8 })

  await page.click('#btn-start')

  await expect(page.locator('#error-box')).toBeVisible()
  await expect(page.locator('#timer-screen')).toBeHidden()
})

test('設定は保存され再読み込み後に復元される', async ({ page }) => {
  await page.goto('/')
  await fillConfig(page, { prepare: 5, work: 240, rest: 180, sets: 6 })

  await page.reload()

  await expect(page.locator('#input-work')).toHaveValue('240')
  await expect(page.locator('#input-rest')).toHaveValue('180')
  await expect(page.locator('#input-sets')).toHaveValue('6')
})
