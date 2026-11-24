import type { StoredTable, SyncStore, SyncTx } from './server'

/** In-memory SyncStore: used by the tests, and handy for trying the sync without a database. */
export function createMemorySyncStore() {
  const rows = new Map<string, { userId: string; stored: StoredTable }>()
  const counters = new Map<string, number>()

  const tx: SyncTx = {
    async getTable(userId, id) {
      const row = rows.get(id)
      if (!row) return { stored: null, taken: false }
      return row.userId === userId ? { stored: row.stored, taken: false } : { stored: null, taken: true }
    },
    async totalBytes(userId) {
      let sum = 0
      for (const r of rows.values()) if (r.userId === userId) sum += r.stored.sizeBytes
      return sum
    },
    async nextRevision(userId) {
      const next = (counters.get(userId) ?? 0) + 1
      counters.set(userId, next)
      return next
    },
    async currentRevision(userId) {
      return counters.get(userId) ?? 0
    },
    async putTable(userId, stored) {
      rows.set(stored.id, { userId, stored })
    },
    async listSince(userId, cursor, limit) {
      return [...rows.values()]
        .filter((r) => r.userId === userId && r.stored.revision > cursor)
        .map((r) => r.stored)
        .sort((a, b) => a.revision - b.revision)
        .slice(0, limit)
    },
    async purgeDeleted(userId, before) {
      for (const [id, r] of rows) {
        if (r.userId === userId && r.stored.table.deletedAt !== null && r.stored.table.deletedAt < before) rows.delete(id)
      }
    },
  }

  const store: SyncStore = { transaction: (_userId, fn) => fn(tx) }
  return { store, rows, counters }
}
