/**
 * UI文言の辞書と整形ヘルパー（日本語 / English / 中文）。
 * UI 文言は app.js に直書きせず、必ずこの辞書に置く。
 * timer.js と同様に UMD 形式で、ブラウザと Node.js（テスト）の両方から使える。
 */
;(function (globalScope, factory) {
  'use strict'
  const api = factory()
  if (typeof module === 'object' && module.exports) {
    module.exports = api
  } else {
    globalScope.HiitI18n = api
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  const LANGUAGES = Object.freeze(['ja', 'en', 'zh'])

  /** 言語ボタンの表示名（常に各言語自身の表記で出す） */
  const LANGUAGE_NAMES = Object.freeze({ ja: '日本語', en: 'English', zh: '中文' })

  /** html 要素の lang 属性に設定する値 */
  const HTML_LANG = Object.freeze({ ja: 'ja', en: 'en', zh: 'zh-CN' })

  const MESSAGES = Object.freeze({
    ja: {
      documentTitle: '追い込みくん | HIITタイマー',
      presetGroupLabel: 'プリセット',
      presetNames: { personal: 'マイセット', tabata: 'タバタ', 'hiit-standard': 'HIIT標準', sprint: 'スプリント' },
      fieldLabels: { prepareSec: '準備（秒）', workSec: '運動（秒）', restSec: '休憩（秒）', sets: 'セット数' },
      errorFieldNames: { prepareSec: '準備時間', workSec: '運動時間', restSec: '休憩時間', sets: 'セット数' },
      errorRange: '{label}は {min}〜{max} の整数で入力してください',
      totalLabel: '合計',
      soundLabel: 'サウンド ON',
      start: 'スタート',
      pause: '一時停止',
      resume: '再開',
      restart: 'もう一度',
      reset: 'リセット',
      phases: { prepare: '準備', work: '運動', rest: '休憩' },
      finished: '完了！',
      setCounter: 'セット {set} / {total}',
      totalSets: '全 {total} セット',
      finishedSets: '全 {total} セット お疲れさまでした',
    },
    en: {
      documentTitle: 'Oikomikun | HIIT Timer',
      presetGroupLabel: 'Presets',
      presetNames: { personal: 'My Set', tabata: 'Tabata', 'hiit-standard': 'HIIT Standard', sprint: 'Sprint' },
      fieldLabels: { prepareSec: 'Prepare (sec)', workSec: 'Work (sec)', restSec: 'Rest (sec)', sets: 'Sets' },
      errorFieldNames: { prepareSec: 'Prepare time', workSec: 'Work time', restSec: 'Rest time', sets: 'Number of sets' },
      errorRange: '{label} must be an integer between {min} and {max}',
      totalLabel: 'Total',
      soundLabel: 'Sound ON',
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      restart: 'Restart',
      reset: 'Reset',
      phases: { prepare: 'Prepare', work: 'Work', rest: 'Rest' },
      finished: 'Done!',
      setCounter: 'Set {set} / {total}',
      totalSets: '{total} sets total',
      finishedSets: 'All {total} sets done — great work!',
    },
    zh: {
      documentTitle: 'Oikomikun | HIIT计时器',
      presetGroupLabel: '预设',
      presetNames: { personal: '我的组合', tabata: 'Tabata', 'hiit-standard': 'HIIT标准', sprint: '冲刺' },
      fieldLabels: { prepareSec: '准备（秒）', workSec: '运动（秒）', restSec: '休息（秒）', sets: '组数' },
      errorFieldNames: { prepareSec: '准备时间', workSec: '运动时间', restSec: '休息时间', sets: '组数' },
      errorRange: '{label}请输入 {min}～{max} 之间的整数',
      totalLabel: '总计',
      soundLabel: '声音开启',
      start: '开始',
      pause: '暂停',
      resume: '继续',
      restart: '再来一次',
      reset: '重置',
      phases: { prepare: '准备', work: '运动', rest: '休息' },
      finished: '完成！',
      setCounter: '第 {set} / {total} 组',
      totalSets: '共 {total} 组',
      finishedSets: '全部 {total} 组完成，辛苦了！',
    },
  })

  /**
   * "{key}" 形式のプレースホルダを params の値で置き換える。
   */
  function format(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
      params && params[key] !== undefined ? String(params[key]) : match
    )
  }

  /**
   * ブラウザの言語設定から対応言語を判定する。非対応言語は英語にフォールバック。
   */
  function detectLanguage(navigatorLanguage) {
    const lang = String(navigatorLanguage || '').toLowerCase()
    if (lang.startsWith('ja')) {
      return 'ja'
    }
    if (lang.startsWith('zh')) {
      return 'zh'
    }
    return 'en'
  }

  /**
   * プリセットの表示ラベルを組み立てる（例: 「タバタ 20/10 ×8」）。
   */
  function presetLabel(messages, preset) {
    const name = messages.presetNames[preset.id] || preset.id
    const { workSec, restSec, sets } = preset.config
    return `${name} ${workSec}/${restSec} ×${sets}`
  }

  return { LANGUAGES, LANGUAGE_NAMES, HTML_LANG, MESSAGES, format, detectLanguage, presetLabel }
})
