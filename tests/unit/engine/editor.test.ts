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
