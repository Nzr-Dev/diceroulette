import {
  LIMITS,
  type CounterElement, type Element, type Sector, type TimerElement, type WheelElement,
} from '../schemas'
import { resetTimer, setCounterValue } from '../engine'
import { sanitizeDice } from './dice'

type NewId = () => string
const defaultNewId: NewId = () => globalThis.crypto.randomUUID()

/** One sector per non-empty line. Extra lines past the limit are ignored. */
export function sectorsFromLines(text: string, max: number = LIMITS.maxSectorsPerWheel, newId: NewId = defaultNewId): Sector[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().slice(0, LIMITS.maxNameLength))
    .filter((line) => line.length > 0)
    .slice(0, Math.max(max, 0))
    .map((label) => ({ id: newId(), label, weight: 1 }))
}

/** Appends sectors without going past the wheel limit. */
export function addSectors(wheel: WheelElement, sectors: Sector[]): WheelElement {
  const room = LIMITS.maxSectorsPerWheel - wheel.sectors.length
  return { ...wheel, sectors: [...wheel.sectors, ...sectors.slice(0, Math.max(room, 0))] }
}

/** Splits seconds into minutes and seconds for the two input boxes, and back. */
export function splitDuration(totalSeconds: number): { minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(totalSeconds))
  return { minutes: Math.floor(total / 60), seconds: total % 60 }
}

export function joinDuration(minutes: number, seconds: number): number {
  const total = Math.floor(Math.max(minutes, 0)) * 60 + Math.floor(Math.max(seconds, 0))
  return Math.min(total, LIMITS.maxTimerSeconds)
}

function sanitizeWheel(wheel: WheelElement): WheelElement {
  const existing = new Set(wheel.sectors.map((s) => s.id))
  return { ...wheel, usedSectorIds: wheel.usedSectorIds.filter((id) => existing.has(id)) }
}

/** After changing the limits, the current and the initial value are brought inside them. */
function sanitizeCounter(counter: CounterElement): CounterElement {
  const initial = setCounterValue({ ...counter, value: counter.initial }, counter.initial).value
  return setCounterValue({ ...counter, initial }, counter.value)
}

/** Changing the mode or the time restarts the timer: an old run makes no sense with a new duration. */
function sanitizeTimer(timer: TimerElement, original?: Element): TimerElement {
  if (original?.type === 'timer' && (original.mode !== timer.mode || original.durationSeconds !== timer.durationSeconds)) {
    return resetTimer(timer)
  }
  return timer
}

/** Cleans an edited element of any type before it is validated and saved. */
export function sanitizeElement(draft: Element, original?: Element): Element {
  switch (draft.type) {
    case 'dice': return sanitizeDice(draft)
    case 'wheel': return sanitizeWheel(draft)
    case 'counter': return sanitizeCounter(draft)
    case 'timer': return sanitizeTimer(draft, original)
  }
}
