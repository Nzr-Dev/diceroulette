import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DiceRouletteDb, createTable, deleteTable, getTable, listTables, renameTable } from '../../../app/db'
import { runSync, type SyncTransport } from '../../../app/sync/client'
import { applySync, createMemorySyncStore } from '#shared/sync'
import { LIMITS as L } from '#shared/schemas'

let n = 0
const newDb = () => new DiceRouletteDb(`sync-${++n}-${Math.random()}`)
const opts = { conflictName: (name: string) => `${name} (conflict)` }

function setup() {
  const server = createMemorySyncStore()
  const transportFor =
    (userId: string): SyncTransport =>
    (req) =>
      applySync(server.store, userId, JSON.parse(JSON.stringify(req)))
  return { server, transportFor }
}

describe('sync', () => {
  let a: DiceRouletteDb
  let b: DiceRouletteDb
  beforeEach(() => {
    a = newDb()
    b = newDb()
  })

  it('uploads local tables on the first sync and a second device downloads them', async () => {
    const { transportFor } = setup()
    const t = await createTable(a, 'Catan')
    expect(t.ok).toBe(true)
    const r1 = await runSync(a, transportFor('u1'), 'u1', opts)
    expect(r1).toMatchObject({ status: 'done', pushed: 1 })
    const r2 = await runSync(b, transportFor('u1'), 'u1', opts)
    expect(r2).toMatchObject({ status: 'done', pulled: 1 })
    expect((await listTables(b)).map((x) => x.name)).toEqual(['Catan'])
  })

  it('does not upload the quick table', async () => {
    const { transportFor, server } = setup()
    await createTable(a, 'Quick', { isQuick: true })
    await runSync(a, transportFor('u1'), 'u1', opts)
    expect(server.rows.size).toBe(0)
  })

  it('sends only what changed and propagates edits and deletions', async () => {
    const { transportFor } = setup()
    const t = await createTable(a, 'Risk')
    await runSync(a, transportFor('u1'), 'u1', opts)
    await runSync(b, transportFor('u1'), 'u1', opts)
    expect((await runSync(a, transportFor('u1'), 'u1', opts))).toMatchObject({ pushed: 0, pulled: 0 })

    await renameTable(a, t.ok ? t.table.id : '', 'Risk 2')
    await runSync(a, transportFor('u1'), 'u1', opts)
    await runSync(b, transportFor('u1'), 'u1', opts)
    expect((await listTables(b)).map((x) => x.name)).toEqual(['Risk 2'])

    await deleteTable(b, t.ok ? t.table.id : '')
    await runSync(b, transportFor('u1'), 'u1', opts)
    await runSync(a, transportFor('u1'), 'u1', opts)
    expect(await listTables(a)).toEqual([])
    expect(await getTable(a, t.ok ? t.table.id : '', { includeDeleted: true })).toBeDefined()
  })

  it('on a conflict the server version wins and the local version is kept as a copy', async () => {
    const { transportFor } = setup()
    const t = await createTable(a, 'Base')
    const id = t.ok ? t.table.id : ''
    await runSync(a, transportFor('u1'), 'u1', opts)
    await runSync(b, transportFor('u1'), 'u1', opts)

    await renameTable(a, id, 'From A')
    await renameTable(b, id, 'From B')
    await runSync(a, transportFor('u1'), 'u1', opts)
    const r = await runSync(b, transportFor('u1'), 'u1', opts)
    expect(r).toMatchObject({ conflictCopies: 1 })
    const names = (await listTables(b)).map((x) => x.name).sort()
    expect(names).toEqual(['From A', 'From B (conflict)'])
    // The copy reaches the server too.
    await runSync(a, transportFor('u1'), 'u1', opts)
    expect((await listTables(a)).map((x) => x.name).sort()).toEqual(names)
  })

  it('keeps a table marked as changed if it changed while the request was in flight', async () => {
    const { server } = setup()
    const t = await createTable(a, 'Race')
    const id = t.ok ? t.table.id : ''
    let injected = false
    const transport: SyncTransport = async (req) => {
      const res = await applySync(server.store, 'u1', JSON.parse(JSON.stringify(req)))
      if (!injected) {
        injected = true
        await renameTable(a, id, 'Edited meanwhile', new Date(Date.now() + 5000))
      }
      return res
    }
    await runSync(a, transport, 'u1', opts)
    expect(server.rows.get(id)?.stored.table.name).toBe('Edited meanwhile')
  })

  it('asks what to do if the device last synced with another account', async () => {
    const { transportFor, server } = setup()
    await createTable(a, 'Mine')
    await runSync(a, transportFor('u1'), 'u1', opts)
    expect(await runSync(a, transportFor('u2'), 'u2', opts)).toEqual({ status: 'other-account' })
    expect([...server.rows.values()].every((r) => r.userId === 'u1')).toBe(true)
    expect(await runSync(a, transportFor('u2'), 'u2', { ...opts, adoptLocal: true })).toMatchObject({ status: 'done' })
  })

  it('never shows or touches the tables of another account', async () => {
    const { transportFor, server } = setup()
    const t = await createTable(a, 'Secret')
    await runSync(a, transportFor('u1'), 'u1', opts)
    // u2 sends a table with the same id.
    const id = t.ok ? t.table.id : ''
    const evil = await applySync(server.store, 'u2', { cursor: 0, changes: [{ id, baseRevision: null, table: { ...(t.ok ? t.table : {}), name: 'Hacked' } }] })
    expect(evil.conflicts).toEqual([{ id, reason: 'invalid' }])
    expect(evil.remote).toEqual([])
    expect(server.rows.get(id)?.stored.table.name).toBe('Secret')
  })

  it('rejects invalid tables, tables that are too big and storage over the limit', async () => {
    const { server } = setup()
    const base = (await createTable(a, 'X'))
    const table = base.ok ? base.table : (undefined as never)
    const bad = await applySync(server.store, 'u1', { cursor: 0, changes: [{ id: table.id, baseRevision: null, table: { nope: 1 } }] })
    expect(bad.conflicts[0]?.reason).toBe('invalid')

    const big = { ...table, name: 'Y'.repeat(50) , elements: [] }
    const original = L.maxAccountBytes
    // Fill the account to the limit with fake rows, then try to add one more table.
    ;(server.counters).set('u1', 1)
    server.rows.set('filler', { userId: 'u1', stored: { id: 'filler', revision: 1, sizeBytes: original, table: big } })
    const over = await applySync(server.store, 'u1', { cursor: 1, changes: [{ id: table.id, baseRevision: null, table }] })
    expect(over.conflicts[0]?.reason).toBe('quota')
  })

  it('downloads in several rounds when there are many tables', async () => {
    const { transportFor } = setup()
    for (let i = 0; i < 45; i++) await createTable(a, `T${i}`)
    await runSync(a, transportFor('u1'), 'u1', opts)
    const r = await runSync(b, transportFor('u1'), 'u1', opts)
    expect(r).toMatchObject({ pulled: 45 })
    expect((await listTables(b)).length).toBe(45)
  })

  it('purges tables deleted more than 30 days ago on the server', async () => {
    const { server } = setup()
    const t = await createTable(a, 'Old')
    const table = t.ok ? t.table : (undefined as never)
    const long = new Date('2026-01-01T00:00:00Z')
    await applySync(server.store, 'u1', { cursor: 0, changes: [{ id: table.id, baseRevision: null, table: { ...table, deletedAt: long.toISOString() } }] }, long)
    expect(server.rows.size).toBe(1)
    await applySync(server.store, 'u1', { cursor: 0, changes: [] }, new Date('2026-03-01T00:00:00Z'))
    expect(server.rows.size).toBe(0)
  })
})
