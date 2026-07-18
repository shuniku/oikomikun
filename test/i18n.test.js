'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const { LANGUAGES, LANGUAGE_NAMES, HTML_LANG, MESSAGES, format, detectLanguage, presetLabel } =
  require('../js/i18n.js')

const { PRESETS } = require('../js/timer.js')

/** オブジェクトのキー構造を再帰的に取り出す（値は無視） */
function keyPaths(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null ? keyPaths(value, path) : [path]
  })
}

// --- 辞書の整合性 ---

test('all languages have identical message key structures', () => {
  // Arrange
  const baseKeys = keyPaths(MESSAGES.ja).sort()

  // Act & Assert
  for (const language of LANGUAGES) {
    assert.deepEqual(keyPaths(MESSAGES[language]).sort(), baseKeys, `language: ${language}`)
  }
})

test('LANGUAGES all have names, html lang values, and messages', () => {
  for (const language of LANGUAGES) {
    assert.ok(LANGUAGE_NAMES[language], `name for ${language}`)
    assert.ok(HTML_LANG[language], `html lang for ${language}`)
    assert.ok(MESSAGES[language], `messages for ${language}`)
  }
})

test('every preset id has a display name in every language', () => {
  for (const language of LANGUAGES) {
    for (const preset of PRESETS) {
      assert.ok(
        MESSAGES[language].presetNames[preset.id],
        `presetNames.${preset.id} in ${language}`
      )
    }
  }
})

// --- format ---

test('format replaces placeholders with params', () => {
  const result = format('セット {set} / {total}', { set: 3, total: 8 })

  assert.equal(result, 'セット 3 / 8')
})

test('format leaves unknown placeholders as-is', () => {
  const result = format('{known} and {unknown}', { known: 'x' })

  assert.equal(result, 'x and {unknown}')
})

// --- detectLanguage ---

test('detectLanguage maps browser languages to supported ones', () => {
  assert.equal(detectLanguage('ja'), 'ja')
  assert.equal(detectLanguage('ja-JP'), 'ja')
  assert.equal(detectLanguage('zh-CN'), 'zh')
  assert.equal(detectLanguage('zh-TW'), 'zh')
  assert.equal(detectLanguage('en-US'), 'en')
})

test('detectLanguage falls back to English for unsupported or empty input', () => {
  assert.equal(detectLanguage('fr-FR'), 'en')
  assert.equal(detectLanguage(''), 'en')
  assert.equal(detectLanguage(undefined), 'en')
})

// --- presetLabel ---

test('presetLabel builds label from name and config', () => {
  const tabata = PRESETS.find((preset) => preset.id === 'tabata')

  assert.equal(presetLabel(MESSAGES.ja, tabata), 'タバタ 20/10 ×8')
  assert.equal(presetLabel(MESSAGES.en, tabata), 'Tabata 20/10 ×8')
  assert.equal(presetLabel(MESSAGES.zh, tabata), 'Tabata 20/10 ×8')
})
