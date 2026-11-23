import type { Element, GameTable } from '../schemas'
import { LIMITS } from '../schemas'

type NewId = () => string

const defaultNewId: NewId = () => globalThis.crypto.randomUUID()

/** Gives every `id` in the value (at any depth) a new identifier. Other fields are untouched. */
function withNewIds<T>(value: T, newId: NewId): T {
  if (Array.isArray(value)) return value.map((item) => withNewIds(item, newId)) as T
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value)) {
      out[key] = key === 'id' && typeof inner === 'string' ? newId() : withNewIds(inner, newId)
    }
    return out as T
  }
  return value
}

/**
 * Element without any play state: no last result, nothing excluded, counter at its
 * initial value, timer stopped. A copied element always arrives clean.
 */
export function cleanElement(element: Element): Element {
  switch (element.type) {
    case 'dice': {
      const { lastRoll: _lastRoll, ...rest } = element
      return { ...rest, exclusion: { ...element.exclusion, usedFaceIds: [] } }
    }
    case 'wheel': {
      const { lastResult: _lastResult, ...rest } = element
      return { ...rest, usedSectorIds: [] }
    }
    case 'counter':
      return { ...element, value: element.initial }
    case 'timer':
      return { ...element, status: 'idle', elapsedMs: 0, startedAt: null }
  }
}

/** Copy of an element: clean, with new ids, so it can go into any table. */
export function copyElement(element: Element, newId: NewId = defaultNewId): Element {
  return withNewIds(cleanElement(element), newId)
}

/**
 * Copy of a whole table (duplicate, or import of a shared one): new ids, clean elements,
 * not the quick table, not deleted. The name is passed in because the "copy" label is translated.
 */
export function copyTable(
  table: GameTable,
  options: { name?: string; newId?: NewId; now?: Date } = {},
): GameTable {
  const newId = options.newId ?? defaultNewId
  const now = (options.now ?? new Date()).toISOString()
  return {
    ...table,
    id: newId(),
    name: (options.name ?? table.name).slice(0, LIMITS.maxNameLength),
    isQuick: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    elements: table.elements.map((element) => copyElement(element, newId)),
  }
}
