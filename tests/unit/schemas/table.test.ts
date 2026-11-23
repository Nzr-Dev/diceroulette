import { describe, expect, it } from 'vitest'
import { LIMITS, elementSchema, parseTable, tableSchema } from '../../../shared/schemas'
import { makeCounter, makeDice, makeGroup, makeTable, makeTimer, makeWheel, uuid } from './helpers'

describe('table', () => {
  it('accepts an empty table and fills in the defaults', () => {
    const result = tableSchema.parse(makeTable())
    expect(result.isQuick).toBe(false)
    expect(result.deletedAt).toBeNull()
    expect(result.elements).toEqual([])
  })

  it('accepts a table with the four element types', () => {
    const table = makeTable({ elements: [makeDice(), makeWheel(), makeCounter(), makeTimer()] })
    expect(parseTable(table).success).toBe(true)
  })

  it('rejects a wrong schemaVersion', () => {
    expect(parseTable(makeTable({ schemaVersion: 99 })).success).toBe(false)
  })

  it('rejects an id that is not a UUID', () => {
    expect(parseTable(makeTable({ id: 'abc' })).success).toBe(false)
  })

  it('rejects a name that is empty or too long', () => {
    expect(parseTable(makeTable({ name: '   ' })).success).toBe(false)
    expect(parseTable(makeTable({ name: 'x'.repeat(LIMITS.maxNameLength + 1) })).success).toBe(false)
  })

  it('rejects duplicated element ids', () => {
    const dice = makeDice()
    expect(parseTable(makeTable({ elements: [dice, { ...dice, name: 'Copy' }] })).success).toBe(false)
  })

  it('rejects more elements than the limit', () => {
    const elements = Array.from({ length: LIMITS.maxElementsPerTable + 1 }, () => makeCounter())
    expect(parseTable(makeTable({ elements })).success).toBe(false)
  })

  it('drops unknown fields', () => {
    const result = parseTable(makeTable({ hacked: true, elements: [makeCounter({ evil: '<script>' })] }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('hacked')
      expect(result.data.elements[0]).not.toHaveProperty('evil')
    }
  })

  it('rejects a table bigger than the size limit', () => {
    // Many valid dice with the biggest allowed labels go past 1 MB.
    const bigFaces = Array.from({ length: 200 }, (_, i) => ({ id: uuid(), label: 'x'.repeat(100), value: i }))
    const elements = Array.from({ length: 60 }, () => makeDice({ groups: [{ id: uuid(), count: 1, faces: bigFaces }] }))
    const result = parseTable(makeTable({ elements }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('too big')
  })

  it('returns a readable error', () => {
    const result = parseTable(makeTable({ name: '' }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('name')
  })

  it('survives a JSON round trip', () => {
    const table = makeTable({ elements: [makeDice(), makeWheel(), makeCounter(), makeTimer()] })
    const parsed = tableSchema.parse(table)
    expect(tableSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed)
  })
})

describe('dice element', () => {
  it('fills in the defaults', () => {
    const dice = elementSchema.parse(makeDice())
    if (dice.type !== 'dice') throw new Error('expected a dice element')
    expect(dice.enabled).toBe(true)
    expect(dice.operation).toBe('sum')
    expect(dice.modifiers).toEqual([])
    expect(dice.numberFormat).toEqual({ mode: 'integer', rounding: 'down', decimals: 2 })
    expect(dice.highlights.winner).toEqual({ enabled: false, mode: 'highest' })
    expect(dice.highlights.critical).toEqual({ enabled: false })
    expect(dice.exclusion).toEqual({ enabled: false, usedFaceIds: [] })
    expect(dice.appearance).toEqual({ shape: 'square', borderWidth: 2 })
  })

  it('accepts a mix of groups like 1d20 + 2d6', () => {
    const dice = makeDice({ groups: [makeGroup(20), makeGroup(6, 2)], modifiers: [{ id: uuid(), label: 'Bonus', value: 3 }] })
    expect(elementSchema.safeParse(dice).success).toBe(true)
  })

  it('accepts a face without a numeric value', () => {
    const group = { id: uuid(), count: 1, faces: [{ id: uuid(), label: 'Sword', emoji: '⚔️' }] }
    expect(elementSchema.safeParse(makeDice({ groups: [group] })).success).toBe(true)
  })

  it('rejects a die without faces, with too many faces or with too many dice', () => {
    expect(elementSchema.safeParse(makeDice({ groups: [{ id: uuid(), count: 1, faces: [] }] })).success).toBe(false)
    expect(elementSchema.safeParse(makeDice({ groups: [makeGroup(LIMITS.maxFacesPerDie + 1)] })).success).toBe(false)
    expect(elementSchema.safeParse(makeDice({ groups: [makeGroup(6, LIMITS.maxDicePerGroup + 1)] })).success).toBe(false)
    expect(elementSchema.safeParse(makeDice({ groups: [makeGroup(6, 0)] })).success).toBe(false)
  })

  it('accepts the maximum sizes', () => {
    const group = makeGroup(LIMITS.maxFacesPerDie, LIMITS.maxDicePerGroup)
    expect(elementSchema.safeParse(makeDice({ groups: [group] })).success).toBe(true)
  })

  it('rejects colors that are not #RRGGBB', () => {
    const group = { id: uuid(), count: 1, faces: [{ id: uuid(), label: '1', color: 'red; background:url(x)' }] }
    expect(elementSchema.safeParse(makeDice({ groups: [group] })).success).toBe(false)
    expect(elementSchema.safeParse(makeDice({ appearance: { color: '#zzzzzz' } })).success).toBe(false)
  })

  it('rejects shapes that are not in the list (no raw SVG)', () => {
    expect(elementSchema.safeParse(makeDice({ appearance: { shape: '<svg onload=alert(1)>' } })).success).toBe(false)
  })

  it('accepts 1 to 4 decimals and rejects other values', () => {
    expect(elementSchema.safeParse(makeDice({ numberFormat: { mode: 'decimal', decimals: 4 } })).success).toBe(true)
    expect(elementSchema.safeParse(makeDice({ numberFormat: { mode: 'decimal', decimals: 5 } })).success).toBe(false)
    expect(elementSchema.safeParse(makeDice({ numberFormat: { mode: 'decimal', decimals: 0 } })).success).toBe(false)
  })

  it('accepts rounding up and down only', () => {
    expect(elementSchema.safeParse(makeDice({ numberFormat: { rounding: 'up' } })).success).toBe(true)
    expect(elementSchema.safeParse(makeDice({ numberFormat: { rounding: 'nearest' } })).success).toBe(false)
  })

  it('rejects an unknown operation', () => {
    expect(elementSchema.safeParse(makeDice({ operation: 'power' })).success).toBe(false)
  })
})

describe('wheel element', () => {
  it('fills in the defaults', () => {
    const wheel = elementSchema.parse(makeWheel())
    if (wheel.type !== 'wheel') throw new Error('expected a wheel')
    expect(wheel.noRepeat).toBe(false)
    expect(wheel.usedSectorIds).toEqual([])
    expect(wheel.sectors[0]?.weight).toBe(1)
  })

  it('rejects a wheel without sectors or with too many', () => {
    expect(elementSchema.safeParse(makeWheel({ sectors: [] })).success).toBe(false)
    const tooMany = Array.from({ length: LIMITS.maxSectorsPerWheel + 1 }, () => ({ id: uuid(), label: 'x' }))
    expect(elementSchema.safeParse(makeWheel({ sectors: tooMany })).success).toBe(false)
  })

  it('rejects weights that are zero or negative', () => {
    expect(elementSchema.safeParse(makeWheel({ sectors: [{ id: uuid(), label: 'A', weight: 0 }] })).success).toBe(false)
    expect(elementSchema.safeParse(makeWheel({ sectors: [{ id: uuid(), label: 'A', weight: -1 }] })).success).toBe(false)
  })
})

describe('counter element', () => {
  it('fills in the defaults', () => {
    const counter = elementSchema.parse(makeCounter())
    if (counter.type !== 'counter') throw new Error('expected a counter')
    expect(counter).toMatchObject({ min: null, max: null, step: 1, allowNegative: true, allowDecimals: false, rotation: 0 })
  })

  it('accepts negative numbers and decimals when allowed', () => {
    expect(elementSchema.safeParse(makeCounter({ value: -2.5, allowDecimals: true })).success).toBe(true)
  })

  it('rejects a negative value when negatives are not allowed', () => {
    expect(elementSchema.safeParse(makeCounter({ value: -1, allowNegative: false })).success).toBe(false)
  })

  it('rejects a decimal value when decimals are not allowed', () => {
    expect(elementSchema.safeParse(makeCounter({ value: 1.5 })).success).toBe(false)
  })

  it('rejects a value outside min and max, and min greater than max', () => {
    expect(elementSchema.safeParse(makeCounter({ value: 5, min: 10 })).success).toBe(false)
    expect(elementSchema.safeParse(makeCounter({ value: 50, max: 10 })).success).toBe(false)
    expect(elementSchema.safeParse(makeCounter({ value: 5, min: 10, max: 1 })).success).toBe(false)
  })

  it('only accepts rotation 0 or 180', () => {
    expect(elementSchema.safeParse(makeCounter({ rotation: 180 })).success).toBe(true)
    expect(elementSchema.safeParse(makeCounter({ rotation: 90 })).success).toBe(false)
  })

  it('rejects a step that is zero or negative', () => {
    expect(elementSchema.safeParse(makeCounter({ step: 0 })).success).toBe(false)
  })
})

describe('timer element', () => {
  it('accepts a countdown with a duration and a stopwatch without one', () => {
    expect(elementSchema.safeParse(makeTimer()).success).toBe(true)
    expect(elementSchema.safeParse(makeTimer({ mode: 'stopwatch', durationSeconds: undefined })).success).toBe(true)
  })

  it('rejects a countdown without a duration', () => {
    expect(elementSchema.safeParse(makeTimer({ durationSeconds: undefined })).success).toBe(false)
  })

  it('rejects a duration over 24 hours', () => {
    expect(elementSchema.safeParse(makeTimer({ durationSeconds: LIMITS.maxTimerSeconds + 1 })).success).toBe(false)
  })

  it('rejects a running timer without startedAt', () => {
    expect(elementSchema.safeParse(makeTimer({ status: 'running' })).success).toBe(false)
    expect(
      elementSchema.safeParse(makeTimer({ status: 'running', startedAt: '2026-11-19T20:00:00.000Z' })).success,
    ).toBe(true)
  })
})

describe('element', () => {
  it('rejects an unknown type', () => {
    expect(elementSchema.safeParse({ id: uuid(), type: 'cards', name: 'Deck' }).success).toBe(false)
  })

  it('can be disabled', () => {
    const counter = elementSchema.parse(makeCounter({ enabled: false }))
    expect(counter.enabled).toBe(false)
  })
})
