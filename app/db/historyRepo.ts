import Dexie from 'dexie'
import { historyEntrySchema, LIMITS, type HistoryEntry } from '#shared/schemas'
import type { DiceRouletteDb, HistoryRow } from './database'

function rangeOf(db: DiceRouletteDb, tableId: string) {
  return db.history.where('[tableId+id]').between([tableId, Dexie.minKey], [tableId, Dexie.maxKey])
}

/**
 * Adds a line to the history of a table and keeps only the last `limit` lines.
 * The history is local only: it is never exported or synced.
 */
export async function addHistory(
  db: DiceRouletteDb,
  entry: HistoryEntry,
  limit: number = LIMITS.defaultHistoryEntries,
): Promise<void> {
  const parsed = historyEntrySchema.parse(entry)
  await db.transaction('rw', db.history, async () => {
    await db.history.add(parsed as HistoryRow)
    const keys = (await rangeOf(db, parsed.tableId).primaryKeys()) as number[]
    const extra = keys.length - limit
    if (extra > 0) await db.history.bulkDelete(keys.slice(0, extra))
  })
}

/** Newest first. */
export async function listHistory(db: DiceRouletteDb, tableId: string, max: number = LIMITS.defaultHistoryEntries) {
  return rangeOf(db, tableId).reverse().limit(max).toArray()
}

/** Removes every line of a table. */
export async function deleteHistory(db: DiceRouletteDb, tableId: string): Promise<void> {
  await rangeOf(db, tableId).delete()
}

export const clearHistory = deleteHistory
