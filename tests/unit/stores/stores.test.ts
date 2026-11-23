import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiceRouletteDb, getTable, listHistory } from '../../../app/db'
import { AUTOSAVE_MS, useLibraryStore, useSettingsStore, useTableStore } from '../../../app/stores'
import { setDb } from '../../../app/stores/context'
import { createStandardDie } from '../../../shared/engine'
import { counterElementSchema, timerElementSchema, wheelElementSchema } from '../../../shared/schemas'
import { makeCounter, makeTimer, makeWheel, uuid } from '../schemas/helpers'

let db: DiceRouletteDb
beforeEach(() => {
  db = new DiceRouletteDb(`test-${uuid()}`)
  setDb(db)
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.useRealTimers()
  setDb(undefined)
})

async function openNew(name = 'Game') {
  const library = useLibraryStore()
  const created = await library.create(name)
  if (!created.ok) throw new Error(created.error)
  const store = useTableStore()
  await store.load(created.table.id)
  return { store, id: created.table.id }
}

describe('settings store', () => {
  it('loads defaults and persists updates', async () => {
    const s = useSettingsStore()
    await s.load()
    expect(s.settings.theme).toBe('dark')
    await s.update({ theme: 'light', historyLimit: 5 })
    setActivePinia(createPinia())
    const again = useSettingsStore()
    await again.load()
    expect(again.settings).toMatchObject({ theme: 'light', historyLimit: 5 })
  })
})

describe('library store', () => {
  it('creates, duplicates, deletes with undo, and imports/exports', async () => {
    const lib = useLibraryStore()
    const a = await lib.create('Alpha')
    if (!a.ok) throw new Error()
    await lib.duplicate(a.table.id, 'Alpha (copy)')
    expect(lib.tables.map((t) => t.name)).toEqual(['Alpha', 'Alpha (copy)'])
    expect(await lib.remove(a.table.id)).toBe(true)
    expect(lib.tables.map((t) => t.name)).toEqual(['Alpha (copy)'])
    expect(lib.trash).toHaveLength(1)
    expect(await lib.undoRemove()).toBe(true)
    expect(lib.tables).toHaveLength(2)
    const json = await lib.exportJson(a.table.id)
    const imported = await lib.importFromText(json!)
    expect(imported.ok).toBe(true)
    expect(lib.tables).toHaveLength(3)
    expect((await lib.importFromText('nope')).ok).toBe(false)
  })
})

describe('table store: opening and saving', () => {
  it('opens the quick table and a missing table', async () => {
    const store = useTableStore()
    await store.loadQuick('Quick')
    expect(store.table?.isQuick).toBe(true)
    expect(await store.load(uuid())).toBe(false)
  })
  it('autosaves after the delay, and flush saves at once', async () => {
    const { store, id } = await openNew()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    store.rename('Renamed')
    expect(store.dirty).toBe(true)
    expect((await getTable(db, id))?.name).toBe('Game')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 10)
    await store.flush()
    expect((await getTable(db, id))?.name).toBe('Renamed')
    expect(store.dirty).toBe(false)
    store.rename('Again')
    await store.flush()
    expect((await getTable(db, id))?.name).toBe('Again')
  })
  it('close() saves pending changes', async () => {
    const { store, id } = await openNew()
    store.rename('Last')
    await store.close()
    expect((await getTable(db, id))?.name).toBe('Last')
    expect(store.table).toBeNull()
  })
  it('keeps a save error and the dirty mark when the table is invalid', async () => {
    const { store } = await openNew()
    store.rename('')
    await store.flush()
    expect(store.saveError).not.toBeNull()
    expect(store.dirty).toBe(true)
  })
})

describe('table store: elements', () => {
  it('adds, validates, rejects duplicates, updates', async () => {
    const { store } = await openNew()
    const d20 = createStandardDie(20)
    expect(store.addElement(d20)).toEqual({ ok: true })
    expect(store.addElement(d20).ok).toBe(false)
    expect(store.addElement({ type: 'dice' }).ok).toBe(false)
    expect(store.updateElement({ ...d20, name: 'Attack' }).ok).toBe(true)
    expect(store.table?.elements[0]?.name).toBe('Attack')
    expect(store.updateElement({ ...d20, id: uuid() }).ok).toBe(false)
  })
  it('removes with undo in the same place; reorders; toggles', async () => {
    const { store } = await openNew()
    const [a, b, c] = [createStandardDie(4), createStandardDie(6), createStandardDie(8)]
    for (const e of [a, b, c]) store.addElement(e)
    store.removeElement(b.id)
    expect(store.table?.elements.map((e) => e.id)).toEqual([a.id, c.id])
    expect(store.undoRemoveElement()).toBe(true)
    expect(store.table?.elements.map((e) => e.id)).toEqual([a.id, b.id, c.id])
    expect(store.undoRemoveElement()).toBe(false)
    store.moveElement(0, 2)
    expect(store.table?.elements.map((e) => e.id)).toEqual([b.id, c.id, a.id])
    expect(store.moveElement(0, 9)).toBe(false)
    store.toggleEnabled(a.id)
    expect(store.table?.elements.find((e) => e.id === a.id)?.enabled).toBe(false)
  })
  it('copies elements to another table, clean', async () => {
    const { store } = await openNew('One')
    const lib = useLibraryStore()
    const other = await lib.create('Two')
    if (!other.ok) throw new Error()
    store.addElement(counterElementSchema.parse(makeCounter({ value: 3, initial: 40 })))
    const id = store.table!.elements[0]!.id
    expect((await store.copyElementsTo([id], other.table.id)).ok).toBe(true)
    const copied = (await getTable(db, other.table.id))!.elements[0]!
    expect(copied.id).not.toBe(id)
    expect(copied.type === 'counter' && copied.value).toBe(40)
    expect((await store.copyElementsTo([uuid()], other.table.id)).ok).toBe(false)
  })
})

describe('table store: play', () => {
  it('rolls a die, stores the result, writes history and saves', async () => {
    const { store, id } = await openNew()
    const die = createStandardDie(20)
    store.addElement(die)
    const res = await store.roll(die.id, { player: ' Ana ' })
    expect(res).toEqual({ ok: true })
    const el = store.table!.elements[0]!
    expect(el.type === 'dice' && el.lastRoll?.total).toBeGreaterThanOrEqual(1)
    expect(store.history).toHaveLength(1)
    expect(store.history[0]).toMatchObject({ elementName: 'd20', player: 'Ana', kind: 'dice' })
    await store.flush()
    const saved = (await getTable(db, id))!.elements[0]!
    expect(saved.type === 'dice' && saved.lastRoll).toBeTruthy()
  })
  it('refuses disabled, exhausted, unknown and non-rollable elements', async () => {
    const { store } = await openNew()
    const die = createStandardDie(6)
    const counter = counterElementSchema.parse(makeCounter())
    store.addElement(die)
    store.addElement(counter)
    store.toggleEnabled(die.id)
    expect(await store.roll(die.id)).toEqual({ ok: false, reason: 'disabled' })
    expect(await store.roll(counter.id)).toEqual({ ok: false, reason: 'notRollable' })
    expect(await store.roll(uuid())).toEqual({ ok: false, reason: 'notFound' })
    expect(store.history).toHaveLength(0)
  })
  it('spins a wheel with no repeat until exhausted, then resets', async () => {
    const { store } = await openNew()
    const wheel = wheelElementSchema.parse(makeWheel({ noRepeat: true }))
    store.addElement(wheel)
    expect((await store.roll(wheel.id)).ok).toBe(true)
    expect((await store.roll(wheel.id)).ok).toBe(true)
    expect(await store.roll(wheel.id)).toEqual({ ok: false, reason: 'exhausted' })
    store.resetElement(wheel.id)
    expect((await store.roll(wheel.id)).ok).toBe(true)
  })
  it('history respects the limit from settings, and can be cleared', async () => {
    const settings = useSettingsStore()
    await settings.update({ historyLimit: 2 })
    const { store, id } = await openNew()
    const die = createStandardDie(6)
    store.addElement(die)
    for (let i = 0; i < 4; i++) await store.roll(die.id)
    expect(store.history).toHaveLength(2)
    expect(await listHistory(db, id)).toHaveLength(2)
    await store.clearTableHistory()
    expect(store.history).toHaveLength(0)
  })
  it('roll all skips disabled and exhausted and writes one line per roll', async () => {
    const { store } = await openNew()
    const a = createStandardDie(6)
    const b = createStandardDie(8)
    store.addElement(a)
    store.addElement(b)
    store.addElement(counterElementSchema.parse(makeCounter()))
    store.toggleEnabled(b.id)
    const res = await store.rollEverything()
    expect(res.rolled).toBe(1)
    expect(res.skipped).toEqual([{ elementId: b.id, reason: 'disabled' }])
    expect(store.history).toHaveLength(1)
  })
  it('resetAll cleans every element but keeps the history', async () => {
    const { store } = await openNew()
    const die = createStandardDie(6)
    store.addElement(die)
    store.addElement(counterElementSchema.parse(makeCounter({ value: 3, initial: 40 })))
    await store.roll(die.id)
    store.resetAll()
    const [d, c] = store.table!.elements
    expect(d?.type === 'dice' && d.lastRoll).toBeUndefined()
    expect(c?.type === 'counter' && c.value).toBe(40)
    expect(store.history).toHaveLength(1)
  })
})

describe('table store: counters and timers', () => {
  it('steps and sets counters, ignoring other types', async () => {
    const { store } = await openNew()
    const c = counterElementSchema.parse(makeCounter({ value: 10 }))
    const die = createStandardDie(6)
    store.addElement(c)
    store.addElement(die)
    store.step(c.id, -1, 5)
    expect((store.table!.elements[0] as typeof c).value).toBe(5)
    store.setCounter(c.id, 99)
    expect((store.table!.elements[0] as typeof c).value).toBe(99)
    expect(store.step(die.id, 1)).toBe(true) // no error, nothing changes
    expect(store.table!.elements[1]).toMatchObject({ type: 'dice' })
  })
  it('timers start, pause and finish on tick', async () => {
    const { store } = await openNew()
    const t = timerElementSchema.parse(makeTimer({ durationSeconds: 5 }))
    store.addElement(t)
    const t0 = Date.parse('2026-11-19T20:00:00.000Z')
    store.start(t.id, t0)
    expect(store.tick(t0 + 2000)).toEqual([])
    store.pause(t.id, t0 + 3000)
    expect((store.table!.elements[0] as typeof t).status).toBe('paused')
    store.start(t.id, t0 + 10_000)
    expect(store.tick(t0 + 12_000)).toEqual([t.id])
    expect((store.table!.elements[0] as typeof t).status).toBe('finished')
    expect(store.tick(t0 + 99_000)).toEqual([])
  })
})
