import { randomUUID } from 'node:crypto'

const NOW = '2026-11-19T20:00:00.000Z'

export const uuid = () => randomUUID()

/** A standard die with `sides` faces numbered from 1. */
export function makeGroup(sides = 6, count = 1) {
  return {
    id: uuid(),
    count,
    faces: Array.from({ length: sides }, (_, i) => ({ id: uuid(), label: String(i + 1), value: i + 1 })),
  }
}

export function makeDice(overrides: Record<string, unknown> = {}) {
  return { id: uuid(), type: 'dice', name: 'Attack', groups: [makeGroup(20)], ...overrides }
}

export function makeWheel(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    type: 'wheel',
    name: 'Who starts?',
    sectors: [
      { id: uuid(), label: 'Ana' },
      { id: uuid(), label: 'Luis' },
    ],
    ...overrides,
  }
}

export function makeCounter(overrides: Record<string, unknown> = {}) {
  return { id: uuid(), type: 'counter', name: 'Ana - life', value: 40, initial: 40, ...overrides }
}

export function makeTimer(overrides: Record<string, unknown> = {}) {
  return { id: uuid(), type: 'timer', name: 'Turn', mode: 'countdown', durationSeconds: 60, ...overrides }
}

export function makeTable(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    schemaVersion: 1,
    name: 'Test table',
    createdAt: NOW,
    updatedAt: NOW,
    elements: [],
    ...overrides,
  }
}
