import { LIMITS, elementSchema, type DiceElement, type Element, type Face } from '../schemas'

type NewId = () => string
const defaultNewId: NewId = () => globalThis.crypto.randomUUID()

/** Faces numbered 1..sides, each with label and value. */
export function numberedFaces(sides: number, newId: NewId = defaultNewId): Face[] {
  const count = Math.min(Math.max(Math.floor(sides), 1), LIMITS.maxFacesPerDie)
  return Array.from({ length: count }, (_, i) => ({ id: newId(), label: String(i + 1), value: i + 1 }))
}

/** Adds a group of `count` dice with `sides` numbered faces. Does nothing past the group limit. */
export function addGroup(element: DiceElement, sides = 6, count = 1, newId: NewId = defaultNewId): DiceElement {
  if (element.groups.length >= LIMITS.maxGroupsPerElement) return element
  return { ...element, groups: [...element.groups, { id: newId(), count, faces: numberedFaces(sides, newId) }] }
}

/** Removes a group. An element always keeps at least one. */
export function removeGroup(element: DiceElement, groupId: string): DiceElement {
  if (element.groups.length <= 1) return element
  return { ...element, groups: element.groups.filter((g) => g.id !== groupId) }
}

/**
 * Cleans an edited element: forgets used faces that no longer exist (otherwise the exclusion
 * list would hold ghosts), and drops a highlight value that is empty.
 */
export function sanitizeDice(element: DiceElement): DiceElement {
  const existing = new Set(element.groups.flatMap((g) => g.faces.map((f) => f.id)))
  return {
    ...element,
    exclusion: { ...element.exclusion, usedFaceIds: element.exclusion.usedFaceIds.filter((id) => existing.has(id)) },
  }
}

const SYMBOLS = { sum: ' + ', subtract: ' − ', multiply: ' × ', divide: ' ÷ ' } as const

/** Short text for the formula of a dice element, for example «1d20 + 2d6 +3» or «max(2d20)». */
export function formulaOf(element: DiceElement): string {
  const parts = element.groups.map((g) => `${g.count}d${g.faces.length}`)
  const op = element.operation
  let text: string
  if (op === 'max' || op === 'min') text = `${op}(${parts.join(', ')})`
  else if (op === 'average') text = `avg(${parts.join(', ')})`
  else text = parts.join(SYMBOLS[op])
  const bonus = element.modifiers.reduce((sum, m) => sum + m.value, 0)
  if (bonus !== 0) text += ` ${bonus > 0 ? '+' : '−'}${Math.abs(bonus)}`
  return text
}

export type ValidateResult = { ok: true; element: Element } | { ok: false; errors: string[] }

/** Validates an edited element with the same schema the database and the import use. */
export function validateElement(input: unknown): ValidateResult {
  const parsed = elementSchema.safeParse(input)
  if (parsed.success) return { ok: true, element: parsed.data }
  const errors = parsed.error.issues.slice(0, 5).map((issue) => {
    const path = issue.path.filter((p) => typeof p === 'string').join(' › ')
    return path ? `${path}: ${issue.message}` : issue.message
  })
  return { ok: false, errors }
}

