import { LIMITS, jsonSizeBytes, parseTable, type GameTable } from '../schemas'
import {
  MAX_REMOTE_PER_RESPONSE,
  type ConflictReason,
  type RemoteTable,
  type SyncRequest,
  type SyncResponse,
} from './protocol'

/** A stored table. `sizeBytes` is what counts against the account limit. */
export interface StoredTable {
  id: string
  revision: number
  sizeBytes: number
  table: GameTable
}

/**
 * What the sync logic needs from the database. The real one (Prisma + Postgres) and the
 * in-memory one used by the tests implement this same interface.
 * Every call inside `transaction` must see a consistent state.
 */
export interface SyncTx {
  /** The table with this id if it belongs to the account. `taken` is true if it exists but belongs to someone else. */
  getTable(userId: string, id: string): Promise<{ stored: StoredTable | null; taken: boolean }>
  /** Total bytes stored by the account, deleted tables included. */
  totalBytes(userId: string): Promise<number>
  /** Next number of the account counter (increments it). */
  nextRevision(userId: string): Promise<number>
  /** Current value of the account counter. */
  currentRevision(userId: string): Promise<number>
  putTable(userId: string, stored: StoredTable): Promise<void>
  /** Tables with revision > cursor, ordered by revision, at most `limit` of them. */
  listSince(userId: string, cursor: number, limit: number): Promise<StoredTable[]>
  /** Removes for good the tables deleted before `before` (ISO date). */
  purgeDeleted(userId: string, before: string): Promise<void>
}

export interface SyncStore {
  /**
   * Runs `fn` as one transaction for this account. The store must lock the account first, so two
   * syncs of the same account run one after the other (otherwise both could pass the conflict check
   * and one would silently overwrite the other).
   */
  transaction<T>(userId: string, fn: (tx: SyncTx) => Promise<T>): Promise<T>
}

/** Days a deleted table is kept on the server (same as the local trash). */
export const SERVER_TRASH_DAYS = 30

/**
 * Handles one sync request of one account. The caller must have checked who the user is:
 * `userId` is never taken from the request body.
 */
export async function applySync(
  store: SyncStore,
  userId: string,
  request: SyncRequest,
  now: Date = new Date(),
): Promise<SyncResponse> {
  return store.transaction(userId, async (tx) => {
    await tx.purgeDeleted(userId, new Date(now.getTime() - SERVER_TRASH_DAYS * 86_400_000).toISOString())

    const applied: SyncResponse['applied'] = []
    const conflicts: SyncResponse['conflicts'] = []
    let total = await tx.totalBytes(userId)

    for (const change of request.changes) {
      const reject = (reason: ConflictReason, server?: RemoteTable) => conflicts.push({ id: change.id, reason, server })

      const parsed = parseTable(change.table)
      if (!parsed.success) {
        // The only failure that is not «invalid» is a table that is too big.
        reject(/too big|bytes|limit/i.test(parsed.error) ? 'tooBig' : 'invalid')
        continue
      }
      const table = parsed.data
      // The quick table is a scratchpad of each device: it never goes to the server.
      if (table.id !== change.id || table.isQuick) {
        reject('invalid')
        continue
      }

      const { stored, taken } = await tx.getTable(userId, change.id)
      if (taken) {
        // The id belongs to another account. Do not say so: just refuse.
        reject('invalid')
        continue
      }
      if (stored && stored.revision !== change.baseRevision) {
        reject('stale', { revision: stored.revision, table: stored.table })
        continue
      }

      const sizeBytes = jsonSizeBytes(table)
      if (sizeBytes > LIMITS.maxTableBytes) {
        reject('tooBig')
        continue
      }
      const newTotal = total - (stored?.sizeBytes ?? 0) + sizeBytes
      if (newTotal > LIMITS.maxAccountBytes && sizeBytes > (stored?.sizeBytes ?? 0)) {
        // Going over the limit blocks growth only: shrinking or deleting is always allowed.
        reject('quota')
        continue
      }

      const revision = await tx.nextRevision(userId)
      await tx.putTable(userId, { id: table.id, revision, sizeBytes, table })
      total = newTotal
      applied.push({ id: table.id, revision })
    }

    const appliedIds = new Set(applied.map((a) => a.id))
    const page = await tx.listSince(userId, request.cursor, MAX_REMOTE_PER_RESPONSE + 1)
    const hasMore = page.length > MAX_REMOTE_PER_RESPONSE
    const slice = page.slice(0, MAX_REMOTE_PER_RESPONSE)
    const remote = slice.filter((s) => !appliedIds.has(s.id)).map((s) => ({ revision: s.revision, table: s.table }))
    const cursor = hasMore ? slice[slice.length - 1]!.revision : Math.max(request.cursor, await tx.currentRevision(userId))

    return { applied, conflicts, remote, cursor, hasMore }
  })
}
