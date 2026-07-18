'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const {
  PRESETS,
  validateConfig,
  buildSchedule,
  createInitialState,
  advance,
  totalDurationMs,
  elapsedMs,
} = require('../js/timer.js')

const TABATA = { prepareSec: 10, workSec: 20, restSec: 10, sets: 8 }

// --- validateConfig ---

test('validateConfig accepts a standard tabata config', () => {
  // Arrange
  const config = TABATA

  // Act
  const result = validateConfig(config)

  // Assert
  assert.equal(result.isValid, true)
  assert.deepEqual(result.errors, [])
})

test('validateConfig rejects workSec of 0', () => {
  const result = validateConfig({ ...TABATA, workSec: 0 })

  assert.equal(result.isValid, false)
  assert.equal(result.errors.length, 1)
})

test('validateConfig accepts prepareSec and restSec of 0', () => {
  const result = validateConfig({ ...TABATA, prepareSec: 0, restSec: 0 })

  assert.equal(result.isValid, true)
})

test('validateConfig rejects non-numeric and out-of-range values', () => {
  const result = validateConfig({ prepareSec: 'abc', workSec: 4000, restSec: -1, sets: 100 })

  assert.equal(result.isValid, false)
  assert.equal(result.errors.length, 4)
})

test('validateConfig rejects fractional sets', () => {
  const result = validateConfig({ ...TABATA, sets: 2.5 })

  assert.equal(result.isValid, false)
})

// --- buildSchedule ---

test('buildSchedule creates prepare, then work/rest pairs, without trailing rest', () => {
  const schedule = buildSchedule({ prepareSec: 10, workSec: 20, restSec: 10, sets: 3 })

  const types = schedule.map((phase) => phase.type)
  assert.deepEqual(types, ['prepare', 'work', 'rest', 'work', 'rest', 'work'])
})

test('buildSchedule omits prepare phase when prepareSec is 0', () => {
  const schedule = buildSchedule({ prepareSec: 0, workSec: 20, restSec: 10, sets: 2 })

  assert.deepEqual(schedule.map((phase) => phase.type), ['work', 'rest', 'work'])
})

test('buildSchedule omits rest phases when restSec is 0', () => {
  const schedule = buildSchedule({ prepareSec: 5, workSec: 20, restSec: 0, sets: 3 })

  assert.deepEqual(schedule.map((phase) => phase.type), ['prepare', 'work', 'work', 'work'])
})

test('buildSchedule attaches set numbers and durations in ms', () => {
  const schedule = buildSchedule({ prepareSec: 10, workSec: 20, restSec: 10, sets: 2 })

  assert.deepEqual(schedule[0], { type: 'prepare', durationMs: 10000, set: 0, totalSets: 2 })
  assert.deepEqual(schedule[1], { type: 'work', durationMs: 20000, set: 1, totalSets: 2 })
  assert.deepEqual(schedule[2], { type: 'rest', durationMs: 10000, set: 1, totalSets: 2 })
  assert.deepEqual(schedule[3], { type: 'work', durationMs: 20000, set: 2, totalSets: 2 })
})

// --- createInitialState ---

test('createInitialState points at the first phase with full remaining time', () => {
  const schedule = buildSchedule(TABATA)

  const state = createInitialState(schedule)

  assert.deepEqual(state, { phaseIndex: 0, phaseRemainingMs: 10000, isFinished: false })
})

// --- advance ---

test('advance counts down within a phase', () => {
  const schedule = buildSchedule(TABATA)
  const state = createInitialState(schedule)

  const next = advance(schedule, state, 3000)

  assert.deepEqual(next, { phaseIndex: 0, phaseRemainingMs: 7000, isFinished: false })
})

test('advance does not mutate the previous state', () => {
  const schedule = buildSchedule(TABATA)
  const state = createInitialState(schedule)

  advance(schedule, state, 3000)

  assert.deepEqual(state, { phaseIndex: 0, phaseRemainingMs: 10000, isFinished: false })
})

test('advance carries overflow into the next phase', () => {
  const schedule = buildSchedule(TABATA)
  const state = createInitialState(schedule)

  const next = advance(schedule, state, 12500)

  assert.deepEqual(next, { phaseIndex: 1, phaseRemainingMs: 17500, isFinished: false })
})

test('advance can skip multiple phases at once', () => {
  const schedule = buildSchedule({ prepareSec: 5, workSec: 10, restSec: 5, sets: 3 })
  const state = createInitialState(schedule)

  // 5s prepare + 10s work + 5s rest + 3s into second work
  const next = advance(schedule, state, 23000)

  assert.equal(next.phaseIndex, 3)
  assert.equal(schedule[next.phaseIndex].type, 'work')
  assert.equal(next.phaseRemainingMs, 7000)
})

test('advance finishes when time exceeds the whole schedule', () => {
  const schedule = buildSchedule({ prepareSec: 0, workSec: 10, restSec: 0, sets: 1 })
  const state = createInitialState(schedule)

  const next = advance(schedule, state, 10000)

  assert.equal(next.isFinished, true)
  assert.equal(next.phaseRemainingMs, 0)
})

test('advance on a finished state stays finished', () => {
  const schedule = buildSchedule({ prepareSec: 0, workSec: 10, restSec: 0, sets: 1 })
  const finished = advance(schedule, createInitialState(schedule), 99999)

  const next = advance(schedule, finished, 1000)

  assert.equal(next.isFinished, true)
})

test('advance with zero delta returns an equal state', () => {
  const schedule = buildSchedule(TABATA)
  const state = createInitialState(schedule)

  const next = advance(schedule, state, 0)

  assert.deepEqual(next, state)
})

// --- totalDurationMs / elapsedMs ---

test('totalDurationMs sums all phases', () => {
  const schedule = buildSchedule({ prepareSec: 10, workSec: 20, restSec: 10, sets: 8 })

  // 10 + 8*20 + 7*10 = 240s
  assert.equal(totalDurationMs(schedule), 240000)
})

test('elapsedMs reflects progress through the schedule', () => {
  const schedule = buildSchedule(TABATA)
  const state = createInitialState(schedule)

  const next = advance(schedule, state, 12500)

  assert.equal(elapsedMs(schedule, next), 12500)
})

test('elapsedMs equals total duration when finished', () => {
  const schedule = buildSchedule(TABATA)
  const finished = advance(schedule, createInitialState(schedule), 10 * 60 * 1000)

  assert.equal(elapsedMs(schedule, finished), totalDurationMs(schedule))
})

// --- PRESETS ---

test('PRESETS contains tabata with valid config', () => {
  const tabata = PRESETS.find((preset) => preset.id === 'tabata')

  assert.ok(tabata)
  assert.equal(validateConfig(tabata.config).isValid, true)
  assert.equal(tabata.config.workSec, 20)
  assert.equal(tabata.config.restSec, 10)
  assert.equal(tabata.config.sets, 8)
})

test('PRESETS contains personal preset with 240/180 x6 and 5s prepare', () => {
  // Arrange / Act
  const personal = PRESETS.find((preset) => preset.id === 'personal')

  // Assert
  assert.ok(personal)
  assert.equal(validateConfig(personal.config).isValid, true)
  assert.equal(personal.config.prepareSec, 5)
  assert.equal(personal.config.workSec, 240)
  assert.equal(personal.config.restSec, 180)
  assert.equal(personal.config.sets, 6)
})

test('every preset config is valid', () => {
  for (const preset of PRESETS) {
    assert.equal(validateConfig(preset.config).isValid, true, `preset ${preset.id} should be valid`)
  }
})
