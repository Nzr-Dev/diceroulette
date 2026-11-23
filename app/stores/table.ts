import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cleanElement, copyElement } from '#shared/tables'
import {
  pauseTimer, resetCounter, resetExclusion, resetTimer, resetWheel, rollAll, rollDice, setCounterValue,
  spinWheel, startTimer, stepCounter, tickTimer,
} from '#shared/engine'
import {
  elementSchema, LIMITS, type Element, type GameTable, type HistoryEntry,
} from '#shared/schemas'
import { addHistory, clearHistory, getQuickTable, getTable, listHistory, saveTable, type HistoryRow } from '../db'
import { getDb, plain } from './context'
import { useSettingsStore } from './settings'

/** Milliseconds to wait after the last change before saving. */
export const AUTOSAVE_MS = 300
const MAX_UNDO = 20

export type Mode = 'play' | 'edit'
export type Result = { ok: true } | { ok: false; error: string }
export type PlayFailure = 'notFound' | 'disabled' | 'exhausted' | 'notRollable'

/** The table that is open: play, edit, and save by itself. */
export const useTableStore = defineStore('table', () => {
  const table = ref<GameTable | null>(null)
  const mode = ref<Mode>('play')
  const history = ref<HistoryRow[]>([])
  const saveError = ref<string | null>(null)
  const dirty = ref(false)
  /** Elements removed in this session, newest last, for «Undo». */
  const removed = ref<{ element: Element; index: number }[]>([])

  let timeout: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<void> = Promise.resolve()

  // ---------- saving ----------

  function scheduleSave(): void {
    dirty.value = true
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => void flush(), AUTOSAVE_MS)
  }

  /** Saves now, if there is anything to save. Waits for saves already running. */
  function flush(): Promise<void> {
    if (timeout) clearTimeout(timeout)
    timeout = undefined
    queue = queue.then(async () => {
      if (!dirty.value || !table.value) return
      dirty.value = false
      const result = await saveTable(getDb(), plain(table.value))
      if (result.ok) {
        saveError.value = null
        if (table.value?.id === result.table.id) table.value.updatedAt = result.table.updatedAt
      } else {
        saveError.value = result.error
        dirty.value = true
      }
    })
    return queue
  }

  // ---------- opening and closing ----------

  async function load(id: string): Promise<boolean> {
    await close()
    const found = await getTable(getDb(), id)
    if (!found) return false
    table.value = found
    history.value = await listHistory(getDb(), found.id, useSettingsStore().settings.historyLimit)
    return true
  }

  /** Opens the quick table of the home page (created the first time). */
  async function loadQuick(name: string): Promise<void> {
    await close()
    const quick = await getQuickTable(getDb(), name)
    table.value = quick
    history.value = await listHistory(getDb(), quick.id, useSettingsStore().settings.historyLimit)
  }

  async function close(): Promise<void> {
    await flush()
    table.value = null
    history.value = []
    removed.value = []
    mode.value = 'play'
    saveError.value = null
  }

  // ---------- helpers ----------

  function indexOf(id: string): number {
    return table.value?.elements.findIndex((e) => e.id === id) ?? -1
  }

  function find(id: string): Element | undefined {
    return table.value?.elements.find((e) => e.id === id)
  }

  function replace(element: Element): void {
    const index = indexOf(element.id)
    if (!table.value || index < 0) return
    table.value.elements[index] = element
    scheduleSave()
  }

  /** Applies a function to one element and stores the result. The engine only sees plain data. */
  function change(id: string, fn: (element: Element) => Element): boolean {
    const current = find(id)
    if (!current) return false
    replace(fn(plain(current)))
    return true
  }

  async function record(entry: HistoryEntry): Promise<void> {
    const limit = useSettingsStore().settings.historyLimit
    await addHistory(getDb(), entry, limit)
    if (table.value) history.value = await listHistory(getDb(), table.value.id, limit)
  }

  // ---------- table ----------

  function rename(name: string): void {
    if (!table.value) return
    table.value.name = name
    scheduleSave()
  }

  function setMode(next: Mode): void {
    mode.value = next
  }

  // ---------- elements (edit mode) ----------

  function addElement(element: unknown): Result {
    if (!table.value) return { ok: false, error: 'No table is open' }
    if (table.value.elements.length >= LIMITS.maxElementsPerTable) return { ok: false, error: 'Too many elements' }
    const parsed = elementSchema.safeParse(element)
    if (!parsed.success) return { ok: false, error: 'Invalid element' }
    if (indexOf(parsed.data.id) >= 0) return { ok: false, error: 'Duplicated element id' }
    table.value.elements.push(parsed.data)
    scheduleSave()
    return { ok: true }
  }

  /** Replaces an element with an edited version (the editor sends the whole element). */
  function updateElement(element: unknown): Result {
    const parsed = elementSchema.safeParse(element)
    if (!parsed.success) return { ok: false, error: 'Invalid element' }
    if (indexOf(parsed.data.id) < 0) return { ok: false, error: 'Element not found' }
    replace(parsed.data)
    return { ok: true }
  }

  function removeElement(id: string): boolean {
    const index = indexOf(id)
    const element = find(id)
    if (!table.value || !element) return false
    removed.value.push({ element: plain(element), index })
    if (removed.value.length > MAX_UNDO) removed.value.shift()
    table.value.elements.splice(index, 1)
    scheduleSave()
    return true
  }

  /** «Undo» of the last removed element: it goes back to its place. */
  function undoRemoveElement(): boolean {
    const last = removed.value.pop()
    if (!last || !table.value) return false
    table.value.elements.splice(Math.min(last.index, table.value.elements.length), 0, last.element)
    scheduleSave()
    return true
  }

  function moveElement(from: number, to: number): boolean {
    const list = table.value?.elements
    if (!list || from < 0 || from >= list.length || to < 0 || to >= list.length) return false
    const [item] = list.splice(from, 1)
    if (!item) return false
    list.splice(to, 0, item)
    scheduleSave()
    return true
  }

  function toggleEnabled(id: string): boolean {
    return change(id, (e) => ({ ...e, enabled: !e.enabled }))
  }

  /** Copies elements (one or several) to another table of the library, clean. */
  async function copyElementsTo(ids: string[], targetTableId: string): Promise<Result> {
    const sources = ids.flatMap((id) => {
      const element = find(id)
      return element ? [plain(element)] : []
    })
    if (sources.length === 0) return { ok: false, error: 'Nothing to copy' }
    await flush()
    const target = targetTableId === table.value?.id ? table.value : await getTable(getDb(), targetTableId)
    if (!target) return { ok: false, error: 'Table not found' }
    if (target.elements.length + sources.length > LIMITS.maxElementsPerTable) return { ok: false, error: 'Too many elements' }
    const copies = sources.map((e) => copyElement(e))
    if (target === table.value) {
      table.value.elements.push(...copies)
      scheduleSave()
      return { ok: true }
    }
    const saved = await saveTable(getDb(), { ...plain(target), elements: [...plain(target).elements, ...copies] })
    return saved.ok ? { ok: true } : { ok: false, error: saved.error }
  }

  // ---------- play ----------

  /** Rolls a dice element or spins a wheel. The history gets a line. */
  async function roll(id: string, options: { player?: string } = {}): Promise<{ ok: true } | { ok: false; reason: PlayFailure }> {
    const element = find(id)
    if (!table.value || !element) return { ok: false, reason: 'notFound' }
    const tableId = table.value.id
    const player = options.player?.trim() || undefined
    const base = { tableId, elementId: element.id, elementName: element.name, ...(player && { player }) }

    if (element.type === 'dice') {
      const outcome = rollDice(plain(element))
      if (!outcome.ok) return { ok: false, reason: outcome.reason }
      replace(outcome.element)
      await record({ ...base, kind: 'dice', at: outcome.roll.at, roll: outcome.roll })
      return { ok: true }
    }
    if (element.type === 'wheel') {
      const outcome = spinWheel(plain(element))
      if (!outcome.ok) return { ok: false, reason: outcome.reason }
      replace(outcome.element)
      await record({ ...base, kind: 'wheel', at: outcome.result.at, result: outcome.result })
      return { ok: true }
    }
    return { ok: false, reason: 'notRollable' }
  }

  /** «Roll all»: every enabled die and wheel. */
  async function rollEverything(options: { player?: string } = {}) {
    if (!table.value) return { rolled: 0, skipped: [] as { elementId: string; reason: 'disabled' | 'exhausted' }[] }
    const result = rollAll(plain(table.value.elements))
    table.value.elements = result.elements
    scheduleSave()
    const player = options.player?.trim() || undefined
    for (const entry of result.rolled) {
      const element = find(entry.elementId)
      if (!element || !table.value) continue
      const base = { tableId: table.value.id, elementId: element.id, elementName: element.name, ...(player && { player }) }
      if (entry.type === 'dice') {
        await record({ ...base, kind: 'dice', at: entry.outcome.roll.at, roll: entry.outcome.roll })
      } else {
        await record({ ...base, kind: 'wheel', at: entry.outcome.result.at, result: entry.outcome.result })
      }
    }
    return { rolled: result.rolled.length, skipped: result.skipped }
  }

  /** Puts one element back to its start: exclusion list, wheel sectors, counter value, timer. */
  function resetElement(id: string): boolean {
    return change(id, (e) => {
      switch (e.type) {
        case 'dice': return resetExclusion(e)
        case 'wheel': return resetWheel(e)
        case 'counter': return resetCounter(e)
        case 'timer': return resetTimer(e)
      }
    })
  }

  /** Restarts the whole table: every element clean, as in a new game. History is kept. */
  function resetAll(): void {
    if (!table.value) return
    table.value.elements = plain(table.value.elements).map(cleanElement)
    scheduleSave()
  }

  // ---------- counters ----------

  function step(id: string, direction: 1 | -1, multiplier = 1): boolean {
    return change(id, (e) => (e.type === 'counter' ? stepCounter(e, direction, multiplier) : e))
  }

  function setCounter(id: string, value: number): boolean {
    return change(id, (e) => (e.type === 'counter' ? setCounterValue(e, value) : e))
  }

  // ---------- timers ----------

  function start(id: string, nowMs = Date.now()): boolean {
    return change(id, (e) => (e.type === 'timer' ? startTimer(e, nowMs) : e))
  }

  function pause(id: string, nowMs = Date.now()): boolean {
    return change(id, (e) => (e.type === 'timer' ? pauseTimer(e, nowMs) : e))
  }

  /** Call on every tick of the screen. Returns the timers that just finished (to show the warning). */
  function tick(nowMs = Date.now()): string[] {
    const finished: string[] = []
    for (const element of table.value?.elements ?? []) {
      if (element.type !== 'timer' || element.status !== 'running') continue
      const next = tickTimer(plain(element), nowMs)
      if (next.status === 'finished') {
        finished.push(element.id)
        replace(next)
      }
    }
    return finished
  }

  // ---------- history ----------

  async function clearTableHistory(): Promise<void> {
    if (!table.value) return
    await clearHistory(getDb(), table.value.id)
    history.value = []
  }

  return {
    table, mode, history, saveError, dirty, removed,
    load, loadQuick, close, flush,
    rename, setMode,
    addElement, updateElement, removeElement, undoRemoveElement, moveElement, toggleEnabled, copyElementsTo,
    roll, rollEverything, resetElement, resetAll,
    step, setCounter, start, pause, tick,
    clearTableHistory,
  }
})
