import { describe, expect, it } from 'vitest'
import { addGroup, formulaOf, numberedFaces, removeGroup, sanitizeDice, validateElement } from '../../../shared/editor'
import { createStandardDie } from '../../../shared/engine'
import { LIMITS } from '../../../shared/schemas'

describe('formulaOf', () => {
  it('shows groups and modifiers', () => {
    let d = createStandardDie(20)
    expect(formulaOf(d)).toBe('1d20')
    d = addGroup(d, 6, 2)
    expect(formulaOf(d)).toBe('1d20 + 2d6')
    d = { ...d, modifiers: [{ id: crypto.randomUUID(), label: '', value: 3 }, { id: crypto.randomUUID(), label: '', value: -1 }] }
    expect(formulaOf(d)).toBe('1d20 + 2d6 +2')
    expect(formulaOf({ ...d, operation: 'max', modifiers: [] })).toBe('max(1d20, 2d6)')
    expect(formulaOf({ ...d, operation: 'subtract', modifiers: [{ id: crypto.randomUUID(), label: '', value: -4 }] })).toBe('1d20 − 2d6 −4')
  })
})

describe('groups and faces', () => {
  it('numberedFaces is clamped to the limits', () => {
    expect(numberedFaces(0)).toHaveLength(1)
    expect(numberedFaces(5000)).toHaveLength(LIMITS.maxFacesPerDie)
    expect(numberedFaces(3).map((f) => f.value)).toEqual([1, 2, 3])
  })
  it('addGroup and removeGroup respect the limits', () => {
    let d = createStandardDie(6)
    for (let i = 0; i < 30; i++) d = addGroup(d)
    expect(d.groups).toHaveLength(LIMITS.maxGroupsPerElement)
    for (const g of [...d.groups]) d = removeGroup(d, g.id)
    expect(d.groups).toHaveLength(1)
  })
})

describe('sanitizeDice', () => {
  it('forgets used faces that no longer exist', () => {
    const d = createStandardDie(6)
    const keep = d.groups[0]!.faces[0]!.id
    const edited = { ...d, exclusion: { enabled: true, usedFaceIds: [keep, crypto.randomUUID()] } }
    expect(sanitizeDice(edited).exclusion.usedFaceIds).toEqual([keep])
  })
})

describe('validateElement', () => {
  it('accepts a valid element', () => {
    expect(validateElement(createStandardDie(6)).ok).toBe(true)
  })
  it('explains what is wrong, with a limit on the list', () => {
    const d = createStandardDie(6)
    const bad = { ...d, name: '', groups: [{ ...d.groups[0]!, count: 0 }], appearance: { ...d.appearance, color: 'red' } }
    const res = validateElement(bad)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThanOrEqual(3)
      expect(res.errors.length).toBeLessThanOrEqual(5)
      expect(res.errors.join(' ')).toContain('name')
    }
  })
})

import { addSectors, joinDuration, sanitizeElement, sectorsFromLines, splitDuration } from '../../../shared/editor'
import { createCounter, createTimer, createWheel, startTimer } from '../../../shared/engine'

describe('wheel helpers', () => {
  it('sectorsFromLines trims, skips blanks and caps length and count', () => {
    const s = sectorsFromLines('  Pizza \n\n Sushi\r\nTacos  \n   \n' + 'x'.repeat(300))
    expect(s.map((x) => x.label.length)).toEqual([5, 5, 5, 100])
    expect(s.every((x) => x.weight === 1)).toBe(true)
    expect(sectorsFromLines('a\nb\nc', 2)).toHaveLength(2)
    expect(sectorsFromLines('')).toEqual([])
  })
  it('addSectors never passes the limit', () => {
    const w = createWheel('W', ['a'])
    const many = sectorsFromLines(Array.from({ length: 600 }, (_, i) => `s${i}`).join('\n'))
    expect(addSectors(w, many).sectors).toHaveLength(LIMITS.maxSectorsPerWheel)
  })
  it('sanitize forgets used sectors that no longer exist', () => {
    const w = createWheel('W', ['a', 'b'])
    const kept = w.sectors[0]!.id
    const edited = { ...w, noRepeat: true, usedSectorIds: [kept, crypto.randomUUID()] }
    expect(sanitizeElement(edited, w)).toMatchObject({ usedSectorIds: [kept] })
  })
})

describe('counter sanitize', () => {
  it('brings value and initial inside the new limits so the editor does not fail on untouched fields', () => {
    const c = createCounter('C', 40)
    const edited = { ...c, value: 55, max: 20 }
    const out = sanitizeElement(edited, c)
    expect(out).toMatchObject({ value: 20, initial: 20 })
    expect(validateElement(out).ok).toBe(true)
  })
  it('turning off negatives or decimals fixes the value', () => {
    const c = { ...createCounter('C', 0), value: -3.5, allowNegative: false, allowDecimals: false }
    expect(sanitizeElement(c)).toMatchObject({ value: 0 })
  })
})

describe('timer helpers', () => {
  it('splits and joins durations', () => {
    expect(splitDuration(125)).toEqual({ minutes: 2, seconds: 5 })
    expect(joinDuration(2, 5)).toBe(125)
    expect(joinDuration(99999, 0)).toBe(LIMITS.maxTimerSeconds)
    expect(joinDuration(-1, -5)).toBe(0)
  })
  it('changing the duration or mode restarts a running timer; other edits do not', () => {
    const t = startTimer(createTimer('T', 60), Date.now())
    expect(t.status).toBe('running')
    expect(sanitizeElement({ ...t, durationSeconds: 90 }, t)).toMatchObject({ status: 'idle', elapsedMs: 0 })
    expect(sanitizeElement({ ...t, name: 'New name' }, t)).toMatchObject({ status: 'running' })
  })
})
