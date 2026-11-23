import { diceElementSchema, type DiceElement } from '../schemas'

export const STANDARD_SIDES = [4, 6, 8, 10, 12, 20, 100] as const

type NewId = () => string

const defaultNewId: NewId = () => globalThis.crypto.randomUUID()

function buildDie(name: string, faces: { label: string; value: number }[], newId: NewId, extra = {}): DiceElement {
  return diceElementSchema.parse({
    id: newId(),
    type: 'dice',
    name,
    groups: [{ id: newId(), count: 1, faces: faces.map((face) => ({ id: newId(), ...face })) }],
    ...extra,
  })
}

/** A standard die: d4, d6, d8, d10, d12, d20, d100... with faces numbered from 1. */
export function createStandardDie(sides: number, newId: NewId = defaultNewId): DiceElement {
  const faces = Array.from({ length: sides }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
  // The d20 comes with critical (20) and fumble (1) switched on, as most role-playing games use it.
  const highlights = sides === 20 ? { critical: { enabled: true }, fumble: { enabled: true } } : {}
  return buildDie(`d${sides}`, faces, newId, { highlights })
}

/** Fate / Fudge die: two minus faces, two blank faces and two plus faces. */
export function createFudgeDie(newId: NewId = defaultNewId): DiceElement {
  const faces = [
    { label: '-', value: -1 },
    { label: '-', value: -1 },
    { label: '0', value: 0 },
    { label: '0', value: 0 },
    { label: '+', value: 1 },
    { label: '+', value: 1 },
  ]
  return buildDie('dF', faces, newId)
}
