import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DiceRouletteDb, addHistory, clearHistory, createTable, deleteTable, duplicateTable, exportTable, getQuickTable,
  getSettings, getTable, importTable, listDeletedTables, listDirtyTableIds, listHistory, listTables, markSynced,
  purgeDeletedTables, saveTable, undoDeleteTable, updateSettings,
} from '../../../app/db'
import { createStandardDie, rollDice } from '../../../shared/engine'
import { LIMITS, tableSchema } from '../../../shared/schemas'
import { copyElement, copyTable } from '../../../shared/tables'
import { makeCounter, makeTable, makeTimer, makeWheel, uuid } from '../schemas/helpers'

let db: DiceRouletteDb
beforeEach(() => {
  db = new DiceRouletteDb(`test-${uuid()}`)
})

const d = (iso: string) => new Date(iso)

async function newTable(name = 'Table', extra: Record<string, unknown> = {}) {
  const base = tableSchema.parse(makeTable({ name, ...extra }))
  const res = await saveTable(db, base)
  if (!res.ok) throw new Error(res.error)
  return res.table
}

describe('tables', () => {
  it('creates, reads and lists in name order', async () => {
    await createTable(db, 'Zeta')
    await createTable(db, 'Alpha')
    expect((await listTables(db)).map((t) => t.name)).toEqual(['Alpha', 'Zeta'])
  })
  it('save refreshes updatedAt and marks dirty', async () => {
    const t = await newTable()
    const res = await saveTable(db, t, d('2030-01-01T00:00:00.000Z'))
    expect(res.ok && res.table.updatedAt).toBe('2030-01-01T00:00:00.000Z')
    expect(await listDirtyTableIds(db)).toEqual([t.id])
  })
  it('refuses invalid or too big tables', async () => {
    const t = await newTable()
    expect((await saveTable(db, { ...t, name: '' })).ok).toBe(false)
    const big = { ...t, elements: Array.from({ length: 400 }, () => makeWheel({ sectors: Array.from({ length: 100 }, () => ({ id: uuid(), label: 'x'.repeat(100) })) })) }
    expect((await saveTable(db, big as never)).ok).toBe(false)
  })
  it('keeps the server revision when saving, and markSynced clears dirty', async () => {
    const t = await newTable()
    await markSynced(db, t.id, 7)
    expect(await listDirtyTableIds(db)).toEqual([])
    await saveTable(db, t)
    expect((await db.tableMeta.get(t.id))).toEqual({ id: t.id, serverRevision: 7, dirty: true })
  })
})

describe('quick table', () => {
  it('is created once, is not in the library and cannot be deleted', async () => {
    const a = await getQuickTable(db, 'Quick')
    const b = await getQuickTable(db, 'Other name')
    expect(b.id).toBe(a.id)
    expect(a.isQuick).toBe(true)
    expect(await listTables(db)).toEqual([])
    expect(await deleteTable(db, a.id)).toBe(false)
    expect(await getTable(db, a.id)).toBeDefined()
  })
})

describe('delete, undo and purge', () => {
  it('soft deletes and undoes', async () => {
    const t = await newTable()
    expect(await deleteTable(db, t.id)).toBe(true)
    expect(await getTable(db, t.id)).toBeUndefined()
    expect((await listDeletedTables(db)).map((x) => x.id)).toEqual([t.id])
    expect(await undoDeleteTable(db, t.id)).toBe(true)
    expect((await listTables(db)).map((x) => x.id)).toEqual([t.id])
    expect(await undoDeleteTable(db, t.id)).toBe(false)
  })
  it('purges old tables that never synced, with their history', async () => {
    const t = await newTable()
    await addHistory(db, { kind: 'wheel', tableId: t.id, at: t.createdAt, elementId: uuid(), elementName: 'W', result: { at: t.createdAt, sectorId: uuid(), label: 'A' } })
    await deleteTable(db, t.id, d('2026-01-01T00:00:00.000Z'))
    expect(await purgeDeletedTables(db, d('2026-01-15T00:00:00.000Z'))).toBe(0)
    expect(await purgeDeletedTables(db, d('2026-03-01T00:00:00.000Z'))).toBe(1)
    expect(await db.gameTables.count()).toBe(0)
    expect(await db.history.count()).toBe(0)
  })
  it('keeps the tombstone of a synced table until it syncs the deletion', async () => {
    const t = await newTable()
    await markSynced(db, t.id, 3)
    await deleteTable(db, t.id, d('2026-01-01T00:00:00.000Z'))
    expect(await purgeDeletedTables(db, d('2026-03-01T00:00:00.000Z'))).toBe(0)
    await markSynced(db, t.id, 4)
    expect(await purgeDeletedTables(db, d('2026-03-01T00:00:00.000Z'))).toBe(1)
  })
})

describe('copy, duplicate, export and import', () => {
  const played = () => {
    const die = createStandardDie(6)
    const rolled = rollDice(die)
    if (!rolled.ok) throw new Error()
    return [rolled.element, makeCounter({ value: 3, initial: 40 }), makeTimer()]
  }
  it('copyElement is clean and has new ids', () => {
    const [dice] = played()
    const copy = copyElement(tableSchema.parse(makeTable({ elements: [dice] })).elements[0]!)
    expect(copy.id).not.toBe(dice!.id)
    expect('lastRoll' in copy).toBe(false)
  })
  it('duplicateTable copies with new ids and clean state', async () => {
    const t = await newTable('Orig', { elements: played() })
    const res = await duplicateTable(db, t.id, { name: 'Orig (copy)' })
    if (!res.ok) throw new Error(res.error)
    expect(res.table.id).not.toBe(t.id)
    expect(res.table.name).toBe('Orig (copy)')
    const counter = res.table.elements.find((e) => e.type === 'counter')
    expect(counter?.type === 'counter' && counter.value).toBe(40)
    const ids = new Set(t.elements.map((e) => e.id))
    expect(res.table.elements.some((e) => ids.has(e.id))).toBe(false)
    expect((await getTable(db, t.id))?.elements).toEqual(t.elements) // original untouched
  })
  it('copyTable never copies the quick mark or deletion', () => {
    const t = tableSchema.parse(makeTable({ isQuick: true, deletedAt: '2026-01-01T00:00:00.000Z' }))
    const c = copyTable(t)
    expect(c.isQuick).toBe(false)
    expect(c.deletedAt).toBeNull()
  })
  it('export then import round-trips as a new table', async () => {
    const t = await newTable('Share', { elements: played() })
    const json = await exportTable(db, t.id)
    const res = await importTable(db, json!)
    if (!res.ok) throw new Error(res.error)
    expect(res.table.id).not.toBe(t.id)
    expect(res.table.elements).toHaveLength(3)
    expect((await listTables(db)).length).toBe(2)
  })
  it('import rejects bad input without saving anything', async () => {
    expect((await importTable(db, 'not json')).ok).toBe(false)
    expect((await importTable(db, '{"name":"x"}')).ok).toBe(false)
    expect((await importTable(db, 'x'.repeat(LIMITS.maxTableBytes + 1))).ok).toBe(false)
    expect((await importTable(db, JSON.stringify({ ...makeTable(), __proto__: { evil: 1 }, elements: [{ type: 'dice', name: '<script>' }] }))).ok).toBe(false)
    expect(await db.gameTables.count()).toBe(0)
  })
  it('import drops unknown fields', async () => {
    const res = await importTable(db, JSON.stringify({ ...makeTable(), hacked: '<script>alert(1)</script>' }))
    expect(res.ok && 'hacked' in res.table).toBe(false)
  })
})

describe('history', () => {
  const entry = (tableId: string, n: number) => ({
    kind: 'wheel' as const,
    tableId,
    at: '2026-11-19T20:00:00.000Z',
    elementId: uuid(),
    elementName: `W${n}`,
    result: { at: '2026-11-19T20:00:00.000Z', sectorId: uuid(), label: String(n) },
  })
  it('keeps only the last N, newest first, per table', async () => {
    const a = uuid()
    const b = uuid()
    for (let i = 1; i <= 5; i++) await addHistory(db, entry(a, i), 3)
    await addHistory(db, entry(b, 1), 3)
    expect((await listHistory(db, a)).map((h) => h.elementName)).toEqual(['W5', 'W4', 'W3'])
    expect(await listHistory(db, b)).toHaveLength(1)
  })
  it('clears one table only', async () => {
    const a = uuid()
    const b = uuid()
    await addHistory(db, entry(a, 1))
    await addHistory(db, entry(b, 1))
    await clearHistory(db, a)
    expect(await listHistory(db, a)).toHaveLength(0)
    expect(await listHistory(db, b)).toHaveLength(1)
  })
  it('stores a real dice roll', async () => {
    const t = await newTable()
    const rolled = rollDice(createStandardDie(20))
    if (!rolled.ok) throw new Error()
    await addHistory(db, { kind: 'dice', tableId: t.id, at: rolled.roll.at, elementId: uuid(), elementName: 'd20', player: 'Ana', roll: rolled.roll })
    const [row] = await listHistory(db, t.id)
    expect(row?.kind === 'dice' && row.roll.total).toBe(rolled.roll.total)
    expect(row?.player).toBe('Ana')
  })
  it('rejects malformed entries', async () => {
    await expect(addHistory(db, { ...entry(uuid(), 1), tableId: 'nope' })).rejects.toThrow()
  })
})

describe('settings', () => {
  it('defaults to dark, no locale and 100 entries', async () => {
    expect(await getSettings(db)).toEqual({ theme: 'dark', locale: null, historyLimit: 100 })
  })
  it('updates and persists; rejects invalid values', async () => {
    await updateSettings(db, { theme: 'light', locale: 'pt-BR' })
    expect(await getSettings(db)).toMatchObject({ theme: 'light', locale: 'pt-BR' })
    await expect(updateSettings(db, { historyLimit: 0 })).rejects.toThrow()
    await expect(updateSettings(db, { locale: 'zh' as never })).rejects.toThrow()
  })
})
