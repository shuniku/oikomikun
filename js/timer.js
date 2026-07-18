/**
 * HIITタイマーのコアロジック。
 * すべて純粋関数・イミュータブル。DOMには依存しない。
 * ブラウザ（<script>読み込み）と Node.js（require）の両方から使えるよう UMD 形式で公開する。
 */
;(function (globalScope, factory) {
  'use strict'
  const api = factory()
  if (typeof module === 'object' && module.exports) {
    module.exports = api
  } else {
    globalScope.HiitTimer = api
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  const MS_PER_SEC = 1000

  const CONFIG_LIMITS = {
    prepareSec: { min: 0, max: 300 },
    workSec: { min: 1, max: 3600 },
    restSec: { min: 0, max: 3600 },
    sets: { min: 1, max: 99 },
  }

  const DEFAULT_CONFIG = Object.freeze({ prepareSec: 10, workSec: 20, restSec: 10, sets: 8 })

  /** 表示名は言語依存のため持たない（js/i18n.js の presetNames が id をキーに解決する） */
  const PRESETS = Object.freeze([
    Object.freeze({
      id: 'personal',
      config: Object.freeze({ prepareSec: 5, workSec: 240, restSec: 180, sets: 6 }),
    }),
    Object.freeze({
      id: 'tabata',
      config: Object.freeze({ prepareSec: 10, workSec: 20, restSec: 10, sets: 8 }),
    }),
    Object.freeze({
      id: 'hiit-standard',
      config: Object.freeze({ prepareSec: 10, workSec: 30, restSec: 15, sets: 10 }),
    }),
    Object.freeze({
      id: 'sprint',
      config: Object.freeze({ prepareSec: 10, workSec: 45, restSec: 15, sets: 6 }),
    }),
  ])

  /**
   * 設定値を検証する。
   * エラーは言語非依存の構造化データで返し、メッセージ文言への変換は表示層（app.js + i18n.js）が担う。
   * @returns {{ isValid: boolean, errors: Array<{ field: string, min: number, max: number }> }}
   */
  function validateConfig(config) {
    const errors = Object.entries(CONFIG_LIMITS)
      .filter(([key, limit]) => {
        const value = config ? config[key] : undefined
        return !Number.isInteger(value) || value < limit.min || value > limit.max
      })
      .map(([key, limit]) => ({ field: key, min: limit.min, max: limit.max }))

    return { isValid: errors.length === 0, errors }
  }

  /**
   * 設定からフェーズの配列を生成する。
   * 準備0秒なら prepare を省略し、最終セットの後ろに rest は付けない。
   * @returns {Array<{ type: 'prepare'|'work'|'rest', durationMs: number, set: number, totalSets: number }>}
   */
  function buildSchedule(config) {
    const phase = (type, durationSec, set) => ({
      type,
      durationMs: durationSec * MS_PER_SEC,
      set,
      totalSets: config.sets,
    })

    const preparePhases = config.prepareSec > 0 ? [phase('prepare', config.prepareSec, 0)] : []

    const setPhases = Array.from({ length: config.sets }, (_, index) => {
      const set = index + 1
      const isLastSet = set === config.sets
      const workPhase = phase('work', config.workSec, set)
      const shouldRest = !isLastSet && config.restSec > 0
      return shouldRest ? [workPhase, phase('rest', config.restSec, set)] : [workPhase]
    }).flat()

    return [...preparePhases, ...setPhases]
  }

  /**
   * タイマーの初期状態を返す。
   */
  function createInitialState(schedule) {
    return {
      phaseIndex: 0,
      phaseRemainingMs: schedule[0].durationMs,
      isFinished: false,
    }
  }

  /**
   * 経過時間 deltaMs を適用した新しい状態を返す。元の state は変更しない。
   * フェーズを使い切った余剰時間は次のフェーズへ繰り越す。
   */
  function advance(schedule, state, deltaMs) {
    if (state.isFinished) {
      return { ...state }
    }

    let phaseIndex = state.phaseIndex
    let remainingMs = state.phaseRemainingMs - deltaMs

    while (remainingMs <= 0) {
      const nextIndex = phaseIndex + 1
      if (nextIndex >= schedule.length) {
        return { phaseIndex, phaseRemainingMs: 0, isFinished: true }
      }
      phaseIndex = nextIndex
      remainingMs += schedule[phaseIndex].durationMs
    }

    return { phaseIndex, phaseRemainingMs: remainingMs, isFinished: false }
  }

  /**
   * スケジュール全体の所要時間（ms）。
   */
  function totalDurationMs(schedule) {
    return schedule.reduce((sum, phase) => sum + phase.durationMs, 0)
  }

  /**
   * 現在状態までの経過時間（ms）。進捗バーの計算に使う。
   */
  function elapsedMs(schedule, state) {
    if (state.isFinished) {
      return totalDurationMs(schedule)
    }
    const completedMs = schedule
      .slice(0, state.phaseIndex)
      .reduce((sum, phase) => sum + phase.durationMs, 0)
    const currentPhaseMs = schedule[state.phaseIndex].durationMs - state.phaseRemainingMs
    return completedMs + currentPhaseMs
  }

  return {
    CONFIG_LIMITS,
    DEFAULT_CONFIG,
    PRESETS,
    validateConfig,
    buildSchedule,
    createInitialState,
    advance,
    totalDurationMs,
    elapsedMs,
  }
})
