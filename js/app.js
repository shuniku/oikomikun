/**
 * UI制御・音声・Wake Lock・localStorage 保存。
 * タイマーの計算はすべて js/timer.js（HiitTimer）に委譲する。
 */
;(function () {
  'use strict'

  const Timer = window.HiitTimer
  const I18n = window.HiitI18n

  const STORAGE_KEY = 'hiit-timer-settings'
  const TICK_INTERVAL_MS = 100
  const COUNTDOWN_BEEP_FROM_SEC = 5

  const elements = {
    body: document.body,
    setupScreen: document.getElementById('setup-screen'),
    timerScreen: document.getElementById('timer-screen'),
    langRow: document.getElementById('lang-row'),
    presetRow: document.getElementById('preset-row'),
    inputs: {
      prepareSec: document.getElementById('input-prepare'),
      workSec: document.getElementById('input-work'),
      restSec: document.getElementById('input-rest'),
      sets: document.getElementById('input-sets'),
    },
    soundToggle: document.getElementById('input-sound'),
    totalPreview: document.getElementById('total-preview'),
    errorBox: document.getElementById('error-box'),
    savePersonalButton: document.getElementById('btn-save-personal'),
    startButton: document.getElementById('btn-start'),
    pauseButton: document.getElementById('btn-pause'),
    resetButton: document.getElementById('btn-reset'),
    phaseLabel: document.getElementById('phase-label'),
    timeDisplay: document.getElementById('time-display'),
    setCounter: document.getElementById('set-counter'),
    progressFill: document.getElementById('progress-fill'),
  }

  /** 実行中タイマーのランタイム情報（timer.js の state 自体はイミュータブル） */
  let runtime = null

  /** 現在の表示言語（'ja' | 'en' | 'zh'） */
  let currentLanguage = 'ja'

  /** 直近の検証エラー（言語切替時にメッセージを再翻訳するため保持） */
  let lastErrors = []

  /** マイセット（id: 'personal'）の既定値。timer.js の定義から取得する */
  const DEFAULT_PERSONAL_CONFIG = Timer.PRESETS.find((preset) => preset.id === 'personal').config

  /** ユーザーが上書き保存したマイセットの設定値 */
  let personalConfig = DEFAULT_PERSONAL_CONFIG

  /** マイセットをユーザー保存値で差し替えたプリセット一覧を返す（timer.js の定義は不変のまま） */
  function getPresets() {
    return Timer.PRESETS.map((preset) =>
      preset.id === 'personal' ? { ...preset, config: personalConfig } : preset
    )
  }

  /** 現在言語の文言辞書を返す */
  function t() {
    return I18n.MESSAGES[currentLanguage]
  }

  // ===== 設定の保存・復元 =====

  function loadSettings() {
    const defaultLanguage = I18n.detectLanguage(navigator.language)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return {
          config: Timer.DEFAULT_CONFIG,
          soundEnabled: true,
          language: defaultLanguage,
          personalConfig: DEFAULT_PERSONAL_CONFIG,
        }
      }
      const parsed = JSON.parse(raw)
      const config = Timer.validateConfig(parsed.config).isValid
        ? parsed.config
        : Timer.DEFAULT_CONFIG
      const language = I18n.LANGUAGES.includes(parsed.language) ? parsed.language : defaultLanguage
      const savedPersonalConfig = Timer.validateConfig(parsed.personalConfig).isValid
        ? parsed.personalConfig
        : DEFAULT_PERSONAL_CONFIG
      return {
        config,
        soundEnabled: parsed.soundEnabled !== false,
        language,
        personalConfig: savedPersonalConfig,
      }
    } catch (error) {
      console.warn('設定の読み込みに失敗したためデフォルト値を使用します', error)
      return {
        config: Timer.DEFAULT_CONFIG,
        soundEnabled: true,
        language: defaultLanguage,
        personalConfig: DEFAULT_PERSONAL_CONFIG,
      }
    }
  }

  function saveSettings() {
    const config = readConfigFromInputs()
    if (!Timer.validateConfig(config).isValid) {
      return
    }
    try {
      const settings = {
        config,
        soundEnabled: elements.soundToggle.checked,
        language: currentLanguage,
        personalConfig,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('設定の保存に失敗しました', error)
    }
  }

  // ===== フォーム =====

  function readConfigFromInputs() {
    const toInt = (input) => {
      const value = Number.parseInt(input.value, 10)
      return Number.isNaN(value) ? NaN : value
    }
    return {
      prepareSec: toInt(elements.inputs.prepareSec),
      workSec: toInt(elements.inputs.workSec),
      restSec: toInt(elements.inputs.restSec),
      sets: toInt(elements.inputs.sets),
    }
  }

  function applyConfigToInputs(config) {
    for (const [key, input] of Object.entries(elements.inputs)) {
      input.value = String(config[key])
    }
  }

  function renderTotalPreview() {
    const config = readConfigFromInputs()
    if (!Timer.validateConfig(config).isValid) {
      elements.totalPreview.textContent = '--:--'
      return
    }
    const totalMs = Timer.totalDurationMs(Timer.buildSchedule(config))
    elements.totalPreview.textContent = formatTime(totalMs)
  }

  function showErrors(errors) {
    lastErrors = errors
    const messages = errors.map((error) =>
      I18n.format(t().errorRange, {
        label: t().errorFieldNames[error.field],
        min: error.min,
        max: error.max,
      })
    )
    elements.errorBox.textContent = messages.join('\n')
    elements.errorBox.hidden = errors.length === 0
  }

  /** 言語切替・マイセット保存時にも呼び直すため、毎回作り直す */
  function renderPresetButtons() {
    elements.presetRow.replaceChildren()
    for (const preset of getPresets()) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'preset-btn'
      button.textContent = I18n.presetLabel(t(), preset)
      button.addEventListener('click', () => {
        applyConfigToInputs(preset.config)
        showErrors([])
        renderTotalPreview()
        saveSettings()
      })
      elements.presetRow.appendChild(button)
    }
  }

  // ===== マイセットの上書き保存 =====

  function handleSavePersonalClick() {
    const config = readConfigFromInputs()
    const result = Timer.validateConfig(config)
    if (!result.isValid) {
      showErrors(result.errors)
      return
    }
    personalConfig = config
    showErrors([])
    renderPresetButtons()
    saveSettings()
  }

  // ===== 言語切替 =====

  function renderLanguageButtons() {
    elements.langRow.replaceChildren()
    for (const language of I18n.LANGUAGES) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = language === currentLanguage ? 'lang-btn is-active' : 'lang-btn'
      button.textContent = I18n.LANGUAGE_NAMES[language]
      button.addEventListener('click', () => {
        applyLanguage(language)
        saveSettings()
      })
      elements.langRow.appendChild(button)
    }
  }

  function applyLanguage(language) {
    currentLanguage = language
    const messages = t()
    document.documentElement.lang = I18n.HTML_LANG[language]
    document.title = messages.documentTitle

    for (const element of document.querySelectorAll('[data-i18n]')) {
      const value = element.dataset.i18n
        .split('.')
        .reduce((object, key) => (object ? object[key] : undefined), messages)
      if (typeof value === 'string') {
        element.textContent = value
      }
    }

    elements.presetRow.setAttribute('aria-label', messages.presetGroupLabel)
    renderPresetButtons()
    renderLanguageButtons()
    showErrors(lastErrors)
    if (runtime) {
      renderTimer()
    }
  }

  // ===== 音声（Web Audio API で合成、外部ファイル不使用） =====

  const sound = {
    context: null,

    ensureContext() {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (AudioContextClass) {
          this.context = new AudioContextClass()
        }
      }
      if (this.context && this.context.state === 'suspended') {
        this.context.resume().catch(() => {})
      }
    },

    beep(frequency, durationMs, delayMs = 0) {
      if (!elements.soundToggle.checked || !this.context) {
        return
      }
      const startTime = this.context.currentTime + delayMs / 1000
      const endTime = startTime + durationMs / 1000
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, endTime)
      oscillator.connect(gain).connect(this.context.destination)
      oscillator.start(startTime)
      oscillator.stop(endTime)
    },

    countdown() {
      this.beep(880, 100)
    },

    phaseStart(type) {
      this.beep(type === 'work' ? 1320 : 660, 1000)
    },

    finish() {
      this.beep(1320, 150, 0)
      this.beep(1320, 150, 200)
      this.beep(1760, 400, 400)
    },
  }

  // ===== Wake Lock（対応ブラウザのみ・失敗しても動作継続） =====

  const wakeLock = {
    sentinel: null,

    async acquire() {
      if (!('wakeLock' in navigator)) {
        return
      }
      try {
        this.sentinel = await navigator.wakeLock.request('screen')
      } catch (error) {
        console.warn('Wake Lock を取得できませんでした', error)
      }
    },

    release() {
      if (this.sentinel) {
        this.sentinel.release().catch(() => {})
        this.sentinel = null
      }
    },
  }

  document.addEventListener('visibilitychange', () => {
    const isRunning = runtime && !runtime.isPaused && !runtime.state.isFinished
    if (document.visibilityState === 'visible' && isRunning) {
      wakeLock.acquire()
    }
  })

  // ===== タイマー実行 =====

  function startTimer(config) {
    const schedule = Timer.buildSchedule(config)
    runtime = {
      schedule,
      state: Timer.createInitialState(schedule),
      lastNow: performance.now(),
      isPaused: false,
      intervalId: setInterval(tick, TICK_INTERVAL_MS),
    }
    sound.ensureContext()
    sound.phaseStart(schedule[0].type)
    wakeLock.acquire()
    showScreen('timer')
    elements.pauseButton.textContent = t().pause
    renderTimer()
  }

  function tick() {
    if (!runtime || runtime.isPaused) {
      return
    }
    const now = performance.now()
    const previousState = runtime.state
    const nextState = Timer.advance(runtime.schedule, previousState, now - runtime.lastNow)
    runtime.lastNow = now
    runtime.state = nextState

    emitSoundEvents(previousState, nextState)
    renderTimer()

    if (nextState.isFinished) {
      stopTicking()
      wakeLock.release()
      elements.pauseButton.textContent = t().restart
    }
  }

  function emitSoundEvents(previousState, nextState) {
    if (nextState.isFinished) {
      if (!previousState.isFinished) {
        sound.finish()
      }
      return
    }
    if (nextState.phaseIndex !== previousState.phaseIndex) {
      sound.phaseStart(runtime.schedule[nextState.phaseIndex].type)
      return
    }
    const previousSec = Math.ceil(previousState.phaseRemainingMs / 1000)
    const nextSec = Math.ceil(nextState.phaseRemainingMs / 1000)
    if (nextSec !== previousSec && nextSec >= 1 && nextSec <= COUNTDOWN_BEEP_FROM_SEC) {
      sound.countdown()
    }
  }

  function stopTicking() {
    if (runtime && runtime.intervalId !== null) {
      clearInterval(runtime.intervalId)
      runtime.intervalId = null
    }
  }

  function togglePause() {
    if (!runtime) {
      return
    }
    if (runtime.state.isFinished) {
      startTimer(readConfigFromInputs())
      return
    }
    if (runtime.isPaused) {
      runtime.isPaused = false
      runtime.lastNow = performance.now()
      runtime.intervalId = setInterval(tick, TICK_INTERVAL_MS)
      sound.ensureContext()
      wakeLock.acquire()
      elements.pauseButton.textContent = t().pause
    } else {
      runtime.isPaused = true
      stopTicking()
      wakeLock.release()
      elements.pauseButton.textContent = t().resume
    }
  }

  function resetTimer() {
    stopTicking()
    wakeLock.release()
    runtime = null
    showScreen('setup')
  }

  // ===== 描画 =====

  function formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSec / 60)
    const seconds = totalSec % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function renderTimer() {
    const { schedule, state } = runtime
    const phase = schedule[state.phaseIndex]

    if (state.isFinished) {
      elements.phaseLabel.textContent = t().finished
      elements.timeDisplay.textContent = '00:00'
      elements.setCounter.textContent = I18n.format(t().finishedSets, { total: phase.totalSets })
      setBodyPhase('finished')
    } else {
      elements.phaseLabel.textContent = t().phases[phase.type]
      elements.timeDisplay.textContent = formatTime(state.phaseRemainingMs)
      elements.setCounter.textContent =
        phase.type === 'prepare'
          ? I18n.format(t().totalSets, { total: phase.totalSets })
          : I18n.format(t().setCounter, { set: phase.set, total: phase.totalSets })
      setBodyPhase(phase.type)
    }

    const progress = Timer.elapsedMs(schedule, state) / Timer.totalDurationMs(schedule)
    elements.progressFill.style.width = `${(progress * 100).toFixed(1)}%`
  }

  function setBodyPhase(phase) {
    elements.body.className = `phase-${phase}`
  }

  function showScreen(name) {
    const isTimer = name === 'timer'
    elements.setupScreen.hidden = isTimer
    elements.timerScreen.hidden = !isTimer
    if (!isTimer) {
      setBodyPhase('idle')
    }
  }

  // ===== Service Worker（公開ページのオフライン動作用） =====

  function registerServiceWorker() {
    // file:// で直接開いた場合は serviceWorker 自体が存在しない（その場合も元々オフラインで動く）
    if (!('serviceWorker' in navigator)) {
      return
    }
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.warn('Service Worker の登録に失敗しました', error)
    })
  }

  // ===== イベント登録・初期化 =====

  function handleStartClick() {
    const config = readConfigFromInputs()
    const result = Timer.validateConfig(config)
    if (!result.isValid) {
      showErrors(result.errors)
      return
    }
    showErrors([])
    saveSettings()
    startTimer(config)
  }

  function init() {
    const settings = loadSettings()
    personalConfig = settings.personalConfig
    applyConfigToInputs(settings.config)
    elements.soundToggle.checked = settings.soundEnabled

    applyLanguage(settings.language)
    renderTotalPreview()

    for (const input of Object.values(elements.inputs)) {
      input.addEventListener('input', () => {
        renderTotalPreview()
        saveSettings()
      })
    }
    elements.soundToggle.addEventListener('change', saveSettings)
    elements.savePersonalButton.addEventListener('click', handleSavePersonalClick)
    elements.startButton.addEventListener('click', handleStartClick)
    elements.pauseButton.addEventListener('click', togglePause)
    elements.resetButton.addEventListener('click', resetTimer)

    registerServiceWorker()
  }

  init()
})()
