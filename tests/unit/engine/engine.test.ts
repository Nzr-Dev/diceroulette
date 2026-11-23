import { describe, expect, it } from 'vitest'
import {
  applyOperation, computeHighlights, createFudgeDie, createStandardDie, cryptoRng, exclusionStatus,
  pauseTimer, reachedAlerts, resetCounter, resetExclusion, resetTimer, resetWheel, rollAll, rollDice,
  roundResult, setCounterValue, spinWheel, startTimer, stepCounter, tickTimer, timerDisplayMs, wheelStatus,
} from '../../../shared/engine'
import { counterElementSchema, diceElementSchema, elementSchema, timerElementSchema, wheelElementSchema } from '../../../shared/schemas'
import { makeCounter, makeDice, makeGroup, makeTimer, makeWheel } from '../schemas/helpers'
import { fixedRng, seededRng } from './helpers'

const dice = (o: Record<string, unknown> = {}) => diceElementSchema.parse(makeDice(o))
const NOW = new Date('2026-11-19T20:00:00.000Z')

describe('cryptoRng', () => {
  it('stays in range and is roughly uniform', () => {
    const counts = new Array(6).fill(0)
    for (let i = 0; i < 60000; i++) counts[cryptoRng.int(6)]++
    for (const c of counts) expect(c).toBeGreaterThan(9000) // expected 10000
    for (const c of counts) expect(c).toBeLessThan(11000)
  })
  it('float is in [0,1)', () => {
    for (let i = 0; i < 1000; i++) {
      const f = cryptoRng.float()
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
    }
  })
  it('rejects invalid ranges', () => {
    expect(() => cryptoRng.int(0)).toThrow()
    expect(() => cryptoRng.int(1.5)).toThrow()
  })
})

describe('roundResult', () => {
  const int = (rounding: 'up' | 'down') => ({ mode: 'integer' as const, rounding, decimals: 2 })
  const dec = (decimals: number) => ({ mode: 'decimal' as const, rounding: 'down' as const, decimals })
  it('integer up/down', () => {
    expect(roundResult(2.1, int('up'))).toBe(3)
    expect(roundResult(2.9, int('down'))).toBe(2)
    expect(roundResult(-2.1, int('down'))).toBe(-3)
  })
  it('decimals and float noise', () => {
    expect(roundResult(0.1 + 0.2, dec(2))).toBe(0.3)
    expect(roundResult(1.005, dec(2))).toBe(1.01)
    expect(roundResult(10 / 3, dec(1))).toBe(3.3)
  })
  it('never returns -0', () => {
    expect(Object.is(roundResult(-0.2, int('up')), 0)).toBe(true)
  })
})

describe('applyOperation', () => {
  it('works for each operation', () => {
    expect(applyOperation('sum', [1, 2, 3])).toEqual({ ok: true, value: 6 })
    expect(applyOperation('subtract', [10, 3, 2])).toEqual({ ok: true, value: 5 })
    expect(applyOperation('multiply', [2, 3, 4])).toEqual({ ok: true, value: 24 })
    expect(applyOperation('divide', [20, 2, 5])).toEqual({ ok: true, value: 2 })
    expect(applyOperation('max', [1, 9, 3])).toEqual({ ok: true, value: 9 })
    expect(applyOperation('min', [4, 2, 8])).toEqual({ ok: true, value: 2 })
    expect(applyOperation('average', [2, 4, 6])).toEqual({ ok: true, value: 4 })
  })
  it('handles empty and division by zero', () => {
    expect(applyOperation('sum', [])).toEqual({ ok: false, error: 'noValues' })
    expect(applyOperation('divide', [5, 0])).toEqual({ ok: false, error: 'divisionByZero' })
  })
  it('a single value is returned as is', () => {
    for (const op of ['sum', 'subtract', 'multiply', 'divide', 'max', 'min', 'average'] as const) {
      expect(applyOperation(op, [7])).toEqual({ ok: true, value: 7 })
    }
  })
})

describe('computeHighlights', () => {
  const hl = (o: Record<string, unknown> = {}) => dice({ highlights: o }).highlights
  it('critical and fumble default to group max / min', () => {
    const flags = computeHighlights(
      [{ value: 20, groupMin: 1, groupMax: 20 }, { value: 1, groupMin: 1, groupMax: 20 }, { value: 10, groupMin: 1, groupMax: 20 }],
      hl({ critical: { enabled: true }, fumble: { enabled: true } }),
    )
    expect(flags.map((f) => [f.isCritical, f.isFumble])).toEqual([[true, false], [false, true], [false, false]])
  })
  it('winner highest with ties marks all tied dice', () => {
    const d = [5, 9, 9].map((value) => ({ value, groupMin: 1, groupMax: 10 }))
    const flags = computeHighlights(d, hl({ winner: { enabled: true, mode: 'highest' } }))
    expect(flags.map((f) => f.isWinner)).toEqual([false, true, true])
  })
  it('winner lowest', () => {
    const d = [5, 2, 9].map((value) => ({ value, groupMin: 1, groupMax: 10 }))
    const flags = computeHighlights(d, hl({ winner: { enabled: true, mode: 'lowest' } }))
    expect(flags.map((f) => f.isWinner)).toEqual([false, true, false])
  })
  it('winner success uses the difficulty', () => {
    const d = [3, 5, 8].map((value) => ({ value, groupMin: 1, groupMax: 10 }))
    const flags = computeHighlights(d, hl({ difficulty: 5, winner: { enabled: true, mode: 'success' } }))
    expect(flags.map((f) => f.isWinner)).toEqual([false, true, true])
  })
  it('text-only dice are never highlighted', () => {
    const flags = computeHighlights([{ value: undefined, groupMin: null, groupMax: null }], hl({ critical: { enabled: true }, winner: { enabled: true, mode: 'highest' } }))
    expect(flags[0]).toEqual({ isCritical: false, isFumble: false, isWinner: false })
  })
})

describe('rollDice', () => {
  it('picks faces from the rng and sums them', () => {
    const el = dice({ groups: [makeGroup(6, 3)] })
    const out = rollDice(el, { rng: fixedRng([0, 1, 2]), now: NOW })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.roll.results.map((r) => r.value)).toEqual([1, 2, 3])
    expect(out.roll.total).toBe(6)
    expect(out.roll.at).toBe(NOW.toISOString())
  })
  it('does not mutate the original element', () => {
    const el = dice()
    const copy = structuredClone(el)
    rollDice(el, { rng: fixedRng([3]) })
    expect(el).toEqual(copy)
  })
  it('the updated element is valid and holds lastRoll', () => {
    const out = rollDice(dice(), { rng: fixedRng([4]) })
    if (!out.ok) throw new Error('expected ok')
    expect(() => elementSchema.parse(out.element)).not.toThrow()
    expect(out.element.lastRoll).toEqual(out.roll)
  })
  it('adds modifiers after the operation', () => {
    const el = dice({ groups: [makeGroup(6, 2)], modifiers: [{ id: crypto.randomUUID(), label: 'Bonus', value: 3 }] })
    const out = rollDice(el, { rng: fixedRng([5, 5]) })
    if (!out.ok) throw new Error()
    expect(out.roll.raw).toBe(12)
    expect(out.roll.total).toBe(15)
  })
  it('applies the operation (multiply)', () => {
    const el = dice({ groups: [makeGroup(6, 2)], operation: 'multiply' })
    const out = rollDice(el, { rng: fixedRng([1, 2]) })
    if (!out.ok) throw new Error()
    expect(out.roll.total).toBe(6)
  })
  it('division by zero gives null total and an error', () => {
    const g = { id: crypto.randomUUID(), count: 2, faces: [{ id: crypto.randomUUID(), label: '0', value: 0 }] }
    const out = rollDice(dice({ groups: [g], operation: 'divide' }), { rng: fixedRng([0]) })
    if (!out.ok) throw new Error()
    expect(out.roll.total).toBeNull()
    expect(out.roll.error).toBe('divisionByZero')
  })
  it('text-only faces give a null total', () => {
    const g = { id: crypto.randomUUID(), count: 1, faces: [{ id: crypto.randomUUID(), label: 'Heads' }] }
    const out = rollDice(dice({ groups: [g] }), { rng: fixedRng([0]) })
    if (!out.ok) throw new Error()
    expect(out.roll.total).toBeNull()
    expect(out.roll.results[0]?.label).toBe('Heads')
    expect(out.roll.difficultyMet).toBeNull()
  })
  it('difficultyMet compares total with difficulty', () => {
    const el = dice({ highlights: { difficulty: 10 } })
    const hit = rollDice(el, { rng: fixedRng([9]) })
    const miss = rollDice(el, { rng: fixedRng([8]) })
    if (!hit.ok || !miss.ok) throw new Error()
    expect(hit.roll.difficultyMet).toBe(true)
    expect(miss.roll.difficultyMet).toBe(false)
  })
  it('marks critical and fumble on a d20', () => {
    const el = createStandardDie(20)
    const crit = rollDice(el, { rng: fixedRng([19]) })
    const fumble = rollDice(el, { rng: fixedRng([0]) })
    if (!crit.ok || !fumble.ok) throw new Error()
    expect(crit.roll.results[0]?.isCritical).toBe(true)
    expect(fumble.roll.results[0]?.isFumble).toBe(true)
  })
  it('refuses disabled elements', () => {
    expect(rollDice(dice({ enabled: false }))).toEqual({ ok: false, reason: 'disabled' })
  })
  it('rounds decimals once at the end', () => {
    const faces = [{ id: crypto.randomUUID(), label: '0.1', value: 0.1 }, { id: crypto.randomUUID(), label: '0.2', value: 0.2 }]
    const el = dice({ groups: [{ id: crypto.randomUUID(), count: 2, faces }], numberFormat: { mode: 'decimal', decimals: 2 } })
    const out = rollDice(el, { rng: fixedRng([0, 1]) })
    if (!out.ok) throw new Error()
    expect(out.roll.total).toBe(0.3)
  })
  it('results are always within the faces over many rolls', () => {
    const rng = seededRng(42)
    const el = createStandardDie(6)
    for (let i = 0; i < 500; i++) {
      const out = rollDice(el, { rng })
      if (!out.ok) throw new Error()
      expect(out.roll.total).toBeGreaterThanOrEqual(1)
      expect(out.roll.total).toBeLessThanOrEqual(6)
    }
  })
})

describe('exclusion', () => {
  const bag = () => dice({ groups: [makeGroup(3, 1)], exclusion: { enabled: true } })
  it('never repeats a face until reset and then refuses', () => {
    let el = bag()
    const seen = new Set<string>()
    for (let i = 0; i < 3; i++) {
      const out = rollDice(el, { rng: seededRng(i + 1) })
      if (!out.ok) throw new Error('expected ok')
      seen.add(out.roll.results[0]!.faceId)
      el = out.element
      expect(out.exhaustedAfter).toBe(i === 2)
    }
    expect(seen.size).toBe(3)
    expect(rollDice(el)).toEqual({ ok: false, reason: 'exhausted' })
    expect(exclusionStatus(el)).toEqual({ enabled: true, remaining: 0, exhausted: true })
    const again = resetExclusion(el)
    expect(exclusionStatus(again).remaining).toBe(3)
    expect(rollDice(again, { rng: fixedRng([0]) }).ok).toBe(true)
  })
  it('several dice in one group draw different faces', () => {
    const el = dice({ groups: [makeGroup(4, 4)], exclusion: { enabled: true } })
    const out = rollDice(el, { rng: seededRng(7) })
    if (!out.ok) throw new Error()
    expect(out.roll.results.map((r) => r.value).sort()).toEqual([1, 2, 3, 4])
    expect(out.exhaustedAfter).toBe(true)
  })
  it('is exhausted if a group has fewer faces than dice', () => {
    const el = dice({ groups: [makeGroup(2, 3)], exclusion: { enabled: true } })
    expect(rollDice(el)).toEqual({ ok: false, reason: 'exhausted' })
  })
  it('off by default: status reports nothing', () => {
    expect(exclusionStatus(dice())).toEqual({ enabled: false, remaining: null, exhausted: false })
  })
})

describe('wheel', () => {
  const wheel = (o: Record<string, unknown> = {}) => wheelElementSchema.parse(makeWheel(o))
  it('picks by weight', () => {
    const w = wheel({
      sectors: [
        { id: crypto.randomUUID(), label: 'A', weight: 1 },
        { id: crypto.randomUUID(), label: 'B', weight: 3 },
      ],
    })
    const pick = (f: number) => {
      const o = spinWheel(w, { rng: fixedRng([0], [f]) })
      if (!o.ok) throw new Error()
      return o.result.label
    }
    expect(pick(0)).toBe('A')
    expect(pick(0.24)).toBe('A')
    expect(pick(0.26)).toBe('B')
    expect(pick(0.999)).toBe('B')
  })
  it('weights are respected statistically', () => {
    const w = wheel({
      sectors: [
        { id: crypto.randomUUID(), label: 'A', weight: 1 },
        { id: crypto.randomUUID(), label: 'B', weight: 3 },
      ],
    })
    const rng = seededRng(5)
    let b = 0
    for (let i = 0; i < 4000; i++) {
      const o = spinWheel(w, { rng })
      if (o.ok && o.result.label === 'B') b++
    }
    expect(b / 4000).toBeGreaterThan(0.71)
    expect(b / 4000).toBeLessThan(0.79)
  })
  it('noRepeat uses every sector once, then refuses; reset restores', () => {
    let w = wheel({ noRepeat: true })
    const labels: string[] = []
    for (let i = 0; i < 2; i++) {
      const o = spinWheel(w, { rng: seededRng(i + 3) })
      if (!o.ok) throw new Error()
      labels.push(o.result.label)
      w = o.element
    }
    expect(labels.sort()).toEqual(['Ana', 'Luis'])
    expect(spinWheel(w)).toEqual({ ok: false, reason: 'exhausted' })
    expect(wheelStatus(w).exhausted).toBe(true)
    expect(wheelStatus(resetWheel(w)).remaining).toBe(2)
  })
  it('refuses when disabled; does not mutate; stays valid', () => {
    expect(spinWheel(wheel({ enabled: false }))).toEqual({ ok: false, reason: 'disabled' })
    const w = wheel()
    const copy = structuredClone(w)
    const o = spinWheel(w)
    expect(w).toEqual(copy)
    if (o.ok) expect(() => elementSchema.parse(o.element)).not.toThrow()
  })
})

describe('counter', () => {
  const counter = (o: Record<string, unknown> = {}) => counterElementSchema.parse(makeCounter(o))
  it('steps up and down with multiplier', () => {
    const c = counter({ value: 10, step: 1 })
    expect(stepCounter(c, 1).value).toBe(11)
    expect(stepCounter(c, -1, 5).value).toBe(5)
  })
  it('does not go below 0 unless negatives are allowed', () => {
    expect(stepCounter(counter({ value: 0, allowNegative: false }), -1).value).toBe(0)
    expect(stepCounter(counter({ value: 0 }), -1).value).toBe(-1)
  })
  it('respects min and max', () => {
    expect(setCounterValue(counter({ value: 5, initial: 5, max: 20 }), 99).value).toBe(20)
    expect(setCounterValue(counter({ min: -5 }), -99).value).toBe(-5)
  })
  it('decimals: cleans float noise; rounds when not allowed', () => {
    const c = counter({ value: 0.1, step: 0.2, allowDecimals: true })
    expect(stepCounter(c, 1).value).toBe(0.3)
    expect(setCounterValue(counter(), 2.6).value).toBe(3)
  })
  it('never returns -0', () => {
    expect(Object.is(setCounterValue(counter(), -0).value, 0)).toBe(true)
  })
  it('reset and alerts', () => {
    const c = counter({ value: 3, initial: 40, alerts: [{ id: crypto.randomUUID(), value: 0, label: 'Dead' }] })
    expect(resetCounter(c).value).toBe(40)
    expect(reachedAlerts(setCounterValue(c, 0))).toHaveLength(1)
    expect(reachedAlerts(c)).toHaveLength(0)
  })
})

describe('timer', () => {
  const t0 = Date.parse('2026-11-19T20:00:00.000Z')
  const timer = (o: Record<string, unknown> = {}) => timerElementSchema.parse(makeTimer(o))
  it('countdown runs, pauses and resumes', () => {
    let t = startTimer(timer(), t0)
    expect(timerDisplayMs(t, t0 + 10_000)).toBe(50_000)
    t = pauseTimer(t, t0 + 10_000)
    expect(t.status).toBe('paused')
    expect(timerDisplayMs(t, t0 + 99_000)).toBe(50_000)
    t = startTimer(t, t0 + 100_000)
    expect(timerDisplayMs(t, t0 + 105_000)).toBe(45_000)
  })
  it('countdown finishes on tick', () => {
    const t = startTimer(timer({ durationSeconds: 5 }), t0)
    expect(tickTimer(t, t0 + 4_000).status).toBe('running')
    const done = tickTimer(t, t0 + 5_000)
    expect(done.status).toBe('finished')
    expect(timerDisplayMs(done, t0 + 99_000)).toBe(0)
  })
  it('stopwatch counts up and never finishes', () => {
    const t = startTimer(timer({ mode: 'stopwatch', durationSeconds: undefined }), t0)
    expect(timerDisplayMs(t, t0 + 7_000)).toBe(7_000)
    expect(tickTimer(t, t0 + 9_999_999).status).toBe('running')
  })
  it('reset goes back to idle', () => {
    const t = resetTimer(pauseTimer(startTimer(timer(), t0), t0 + 1000))
    expect(t).toMatchObject({ status: 'idle', elapsedMs: 0, startedAt: null })
  })
})

describe('standard dice factories', () => {
  it('produce valid elements', () => {
    for (const s of [4, 6, 8, 10, 12, 20, 100]) {
      const d = createStandardDie(s)
      expect(() => elementSchema.parse(d)).not.toThrow()
      expect(d.groups[0]?.faces).toHaveLength(s)
    }
    expect(createFudgeDie().groups[0]?.faces).toHaveLength(6)
  })
  it('fudge die total is between -1 and 1', () => {
    const rng = seededRng(11)
    for (let i = 0; i < 100; i++) {
      const o = rollDice(createFudgeDie(), { rng })
      if (!o.ok) throw new Error()
      expect([-1, 0, 1]).toContain(o.roll.total)
    }
  })
})

describe('rollAll', () => {
  it('rolls enabled dice and wheels, skips the rest, keeps order', () => {
    const a = dice({ name: 'A' })
    const b = dice({ name: 'B', enabled: false })
    const w = wheelElementSchema.parse(makeWheel())
    const c = counterElementSchema.parse(makeCounter())
    const ex = dice({ name: 'Ex', groups: [makeGroup(2, 3)], exclusion: { enabled: true } })
    const res = rollAll([a, b, w, c, ex], { rng: fixedRng([0]) })
    expect(res.elements.map((e) => e.id)).toEqual([a.id, b.id, w.id, c.id, ex.id])
    expect(res.rolled.map((r) => r.elementId)).toEqual([a.id, w.id])
    expect(res.skipped).toEqual([
      { elementId: b.id, reason: 'disabled' },
      { elementId: ex.id, reason: 'exhausted' },
    ])
    expect(res.elements[3]).toBe(c)
  })
})
