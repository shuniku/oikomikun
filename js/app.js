/**
 * UI制御・音声・Wake Lock・localStorage 保存。
 * タイマーの計算はすべて js/timer.js（HiitTimer）に委譲する。
 */
;(function () {
  'use strict'

  const Timer = window.HiitTimer

  const STORAGE_KEY = 'hiit-timer-settings'
  const TICK_INTERVAL_MS = 100
  const COUNTDOWN_BEEP_FROM_SEC = 3

  const PHASE_LABELS = { prepare: '準備', work: '運動', rest: '休憩' }
  const FINISHED_LABEL = '完了！'

  const elements = {
    body: document.body,
    setupScreen: document.getElementById('setup-screen'),
    timerScreen: document.getElementById('timer-screen'),
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

  // ===== 設定の保存・復元 =====

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return { config: Timer.DEFAULT_CONFIG, soundEnabled: true }
      }
      const parsed = JSON.parse(raw)
      const config = Timer.validateConfig(parsed.config).isValid
        ? parsed.config
        : Timer.DEFAULT_CONFIG
      return { config, soundEnabled: parsed.soundEnabled !== false }
    } catch (error) {
      console.warn('設定の読み込みに失敗したためデフォルト値を使用します', error)
      return { config: Timer.DEFAULT_CONFIG, soundEnabled: true }
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
    elements.errorBox.textContent = errors.join('\n')
    elements.errorBox.hidden = errors.length === 0
  }

  function renderPresetButtons() {
    for (const preset of Timer.PRESETS) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'preset-btn'
      button.textContent = preset.label
      button.addEventListener('click', () => {
        applyConfigToInputs(preset.config)
        showErrors([])
        renderTotalPreview()
        saveSettings()
      })
      elements.presetRow.appendChild(button)
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
      this.beep(type === 'work' ? 1320 : 660, 300)
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
    elements.pauseButton.textContent = '一時停止'
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
      elements.pauseButton.textContent = 'もう一度'
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
      elements.pauseButton.textContent = '一時停止'
    } else {
      runtime.isPaused = true
      stopTicking()
      wakeLock.release()
      elements.pauseButton.textContent = '再開'
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
      elements.phaseLabel.textContent = FINISHED_LABEL
      elements.timeDisplay.textContent = '00:00'
      elements.setCounter.textContent = `全 ${phase.totalSets} セット お疲れさまでした`
      setBodyPhase('finished')
    } else {
      elements.phaseLabel.textContent = PHASE_LABELS[phase.type]
      elements.timeDisplay.textContent = formatTime(state.phaseRemainingMs)
      elements.setCounter.textContent =
        phase.type === 'prepare'
          ? `全 ${phase.totalSets} セット`
          : `セット ${phase.set} / ${phase.totalSets}`
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
    applyConfigToInputs(settings.config)
    elements.soundToggle.checked = settings.soundEnabled

    renderPresetButtons()
    renderTotalPreview()

    for (const input of Object.values(elements.inputs)) {
      input.addEventListener('input', () => {
        renderTotalPreview()
        saveSettings()
      })
    }
    elements.soundToggle.addEventListener('change', saveSettings)
    elements.startButton.addEventListener('click', handleStartClick)
    elements.pauseButton.addEventListener('click', togglePause)
    elements.resetButton.addEventListener('click', resetTimer)

    registerServiceWorker()
  }

  init()
})()
