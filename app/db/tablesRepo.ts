import { LIMITS, parseTable, type GameTable } from '../../shared/schemas'
import { copyTable } from '../../shared/tables'
import type { DiceRouletteDb } from './database'
import { deleteHistory } from './historyRepo'

type NewId = () => string
const defaultNewId: NewId = () => globalThis.crypto.randomUUID()

export type SaveResult = { ok: true; table: GameTable } | { ok: false; error: string }

/** Days a deleted table stays recoverable before it is removed for good. */
export const TRASH_DAYS = 30

/**
 * Validates and saves a table. Always goes through the schema (also checks the size limit),
 * refreshes `updatedAt` and marks the table as changed since the last sync.
 */
export async function saveTable(db: DiceRouletteDb, table: GameTable, now = new Date()): Promise<SaveResult> {
  const parsed = parseTable({ ...table, updatedAt: now.toISOString() })
  if (!parsed.success) return { ok: false, error: parsed.error }
  await db.transaction('rw', db.gameTables, db.tableMeta, async () => {
    await db.gameTables.put(parsed.data)
    const meta = await db.tableMeta.get(parsed.data.id)
    await db.tableMeta.put({ id: parsed.data.id, serverRevision: meta?.serverRevision ?? null, dirty: true })
  })
  return { ok: true, table: parsed.data }
}

export async function createTable(
  db: DiceRouletteDb,
  name: string,
  options: { newId?: NewId; now?: Date; isQuick?: boolean } = {},
): Promise<SaveResult> {
  const now = (options.now ?? new Date()).toISOString()
  return saveTable(
    db,
    {
      id: (options.newId ?? defaultNewId)(),
      schemaVersion: 1,
      name,
      isQuick: options.isQuick ?? false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      elements: [],
    },
    options.now,
  )
}

/** One table, or undefined if it does not exist or is in the trash (unless asked). */
export async function getTable(
  db: DiceRouletteDb,
  id: string,
  options: { includeDeleted?: boolean } = {},
): Promise<GameTable | undefined> {
  const table = await db.gameTables.get(id)
  if (!table || (table.deletedAt !== null && !options.includeDeleted)) return undefined
  return table
}

/** The library: tables that are not deleted and not the quick table, ordered by name. */
export async function listTables(db: DiceRouletteDb): Promise<GameTable[]> {
  const all = await db.gameTables.toArray()
  return all.filter((t) => t.deletedAt === null && !t.isQuick).sort((a, b) => a.name.localeCompare(b.name))
}

/** Tables in the trash, most recently deleted first. */
export async function listDeletedTables(db: DiceRouletteDb): Promise<GameTable[]> {
  const all = await db.gameTables.toArray()
  return all.filter((t) => t.deletedAt !== null).sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
}

/** The quick table of the home page: a normal table with a mark. Created the first time. */
export async function getQuickTable(db: DiceRouletteDb, name: string, options: { newId?: NewId; now?: Date } = {}) {
  const quick = (await db.gameTables.toArray())
    .filter((t) => t.isQuick && t.deletedAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
  if (quick) return quick
  const created = await createTable(db, name, { ...options, isQuick: true })
  if (!created.ok) throw new Error(created.error)
  return created.table
}

/** Moves a table to the trash. The quick table cannot be deleted. Returns false if nothing was deleted. */
export async function deleteTable(db: DiceRouletteDb, id: string, now = new Date()): Promise<boolean> {
  const table = await getTable(db, id)
  if (!table || table.isQuick) return false
  const result = await saveTable(db, { ...table, deletedAt: now.toISOString() }, now)
  return result.ok
}

/** «Undo»: takes a table out of the trash. */
export async function undoDeleteTable(db: DiceRouletteDb, id: string, now = new Date()): Promise<boolean> {
  const table = await getTable(db, id, { includeDeleted: true })
  if (!table || table.deletedAt === null) return false
  const result = await saveTable(db, { ...table, deletedAt: null }, now)
  return result.ok
}

/**
 * Removes for good the tables that have been in the trash longer than TRASH_DAYS, with their history.
 * A table that already synced keeps its mark until it syncs again, so the deletion reaches the other devices.
 */
export async function purgeDeletedTables(db: DiceRouletteDb, now = new Date()): Promise<number> {
  const limit = now.getTime() - TRASH_DAYS * 86_400_000
  const old = (await db.gameTables.toArray()).filter((t) => t.deletedAt !== null && Date.parse(t.deletedAt) < limit)
  let removed = 0
  for (const table of old) {
    const meta = await db.tableMeta.get(table.id)
    const neverSynced = !meta || meta.serverRevision === null
    if (!neverSynced && meta.dirty) continue
    await db.transaction('rw', db.gameTables, db.tableMeta, db.history, async () => {
      await db.gameTables.delete(table.id)
      await db.tableMeta.delete(table.id)
      await deleteHistory(db, table.id)
    })
    removed++
  }
  return removed
}

export async function duplicateTable(
  db: DiceRouletteDb,
  id: string,
  options: { name: string; newId?: NewId; now?: Date },
): Promise<SaveResult> {
  const table = await getTable(db, id)
  if (!table) return { ok: false, error: 'Table not found' }
  return saveTable(db, copyTable(table, options), options.now)
}

/** The table as JSON text, ready to download. */
export async function exportTable(db: DiceRouletteDb, id: string): Promise<string | undefined> {
  const table = await getTable(db, id)
  if (!table) return undefined
  return JSON.stringify({ ...table, isQuick: false, deletedAt: null }, null, 2)
}

/**
 * Imports a table from text (a JSON file, or the data of a shared URL).
 * The text is checked for size BEFORE parsing, then validated with the schema, and the result is
 * saved as a new copy with new ids: an import never overwrites anything.
 */
export async function importTable(
  db: DiceRouletteDb,
  text: string,
  options: { newId?: NewId; now?: Date } = {},
): Promise<SaveResult> {
  if (new TextEncoder().encode(text).length > LIMITS.maxTableBytes) {
    return { ok: false, error: 'The file is too big' }
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON' }
  }
  const parsed = parseTable(data)
  if (!parsed.success) return { ok: false, error: parsed.error }
  return saveTable(db, copyTable(parsed.data, options), options.now)
}

/** Called after a successful sync: stores the server revision and clears the changed mark. */
export async function markSynced(db: DiceRouletteDb, id: string, serverRevision: number): Promise<void> {
  await db.tableMeta.put({ id, serverRevision, dirty: false })
}

/** Tables with changes that were not uploaded yet. */
export async function listDirtyTableIds(db: DiceRouletteDb): Promise<string[]> {
  return (await db.tableMeta.filter((m) => m.dirty).primaryKeys()) as string[]
}
