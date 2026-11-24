import { copyTable } from '#shared/tables'
import { MAX_CHANGES_PER_REQUEST, type ConflictReason, type RemoteTable, type SyncRequest, type SyncResponse } from '#shared/sync'
import { jsonSizeBytes, type GameTable } from '#shared/schemas'
import { applyRemoteTable, saveTable, type DiceRouletteDb } from '../db'

/** How the app talks to the server. In the app it is a `fetch` to /api/sync; the tests pass a fake. */
export type SyncTransport = (request: SyncRequest) => Promise<SyncResponse>

export interface SyncOptions {
  /** Name of the copy that keeps the local version after a conflict (translated by the app). */
  conflictName: (name: string) => string
  /** Upload the tables of this device even if it last synced with a different account. */
  adoptLocal?: boolean
  now?: () => Date
  newId?: () => string
}

export type SyncResult =
  | {
      status: 'done'
      pushed: number
      pulled: number
      /** Copies created because both the device and the server changed the same table. */
      conflictCopies: number
      /** Tables the server refused (too big, over the storage limit...). They stay on this device. */
      rejected: { id: string; reason: ConflictReason }[]
    }
  /** This device last synced with another account: ask the user what to do with its local tables. */
  | { status: 'other-account' }

/** JSON with sorted keys, so two equal tables always give the same text. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** Same table apart from the modification date (which changes on every save). */
function sameContent(a: GameTable, b: GameTable): boolean {
  return stable({ ...a, updatedAt: '' }) === stable({ ...b, updatedAt: '' })
}

/** Most bytes of tables sent in one request (the server body limit is a few MB). */
const MAX_BATCH_BYTES = 3_000_000
const MAX_ROUNDS = 100

export async function runSync(
  db: DiceRouletteDb,
  send: SyncTransport,
  userId: string,
  options: SyncOptions,
): Promise<SyncResult> {
  const now = options.now ?? (() => new Date())
  let state = await db.syncState.get('sync')

  if (state && state.userId !== userId && !options.adoptLocal) return { status: 'other-account' }

  if (!state || state.userId !== userId) {
    // First sync with this account: everything on the device is new for the server.
    // (The quick table is a scratchpad of the device and is never uploaded.)
    state = { key: 'sync', userId, cursor: 0 }
    await db.transaction('rw', db.gameTables, db.tableMeta, db.syncState, async () => {
      for (const t of await db.gameTables.toArray()) {
        await db.tableMeta.put({ id: t.id, serverRevision: null, dirty: !t.isQuick })
      }
      await db.syncState.put(state!)
    })
  }

  const result = { status: 'done' as const, pushed: 0, pulled: 0, conflictCopies: 0, rejected: [] as { id: string; reason: ConflictReason }[] }
  /** Tables the server refused in this run: do not send them again until the next sync. */
  const refused = new Set<string>()

  /** The server version wins; if the device had unsent changes, they are kept as a copy. */
  async function takeServerVersion(remote: RemoteTable): Promise<void> {
    const local = await db.gameTables.get(remote.table.id)
    const meta = await db.tableMeta.get(remote.table.id)
    if (local && meta?.dirty && local.deletedAt === null && !sameContent(local, remote.table)) {
      const copy = copyTable(local, { name: options.conflictName(local.name), now: now(), newId: options.newId })
      await saveTable(db, copy, now())
      result.conflictCopies++
    }
    await applyRemoteTable(db, remote.table, remote.revision)
    result.pulled++
  }

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const dirtyIds = (await db.tableMeta.filter((m) => m.dirty && !refused.has(m.id)).primaryKeys()) as string[]
    const batch: { id: string; baseRevision: number | null; table: GameTable }[] = []
    let bytes = 0
    for (const id of dirtyIds) {
      const table = await db.gameTables.get(id)
      const meta = await db.tableMeta.get(id)
      if (!table || table.isQuick) {
        // Nothing to send: clear the mark so it does not stay «changed» forever.
        if (meta) await db.tableMeta.put({ ...meta, dirty: false })
        continue
      }
      const size = jsonSizeBytes(table)
      if (batch.length > 0 && bytes + size > MAX_BATCH_BYTES) break
      batch.push({ id, baseRevision: meta?.serverRevision ?? null, table })
      bytes += size
      if (batch.length >= MAX_CHANGES_PER_REQUEST) break
    }

    const response = await send({ cursor: state.cursor, changes: batch })

    for (const applied of response.applied) {
      const sent = batch.find((b) => b.id === applied.id)
      const current = await db.gameTables.get(applied.id)
      // If the table changed again while the request was in flight, keep it marked as changed.
      const unchanged = !!sent && !!current && current.updatedAt === sent.table.updatedAt
      await db.tableMeta.put({ id: applied.id, serverRevision: applied.revision, dirty: !unchanged })
      result.pushed++
    }
    for (const conflict of response.conflicts) {
      if (conflict.reason === 'stale' && conflict.server) await takeServerVersion(conflict.server)
      else {
        refused.add(conflict.id)
        result.rejected.push({ id: conflict.id, reason: conflict.reason })
      }
    }
    for (const remote of response.remote) {
      const meta = await db.tableMeta.get(remote.table.id)
      if (meta?.serverRevision != null && meta.serverRevision >= remote.revision) continue
      await takeServerVersion(remote)
    }

    state = { key: 'sync', userId, cursor: response.cursor }
    await db.syncState.put(state)

    const stillDirty = (await db.tableMeta.filter((m) => m.dirty && !refused.has(m.id)).count()) > 0
    if (!response.hasMore && !stillDirty) break
  }
  return result
}
